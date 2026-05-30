import { Platform } from 'react-native';
import { create } from 'zustand';

import { resolveEngine } from '@/ai';
import * as modelManager from '@/ai/modelManager';
import { t } from '@/i18n';
import {
  addAiMessage,
  buildSystemContext,
  clearAiMessages,
  getAiProfile,
  listAiMessages,
  setAiEnabled,
  setAiEngine,
  setAiModelStatus,
  type AiEngine,
  type AiMessage,
  type AiModelStatus,
} from '@/db/repository';
import type { SystemReply } from '@/core/systemVoice';

import { useAppStore } from './appStore';

type AiProfileState = {
  enabled: boolean;
  engine: AiEngine;
  modelStatus: AiModelStatus;
  modelPath: string | null;
};

type AiState = {
  messages: AiMessage[];
  profile: AiProfileState;
  isGenerating: boolean;
  isReady: boolean;
  // Progreso de descarga del modelo (0..1). Lo rellenará la tarea de descarga; aquí es solo el gancho.
  modelProgress: number;
  loadAi: () => Promise<void>;
  openChat: () => Promise<void>;
  sendMessage: (text: string) => Promise<void>;
  clearChat: () => Promise<void>;
  setEnabled: (enabled: boolean) => Promise<void>;
  setEngine: (engine: AiEngine) => Promise<void>;
  // Gestión del modelo LLM local (pantalla /system-ai). downloadModel descarga el .gguf con progreso;
  // cancelDownload aborta la descarga en curso; deleteModel libera el LLM y borra el fichero.
  downloadModel: () => Promise<void>;
  cancelDownload: () => void;
  deleteModel: () => Promise<void>;
};

// AbortController de la descarga en curso (vive fuera del estado: no es UI, solo un handle de
// cancelación). cancelDownload lo aborta; al terminar/fallar la descarga se limpia.
let downloadController: AbortController | null = null;

// Resuelve un SystemReply del motor a texto en el idioma activo del appStore.
// - kind 'key' (motor por plantillas): traduce la clave i18n con t(language, key, params). El
//   bilingüismo vive aquí; el engine/core nunca importa i18n. t() cae al español si la clave no
//   existe en el idioma activo; si no existe en NINGUNO, t() reventaría (replace sobre undefined),
//   así que lo envolvemos y devolvemos un fallback seguro con la voz del Sistema.
// - kind 'text' (motor LLM): el texto ya viene generado en el idioma correcto; se usa tal cual.
function resolveReply(reply: SystemReply): string {
  if (reply.kind === 'text') return reply.text;
  const language = useAppStore.getState().language;
  try {
    return t(language, reply.key as Parameters<typeof t>[1], reply.params);
  } catch {
    return t(language, 'systemChatError');
  }
}

// Lee el perfil de IA de la BD y lo proyecta al estado del store (incluye modelPath, que el selector
// de motor necesita para construir el llamaEngine).
function toProfileState(profile: Awaited<ReturnType<typeof getAiProfile>>): AiProfileState {
  return {
    enabled: profile.enabled,
    engine: profile.engine,
    modelStatus: profile.modelStatus,
    modelPath: profile.modelPath,
  };
}

// Reconcilia el estado del modelo en BD con la realidad (memoria/disco) al arrancar. Solo nativo:
// en web el LLM no aplica y modelExists() es siempre false. Devuelve true si normalizó algo (el
// caller recarga el profile). Cubre dos divergencias:
//  - 'downloading' huérfano: la BD dice "descargando" pero no hay descarga viva (downloadController
//    null), p. ej. la app se cerró a mitad. Sin esto la UI queda atascada en "Descargando…" con un
//    "Cancelar" inerte. Borramos el parcial y volvemos a 'none' + engine 'template'.
//  - 'ready' sin fichero: la BD dice "listo" pero el .gguf no está en disco (borrado externo,
//    reinstalación). resolveEngine construiría un llamaEngine que reventaría en initLlama en bucle
//    mientras la UI dice "listo". Degradamos a 'none' + engine 'template'.
async function reconcileModelState(
  profile: Awaited<ReturnType<typeof getAiProfile>>,
): Promise<boolean> {
  if (Platform.OS === 'web') return false;

  if (profile.modelStatus === 'downloading' && !downloadController) {
    modelManager.deleteModel();
    await setAiModelStatus('none');
    await setAiEngine('template');
    return true;
  }

  if (profile.modelStatus === 'ready' && !modelManager.modelExists()) {
    await setAiModelStatus('none');
    await setAiEngine('template');
    return true;
  }

  return false;
}

export const useAiStore = create<AiState>((set, get) => ({
  messages: [],
  profile: { enabled: false, engine: 'template', modelStatus: 'none', modelPath: null },
  isGenerating: false,
  isReady: false,
  modelProgress: 0,
  loadAi: async () => {
    const [profile, messages] = await Promise.all([getAiProfile(), listAiMessages()]);
    // Normaliza divergencias del modelo (solo nativo) antes de proyectar al estado: 'downloading'
    // huérfano y 'ready' sin fichero. Si reconcilió, recarga el profile ya corregido.
    const reconciled = await reconcileModelState(profile);
    const finalProfile = reconciled ? await getAiProfile() : profile;
    set({ profile: toProfileState(finalProfile), messages, isReady: true });
  },
  openChat: async () => {
    // Evita duplicar saludos: si ya hay historial, no genera otro de apertura. Solo arranca el chat
    // con un saludo proactivo cuando está vacío.
    const existing = await listAiMessages();
    if (existing.length > 0) {
      set({ messages: existing, isReady: true });
      return;
    }
    // El saludo del LLM puede tardar (carga del modelo + inferencia): marcamos isGenerating para que
    // la UI muestre el indicador de escritura. El try/catch evita romper la apertura si el LLM peta.
    set({ isGenerating: true });
    try {
      const language = useAppStore.getState().language;
      const engine = await resolveEngine(get().profile);
      const ctx = await buildSystemContext();
      const text = resolveReply(await engine.greeting(ctx, language));
      await addAiMessage('assistant', text);
    } catch {
      const language = useAppStore.getState().language;
      await addAiMessage('assistant', t(language, 'systemChatError'));
    } finally {
      set({ messages: await listAiMessages(), isReady: true, isGenerating: false });
    }
  },
  sendMessage: async (text) => {
    const trimmed = text.trim();
    if (!trimmed || get().isGenerating) return;

    await addAiMessage('user', trimmed);
    set({ messages: await listAiMessages(), isGenerating: true });

    try {
      const language = useAppStore.getState().language;
      const engine = await resolveEngine(get().profile);
      const ctx = await buildSystemContext();
      const reply = resolveReply(await engine.reply(ctx, trimmed, language));
      await addAiMessage('assistant', reply);
      set({ messages: await listAiMessages() });
    } catch {
      // La pantalla llama con `void sendMessage(...)`, así que sin catch un fallo quedaría como
      // unhandled rejection silenciosa. Si el LLM peta (modelo ausente/OOM/inferencia), registramos
      // un mensaje de error del Sistema para que el usuario vea feedback en lugar de silencio.
      const language = useAppStore.getState().language;
      await addAiMessage('assistant', t(language, 'systemChatError'));
      set({ messages: await listAiMessages() });
    } finally {
      set({ isGenerating: false });
    }
  },
  clearChat: async () => {
    await clearAiMessages();
    set({ messages: [] });
  },
  setEnabled: async (enabled) => {
    await setAiEnabled(enabled);
    set({ profile: toProfileState(await getAiProfile()) });
  },
  // Cambia el motor (template/llama) en la BD y recarga el perfil. Es el gancho que la pantalla de
  // gestión usa para alternar entre el chat por plantillas y el LLM local.
  setEngine: async (engine) => {
    await setAiEngine(engine);
    set({ profile: toProfileState(await getAiProfile()) });
  },
  // Descarga el modelo LLM local con progreso. Flujo: marca 'downloading' (y recarga profile para que
  // la UI reaccione), descarga el .gguf actualizando modelProgress, y al terminar deja el modelo
  // 'ready' con su ruta + engine 'llama' + recarga profile (resolveEngine necesita modelPath en el
  // estado). Cualquier fallo → 'error' y engine 'template' (fallback seguro). En web es no-op marcado
  // como error: la IA avanzada solo existe en nativo.
  downloadModel: async () => {
    if (Platform.OS === 'web') {
      await setAiModelStatus('error');
      set({ profile: toProfileState(await getAiProfile()) });
      return;
    }
    // Evita descargas concurrentes: si ya hay una en curso, no arranca otra.
    if (downloadController) return;

    downloadController = new AbortController();
    set({ modelProgress: 0 });
    await setAiModelStatus('downloading');
    set({ profile: toProfileState(await getAiProfile()) });

    try {
      const uri = await modelManager.downloadModel(
        (ratio) => set({ modelProgress: ratio }),
        downloadController.signal,
      );
      await setAiModelStatus('ready', uri);
      await setAiEngine('llama');
      // Recarga el profile para que modelPath/engine lleguen al estado; resolveEngine los lee de ahí.
      await get().loadAi();
      set({ modelProgress: 1 });
    } catch {
      // Aborto del usuario o fallo de red/disco: limpiamos el fichero parcial y volvemos a 'none'
      // si fue cancelación, o 'error' si fue un fallo. En ambos casos engine queda en 'template'.
      const aborted = downloadController?.signal.aborted ?? false;
      modelManager.deleteModel();
      await setAiModelStatus(aborted ? 'none' : 'error');
      await setAiEngine('template');
      set({ profile: toProfileState(await getAiProfile()), modelProgress: 0 });
    } finally {
      downloadController = null;
    }
  },
  // Aborta la descarga en curso. El catch de downloadModel se encarga de la limpieza y del estado.
  cancelDownload: () => {
    downloadController?.abort();
  },
  // Borra el modelo: libera el LLM cargado (RAM), borra el fichero, deja el perfil en 'none' sin ruta
  // y engine 'template'. Recarga el profile para que la UI y resolveEngine vuelvan al motor por
  // plantillas. La liberación del LLM solo aplica en nativo (import dinámico de llama.rn).
  deleteModel: async () => {
    if (Platform.OS !== 'web') {
      try {
        const { releaseLlama } = await import('@/ai/llamaEngine');
        await releaseLlama();
      } catch {
        // Si el LLM no estaba cargado o llama.rn no está disponible, no pasa nada: seguimos borrando.
      }
    }
    modelManager.deleteModel();
    await setAiModelStatus('none', null);
    await setAiEngine('template');
    await get().loadAi();
    set({ modelProgress: 0 });
  },
}));
