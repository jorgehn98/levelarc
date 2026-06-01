import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { create } from 'zustand';

import { resolveEngine, templateEngine } from '@/ai';
import * as modelManager from '@/ai/modelManager';
import { t } from '@/i18n';
import { toDateKey, toIsoTimestamp } from '@/lib/date';
import { buildHabitContext } from '@/core/aiContext';
import { getDailyBriefing, getHabitInsight, getInterjectionTone } from '@/core/systemVoice';
import type { HabitInsightInput } from '@/core/aiContext';
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
import type { InterjectionTone, InterjectionTrigger, SystemReply } from '@/core/systemVoice';

import { useAppStore } from './appStore';

type AiProfileState = {
  enabled: boolean;
  engine: AiEngine;
  modelStatus: AiModelStatus;
  modelPath: string | null;
};

// Mensaje del día del Sistema que se muestra en la pantalla Hoy (SystemMessageCard). `fromAi` indica
// si lo generó el LLM local (true) o el motor por plantillas (false), para mostrar el distintivo.
type DailyMessage = {
  date: string;
  text: string;
  fromAi: boolean;
};

// Micro-comentario del Sistema sobre UN hábito, que la pantalla de detalle muestra. `fromAi` indica si
// lo generó el LLM local (true) o el motor por plantillas (false), para mostrar el distintivo de IA.
type HabitInsightEntry = {
  text: string;
  fromAi: boolean;
};

// Aparición del Sistema en curso: el Sistema "salta" con un mensaje contextual que el overlay del
// personaje (otra tarea) muestra. `tone` elige la pose; `fromAi` indica si el texto ya es del LLM
// (al principio es de plantilla y se mejora en background). createdAt para ordenar/animar en la UI.
type Interjection = {
  trigger: InterjectionTrigger;
  tone: InterjectionTone;
  text: string;
  fromAi: boolean;
  createdAt: string;
};

// Motivo por el que el chat arrancó tras una aparición. sendMessage lo pasa al engine (solo el LLM lo
// usa) para que la primera respuesta tenga en cuenta de qué iba la conversación. Se limpia tras el
// primer mensaje o al limpiar el chat. `createdAt` (ISO) marca cuándo se creó la nota: sendMessage la
// ignora si está caducada (el usuario llegó al chat tras la aparición pero no escribió hasta días
// después), para que un contexto viejo nunca contamine un chat futuro.
type ChatContextNote = {
  trigger: InterjectionTrigger;
  tone: InterjectionTone;
  createdAt: string;
};

// Ventana de validez de chatContextNote: si pasa más de esto desde que se creó, se considera caducada
// y sendMessage no la pasa al engine.
const CHAT_CONTEXT_NOTE_MAX_AGE_MS = 10 * 60 * 1000;

type AiState = {
  messages: AiMessage[];
  profile: AiProfileState;
  isGenerating: boolean;
  isReady: boolean;
  // Progreso de descarga del modelo (0..1). Lo rellenará la tarea de descarga; aquí es solo el gancho.
  modelProgress: number;
  // Mensaje del día del Sistema para la pantalla Hoy. null hasta que ensureDailyMessage lo rellena.
  dailyMessage: DailyMessage | null;
  // Micro-comentarios del Sistema por hábito (clave = habitId), para la pantalla de detalle. Vacío
  // hasta que ensureHabitInsight rellena cada entrada. Se queda en memoria (no persiste): el detalle
  // del hábito no es una pantalla de arranque y la plantilla es instantánea.
  habitInsights: Record<string, HabitInsightEntry>;
  // Aparición del Sistema en curso. null = no hay aparición. El overlay del personaje la consume.
  interjection: Interjection | null;
  // Preferencia "Apariciones del Sistema": si está off, triggerInterjection no dispara nada. Se carga
  // de AsyncStorage en loadAi (default true) y el toggle de Ajustes la cambia con setInterjectionsEnabled.
  interjectionsEnabled: boolean;
  // Motivo heredado por el chat tras una aparición (null si el chat no nació de una). Lo usa sendMessage.
  chatContextNote: ChatContextNote | null;
  loadAi: () => Promise<void>;
  openChat: () => Promise<void>;
  sendMessage: (text: string) => Promise<void>;
  // Cancela la generación en curso del chat: aborta la inferencia nativa (si el motor es llama) y
  // resetea isGenerating para desbloquear la UI. Si no hay nada generando, es no-op. La respuesta
  // abortada se descarta (no se persiste como mensaje del Sistema).
  cancelGeneration: () => void;
  // Dispara una aparición del Sistema si el cooldown lo permite (1/sesión, 1/día por trigger).
  triggerInterjection: (trigger: InterjectionTrigger) => Promise<void>;
  // Descarta la aparición en curso (la UI la llama al cerrarla sin abrir el chat).
  dismissInterjection: () => void;
  // Activa/desactiva las apariciones del Sistema. Persiste la preferencia y actualiza el estado para
  // que el toggle de Ajustes refleje el cambio al instante. Si se desactiva, triggerInterjection no
  // disparará nuevas apariciones (la que ya esté en pantalla la cierra el usuario).
  setInterjectionsEnabled: (enabled: boolean) => Promise<void>;
  // Continúa la aparición en el chat: persiste su texto como mensaje del Sistema y deja el motivo
  // (chatContextNote) para que la siguiente respuesta lo tenga en cuenta. La UI navega a /system-chat.
  continueFromInterjection: () => Promise<void>;
  // Genera el mensaje del día: plantilla al instante + LLM en background si está activo. Cachea por día.
  ensureDailyMessage: () => Promise<void>;
  // Asegura el micro-comentario del Sistema para un hábito: plantilla al instante + LLM en background
  // si el engine es llama y el modelo está listo. Cachea por habitId+día (no reinfiere si ya hay uno
  // de IA fresco de hoy) y no lanza dos inferencias a la vez para el mismo hábito.
  ensureHabitInsight: (habitId: string, input: HabitInsightInput) => Promise<void>;
  // Fuerza regenerar el mensaje del día ignorando el cache de hoy (para un botón "actualizar").
  refreshDailyMessage: () => Promise<void>;
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

// Token incremental de la generación del chat en curso. sendMessage captura el token al empezar; si
// cancelGeneration (o un nuevo envío) lo cambia, el resultado de la inferencia vieja se descarta en
// vez de persistirse. Vive fuera del estado: es un handle de cancelación, no UI.
let chatGenerationToken = 0;

// Cache/dedupe en memoria del micro-comentario de IA por hábito. `habitInsightAiDay[habitId]` guarda
// el dateKey del último insight de IA fresco: si es de hoy, no reinferimos con el LLM (lento). El Set
// marca los hábitos con una inferencia en vuelo para no lanzar dos a la vez (no spamear). Viven fuera
// del estado: son handles de control, no UI. Solo en memoria: se resetean al arrancar el proceso, que
// basta (la plantilla siempre repinta al instante y el LLM se reintenta en la siguiente visita).
const habitInsightAiDay: Record<string, string> = {};
const habitInsightInFlight = new Set<string>();

// Aborta la inferencia nativa del LLM si el motor cargado lo soporta. Import dinámico para no arrastrar
// llama.rn en web/plantillas. Best-effort: si no está cargado o falla, no rompe nada.
async function abortLlamaGeneration(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    const { abortGeneration } = await import('@/ai/llamaEngine');
    await abortGeneration();
  } catch (err) {
    if (__DEV__) console.warn('[ai] abortGeneration falló', err);
  }
}

// Clave de AsyncStorage donde se cachea el mensaje del día (JSON DailyMessage). Persistir evita
// regenerar al reabrir la app el mismo día y, sobre todo, evita reinferir con el LLM (lento) si ya
// hay un mensaje fresco de IA para hoy.
const DAILY_MESSAGE_KEY = 'levelarc.dailyMessage';

// Lee el mensaje del día cacheado en AsyncStorage. Devuelve null si no hay nada o el JSON está
// corrupto (no rompemos: simplemente se regenera).
async function loadCachedDailyMessage(): Promise<DailyMessage | null> {
  try {
    const raw = await AsyncStorage.getItem(DAILY_MESSAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DailyMessage;
    if (typeof parsed?.date === 'string' && typeof parsed?.text === 'string' && typeof parsed?.fromAi === 'boolean') {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

// Persiste el mensaje del día. Si AsyncStorage falla, no rompemos: el estado en memoria ya está
// seteado, solo se perderá el cache entre arranques.
async function persistDailyMessage(message: DailyMessage): Promise<void> {
  try {
    await AsyncStorage.setItem(DAILY_MESSAGE_KEY, JSON.stringify(message));
  } catch {
    // Cache best-effort: si no se puede escribir, seguimos con el estado en memoria.
  }
}

// Clave de AsyncStorage donde se persiste el registro de apariciones mostradas: { [trigger]: dateKey }.
// Sirve para el dedupe "1 vez por día por trigger" entre arranques de la app.
const INTERJECTIONS_KEY = 'levelarc.interjections';

// Clave de AsyncStorage de la preferencia "Apariciones del Sistema" (que el Sistema salte solo).
// Default ON: solo está desactivada si el usuario guardó explícitamente 'false'.
const INTERJECTIONS_ENABLED_KEY = 'levelarc.interjectionsEnabled';
const LLM_RUNTIME_ERROR_KEY = 'levelarc.ai.llmRuntimeError';

type LlmRuntimeErrorSource = 'openChat' | 'sendMessage' | 'dailyMessage' | 'habitInsight' | 'interjection';

function describeError(error: unknown): string {
  if (error instanceof Error) {
    const stack = error.stack && error.stack !== error.message ? `\n${error.stack}` : '';
    return `${error.name}: ${error.message}${stack}`;
  }
  if (typeof error === 'string') return error;
  try {
    return JSON.stringify(error);
  } catch {
    return 'Unknown error';
  }
}

function buildLlmRuntimeDiagnostic(
  source: LlmRuntimeErrorSource,
  profile: AiProfileState,
  error: unknown,
  extra: string[] = [],
): string {
  const modelDebugInfo = modelManager.getModelFileDebugInfo();
  return [
    `source=${source}`,
    `timestamp=${new Date().toISOString()}`,
    `platform=${Platform.OS}`,
    `engine=${profile.engine}`,
    `modelStatus=${profile.modelStatus}`,
    `hasModelPath=${Boolean(profile.modelPath)}`,
    `modelExists=${Platform.OS === 'web' ? 'n/a' : modelManager.modelExists()}`,
    `modelSize=${modelDebugInfo.modelSize ?? 'n/a'}`,
    `expectedModelSize=${modelDebugInfo.expectedSize}`,
    `stampExists=${modelDebugInfo.stampExists}`,
    `stampSize=${modelDebugInfo.stampSize ?? 'n/a'}`,
    ...extra,
    describeError(error),
  ].join('\n');
}

async function saveLlmRuntimeError(
  source: LlmRuntimeErrorSource,
  profile: AiProfileState,
  error: unknown,
  extra: string[] = [],
): Promise<void> {
  try {
    await AsyncStorage.setItem(
      LLM_RUNTIME_ERROR_KEY,
      buildLlmRuntimeDiagnostic(source, profile, error, extra).slice(0, 2400),
    );
  } catch {
    // Diagnóstico best-effort: no debe romper el fallback del chat.
  }
}

export async function getLlmRuntimeError(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(LLM_RUNTIME_ERROR_KEY);
  } catch {
    return null;
  }
}

async function clearLlmRuntimeError(): Promise<void> {
  try {
    await AsyncStorage.removeItem(LLM_RUNTIME_ERROR_KEY);
  } catch {
    // Best-effort.
  }
}

// Lee la preferencia. Default true: cualquier valor distinto de 'false' (incluida la ausencia de
// clave o un fallo de AsyncStorage) cuenta como activada.
async function loadInterjectionsEnabled(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(INTERJECTIONS_ENABLED_KEY)) !== 'false';
  } catch {
    return true;
  }
}

// Flag de sesión (solo en memoria, NO persiste): a lo sumo UNA aparición por apertura de la app.
// Se resetea al arrancar el proceso, que es justo lo que queremos (una por sesión).
let interjectionShownThisSession = false;

// Lee el mapa de apariciones mostradas (trigger → dateKey). Devuelve {} si no hay nada o está corrupto.
async function loadShownInterjections(): Promise<Record<string, string>> {
  try {
    const raw = await AsyncStorage.getItem(INTERJECTIONS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === 'object') return parsed as Record<string, string>;
    return {};
  } catch {
    return {};
  }
}

// Marca un trigger como mostrado hoy y persiste el mapa. Best-effort: si falla, el dedupe entre
// arranques se pierde pero el flag de sesión sigue protegiendo dentro de esta apertura.
async function markInterjectionShown(trigger: InterjectionTrigger, today: string): Promise<void> {
  try {
    const shown = await loadShownInterjections();
    shown[trigger] = today;
    await AsyncStorage.setItem(INTERJECTIONS_KEY, JSON.stringify(shown));
  } catch {
    // Best-effort: el flag de sesión en memoria sigue garantizando 1/sesión.
  }
}

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

// Si el LLM local falla (OOM, timeout, incompatibilidad nativa), el chat no debe quedarse bloqueado:
// la respuesta ACTUAL cae a plantillas y guardamos diagnóstico. Pero no apagamos la IA avanzada si el
// modelo sigue instalado; el usuario no debe ver el toggle desactivarse tras un fallo runtime puntual.
// Solo degradamos el perfil si el fichero/modelo ya no es válido.
async function handleLlmRuntimeFailure(
  profile: AiProfileState,
  error: unknown,
  source: 'openChat' | 'sendMessage',
): Promise<AiProfileState> {
  if (profile.engine !== 'llama') return profile;
  await saveLlmRuntimeError(source, profile, error);
  if (profile.modelStatus !== 'ready' || !modelManager.modelExists()) {
    await setAiModelStatus('error');
    await setAiEngine('template');
    return toProfileState(await getAiProfile());
  }
  return profile;
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
    const recoveredModelPath = modelManager.recoverDownloadedModel();
    if (recoveredModelPath) {
      await setAiModelStatus('ready', recoveredModelPath);
      await setAiEngine('llama');
      return true;
    }

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
  dailyMessage: null,
  habitInsights: {},
  interjection: null,
  interjectionsEnabled: true,
  chatContextNote: null,
  loadAi: async () => {
    const [profile, messages, interjectionsEnabled] = await Promise.all([
      getAiProfile(),
      listAiMessages(),
      loadInterjectionsEnabled(),
    ]);
    // Normaliza divergencias del modelo (solo nativo) antes de proyectar al estado: 'downloading'
    // huérfano y 'ready' sin fichero. Si reconcilió, recarga el profile ya corregido.
    const reconciled = await reconcileModelState(profile);
    const finalProfile = reconciled ? await getAiProfile() : profile;
    set({ profile: toProfileState(finalProfile), messages, interjectionsEnabled, isReady: true });
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
    const language = useAppStore.getState().language;
    const ctx = await buildSystemContext();
    try {
      const profileBeforeEngine = get().profile;
      const engine = await resolveEngine(get().profile);
      if (profileBeforeEngine.engine === 'llama' && engine.id !== 'llama') {
        await saveLlmRuntimeError(
          'openChat',
          profileBeforeEngine,
          new Error('resolveEngine returned template while profile requested llama'),
          [`resolvedEngine=${engine.id}`],
        );
      }
      const text = resolveReply(await engine.greeting(ctx, language));
      await addAiMessage('assistant', text);
    } catch (err) {
      if (__DEV__) console.warn('[ai] openChat: fallo en el saludo del Sistema', err);
      const profile = await handleLlmRuntimeFailure(get().profile, err, 'openChat');
      const fallback = resolveReply(await templateEngine.greeting(ctx, language));
      await addAiMessage('assistant', fallback);
      set({ profile });
    } finally {
      set({ messages: await listAiMessages(), isReady: true, isGenerating: false });
    }
  },
  sendMessage: async (text) => {
    const trimmed = text.trim();
    if (!trimmed || get().isGenerating) return;

    await addAiMessage('user', trimmed);
    // Token de esta generación: si cancelGeneration lo invalida mientras inferimos, descartamos la
    // respuesta en vez de persistirla.
    const token = ++chatGenerationToken;
    set({ messages: await listAiMessages(), isGenerating: true });

    // Si el chat nació de una aparición, pasamos el motivo al engine (solo el LLM lo usa) para que la
    // primera respuesta tenga continuidad. Pero solo si la nota es RECIENTE: si el usuario llegó al
    // chat tras la aparición y no escribió hasta mucho después, la nota está caducada y la ignoramos
    // para no contaminar un chat futuro con un contexto viejo. Lo limpiamos tras este envío en
    // cualquier caso (usada o caducada): el contexto inicial ya cumplió o ya no vale.
    const storedNote = get().chatContextNote;
    const noteAgeMs = storedNote ? Date.now() - Date.parse(storedNote.createdAt) : Infinity;
    const contextNote = storedNote && noteAgeMs <= CHAT_CONTEXT_NOTE_MAX_AGE_MS ? storedNote : null;

    try {
      const language = useAppStore.getState().language;
      const profileBeforeEngine = get().profile;
      const engine = await resolveEngine(profileBeforeEngine);
      if (profileBeforeEngine.engine === 'llama' && engine.id !== 'llama') {
        await saveLlmRuntimeError(
          'sendMessage',
          profileBeforeEngine,
          new Error('resolveEngine returned template while profile requested llama'),
          [`resolvedEngine=${engine.id}`],
        );
      }
      const ctx = await buildSystemContext();
      const reply = resolveReply(await engine.reply(ctx, trimmed, language, contextNote ?? undefined));
      // Cancelada/reemplazada mientras inferíamos: descarta la respuesta, no la persistas.
      if (token !== chatGenerationToken) return;
      await addAiMessage('assistant', reply);
      set({ messages: await listAiMessages(), chatContextNote: null });
    } catch (err) {
      // La pantalla llama con `void sendMessage(...)`, así que sin catch un fallo quedaría como
      // unhandled rejection silenciosa. Si el LLM peta (modelo ausente/OOM/inferencia/timeout),
      // registramos un mensaje de error del Sistema para que el usuario vea feedback en lugar de
      // silencio. Si fue cancelación (token ya invalidado), no escribimos error: cancelGeneration ya
      // limpió el estado.
      if (__DEV__) console.warn('[ai] sendMessage: fallo en la respuesta del Sistema', err);
      if (token !== chatGenerationToken) return;
      const language = useAppStore.getState().language;
      const ctx = await buildSystemContext();
      const profile = await handleLlmRuntimeFailure(get().profile, err, 'sendMessage');
      const fallback = resolveReply(await templateEngine.reply(ctx, trimmed, language, contextNote ?? undefined));
      await addAiMessage('assistant', fallback);
      // Limpiamos el contextNote igualmente: el intento ya consumió el contexto inicial.
      set({ messages: await listAiMessages(), chatContextNote: null, profile });
    } finally {
      // isGenerating SIEMPRE se resetea, también ante timeout/error, para no dejar el chat colgado.
      // Solo si seguimos siendo la generación vigente: una cancelación posterior ya lo reseteó.
      if (token === chatGenerationToken) set({ isGenerating: false });
    }
  },
  // Cancela la generación en curso del chat. Invalida el token (la respuesta en vuelo se descarta),
  // aborta la inferencia nativa del LLM si la hay y resetea isGenerating para desbloquear la UI. No
  // escribe ningún mensaje: simplemente deja el chat como estaba antes de generar.
  cancelGeneration: () => {
    if (!get().isGenerating) return;
    // Invalida la generación en vuelo: su resultado/error se ignorará al volver.
    chatGenerationToken++;
    set({ isGenerating: false });
    // Corta la inferencia nativa en background (no bloqueamos la UI esperando al abort).
    void abortLlamaGeneration();
  },
  // Dispara una aparición del Sistema si el cooldown lo permite. Reglas:
  //  - 1 aparición por apertura de app (flag de sesión en memoria).
  //  - 1 vez por día por trigger (mapa persistido en AsyncStorage).
  // Si pasa el filtro: muestra al instante el texto de plantilla (fromAi:false) y, si el engine activo
  // es 'llama', lo regenera en background con el LLM (fromAi:true). Un fallo del LLM deja la plantilla.
  // No-bloqueante por diseño: las acciones del juego la disparan "fire and forget" con catch.
  triggerInterjection: async (trigger) => {
    // 1) Cooldown de sesión: ya hubo una aparición esta apertura → no dispares. Hacemos el "claim"
    //    SÍNCRONO aquí mismo (antes de cualquier await): así dos disparos casi simultáneos no pueden
    //    colarse ambos por los guards async de abajo. Si un guard posterior nos hace NO mostrar,
    //    revertimos el flag a false antes del return para no consumir la única aparición de la sesión.
    if (interjectionShownThisSession) return;
    interjectionShownThisSession = true;

    // 0) Preferencia: si el usuario desactivó las apariciones, el Sistema no salta. Leemos de
    //    AsyncStorage (fuente de verdad) en vez de fiarnos del estado, porque triggerInterjection
    //    puede dispararse antes de que loadAi haya cargado la preferencia al estado.
    if (!(await loadInterjectionsEnabled())) {
      interjectionShownThisSession = false;
      return;
    }

    const today = toDateKey();

    // 2) Dedupe diario: este trigger ya se mostró hoy → no dispares.
    const shown = await loadShownInterjections();
    if (shown[trigger] === today) {
      interjectionShownThisSession = false;
      return;
    }

    // Pasa el filtro: el flag de sesión ya está reclamado; persistimos el dedupe diario antes de
    // generar, para que un reinicio de sesión tampoco repita este trigger hoy.
    await markInterjectionShown(trigger, today);

    // El perfil decide el motor (template/llama). Si el store aún no se cargó (el trigger 'comeback'
    // salta en boot()→closeMissedDays(), muy pronto, antes de que ninguna pantalla llame a loadAi),
    // lo cargamos: sin esto profile.engine sería siempre el default 'template' y la aparición nunca
    // se enriquecería con el LLM aunque esté activo. loadAi solo lee BD/AsyncStorage y setea estado
    // (no dispara boot ni triggerInterjection), así que no hay bucle. Igual que ensureDailyMessage.
    if (!get().isReady) await get().loadAi();

    const tone = getInterjectionTone(trigger);
    const createdAt = new Date().toISOString();

    // Texto de plantilla SIEMPRE primero (instantáneo, offline): la aparición nunca se queda sin texto.
    const ctx = await buildSystemContext();
    const templateText = resolveReply(await templateEngine.interjection(ctx, trigger, useAppStore.getState().language));
    set({ interjection: { trigger, tone, text: templateText, fromAi: false, createdAt } });

    // Si el engine activo no es llama, ya está: la plantilla es definitiva.
    if (get().profile.engine !== 'llama') return;

    // IA activa: regenera en background. La plantilla ya está visible; si el LLM responde, la sustituye.
    try {
      const language = useAppStore.getState().language;
      const engine = await resolveEngine(get().profile);
      if (engine.id !== 'llama') return;
      const aiText = resolveReply(await engine.interjection(ctx, trigger, language));
      // La aparición pudo descartarse/cambiar mientras inferíamos: solo sustituye si sigue siendo esta.
      const current = get().interjection;
      if (current && current.trigger === trigger && current.createdAt === createdAt) {
        set({ interjection: { ...current, text: aiText, fromAi: true } });
      }
    } catch (err) {
      // El LLM falló: dejamos el texto de plantilla. No rompe nada.
      await saveLlmRuntimeError('interjection', get().profile, err, [
        `trigger=${trigger}`,
        `resolvedSurface=interjection`,
      ]);
      if (__DEV__) console.warn('[ai] triggerInterjection: fallo enriqueciendo con LLM, queda plantilla', err);
    }
  },
  dismissInterjection: () => {
    set({ interjection: null });
  },
  // Persiste la preferencia y la refleja en el estado. Best-effort en el escribir: si AsyncStorage
  // falla, el estado igual cambia (el toggle responde); en el peor caso la preferencia no sobrevive
  // al reinicio. El guard de triggerInterjection relee de AsyncStorage, así que respeta lo escrito.
  setInterjectionsEnabled: async (enabled) => {
    set({ interjectionsEnabled: enabled });
    try {
      await AsyncStorage.setItem(INTERJECTIONS_ENABLED_KEY, String(enabled));
    } catch {
      // Best-effort: el estado ya refleja el cambio en esta sesión.
    }
  },
  // Continúa la aparición en el chat: persiste su texto como mensaje del Sistema en el historial (para
  // que al abrir /system-chat el contexto ya esté ahí) y deja el motivo en chatContextNote para que la
  // siguiente respuesta lo tenga en cuenta. Limpia la aparición y recarga messages. La navegación la
  // hace la UI tras llamar esto.
  continueFromInterjection: async () => {
    const current = get().interjection;
    if (!current) return;
    await addAiMessage('assistant', current.text);
    set({
      interjection: null,
      chatContextNote: { trigger: current.trigger, tone: current.tone, createdAt: toIsoTimestamp() },
      messages: await listAiMessages(),
    });
  },
  // Asegura el mensaje del día del Sistema para la pantalla Hoy: un BRIEFING accionable (cuántas
  //  misiones quedan y por dónde empezar — el eslabón débil si lo hay), no un saludo genérico.
  //  Estrategia "instantáneo primero":
  //  1) Si ya hay un mensaje en estado/cache de HOY y es suficientemente bueno (de IA, o el engine
  //     activo no es llama), no regenera: no merece la pena reinferir con el LLM (lento).
  //  2) Si no, genera SIEMPRE primero el briefing de plantilla (síncrono, offline) y lo setea ya: Hoy
  //     nunca se queda sin mensaje.
  //  3) Si el engine activo es 'llama', regenera EN BACKGROUND con el LLM en torno a ese briefing y,
  //     si tiene éxito, sustituye el de plantilla por el de IA. Un fallo del LLM deja el de plantilla.
  ensureDailyMessage: async () => {
    // El perfil decide el motor (template/llama). Si todavía no se cargó (Hoy puede llamar antes de
    // que nadie haya llamado a loadAi), lo cargamos: sin esto engine sería siempre 'template' y la IA
    // nunca se usaría para el mensaje del día.
    if (!get().isReady) await get().loadAi();

    const today = toDateKey();
    const profile = get().profile;
    const isLlama = profile.engine === 'llama';

    // ¿El mensaje de hoy ya es "lo bueno"? Lo es si viene de IA, o si el engine activo no es llama
    // (en cuyo caso el de plantilla es lo máximo que vamos a tener).
    const isFreshEnough = (message: DailyMessage | null): boolean =>
      message?.date === today && (message.fromAi || !isLlama);

    // 1) Estado en memoria ya fresco → nada que hacer.
    if (isFreshEnough(get().dailyMessage)) return;

    // 2) Cache de AsyncStorage. SOLO lo usamos si es de HOY: si es de AYER, no lo ponemos como estado
    //    (evita el parpadeo de mostrar el mensaje de ayer un instante antes de regenerar). Si es de
    //    hoy y además es "lo bueno", terminamos.
    const cached = await loadCachedDailyMessage();
    const cachedIsToday = cached?.date === today;
    if (cachedIsToday) {
      set({ dailyMessage: cached });
      if (isFreshEnough(cached)) return;
    }

    // 3) Briefing de plantilla SIEMPRE primero (instantáneo, offline). Salvo que el cache de HOY ya
    //    traiga un texto utilizable que estamos a punto de mejorar con IA: en ese caso no lo pisamos
    //    por uno de plantilla mientras esperamos al LLM (evita parpadeo). Si no hay cache de hoy,
    //    generamos el briefing con getDailyBriefing (N pendientes + eslabón débil) y lo cacheamos.
    if (!cachedIsToday) {
      const ctx = await buildSystemContext();
      const text = resolveReply(getDailyBriefing(ctx));
      const templateMessage: DailyMessage = { date: today, text, fromAi: false };
      set({ dailyMessage: templateMessage });
      await persistDailyMessage(templateMessage);
    }

    // 4) Si el engine activo NO es llama, ya hemos terminado: el briefing de plantilla es definitivo.
    if (!isLlama) return;

    // 5) IA activa: regenera el briefing en background con el LLM (prompt construido en torno al parte
    //    del día). El de plantilla ya está en pantalla; este lo sustituye al terminar. Si el LLM falla
    //    o vence el timeout, dejamos el de plantilla (sin error en el banner).
    try {
      const language = useAppStore.getState().language;
      // Necesitamos la ruta del modelo para generar el briefing. Solo procede en nativo con modelo
      // listo y ruta presente (mismas condiciones que resolveEngine para usar el LLM).
      const modelPath = profile.modelPath;
      if (Platform.OS === 'web' || profile.modelStatus !== 'ready' || !modelPath) return;
      const { generateDailyBriefing } = await import('@/ai/llamaEngine');
      const ctx = await buildSystemContext();
      const text = resolveReply(await generateDailyBriefing(ctx, language, modelPath));
      // El día pudo cambiar mientras inferíamos (app abierta a medianoche): solo guarda si sigue siendo
      // el briefing de hoy.
      if (toDateKey() !== today) return;
      const aiMessage: DailyMessage = { date: today, text, fromAi: true };
      set({ dailyMessage: aiMessage });
      await persistDailyMessage(aiMessage);
    } catch (err) {
      // El LLM falló (modelo ausente/OOM/inferencia/timeout): el mensaje de plantilla ya seteado sigue
      // siendo válido. No mostramos error en el banner.
      await saveLlmRuntimeError('dailyMessage', get().profile, err, [`date=${today}`]);
      if (__DEV__) console.warn('[ai] ensureDailyMessage: fallo generando briefing con LLM, queda plantilla', err);
    }
  },
  // Fuerza regenerar el mensaje del día ignorando el cache de hoy: borra el estado y delega en
  // ensureDailyMessage, que volverá a generar plantilla + (si procede) IA.
  refreshDailyMessage: async () => {
    set({ dailyMessage: null });
    await AsyncStorage.removeItem(DAILY_MESSAGE_KEY).catch(() => undefined);
    await get().ensureDailyMessage();
  },
  // Asegura el micro-comentario del Sistema para un hábito (pantalla de detalle). Mismo patrón que
  // ensureDailyMessage:
  //  1) Plantilla SIEMPRE primero (getHabitInsight → texto, síncrono y offline): el detalle nunca se
  //     queda sin comentario, también sin modelo.
  //  2) Si el engine es 'llama' con modelo listo, regenera EN BACKGROUND con el LLM y sustituye el
  //     texto (fromAi:true) al terminar. Un fallo del LLM deja la plantilla.
  // Cachea por habitId+día: si ya hay un insight de IA fresco de HOY, no reinfiere. Y dedupe en vuelo:
  // no lanza dos inferencias a la vez para el mismo hábito (la pantalla puede re-llamar al re-render).
  ensureHabitInsight: async (habitId, input) => {
    // El perfil decide el motor. Si el store aún no se cargó (el detalle puede llamar antes que nadie),
    // lo cargamos: sin esto engine sería siempre 'template' y la IA nunca se usaría. Igual que ensureDailyMessage.
    if (!get().isReady) await get().loadAi();

    const habitCtx = buildHabitContext(input);

    // 1) Plantilla al instante. Solo la seteamos si la entrada actual no es ya de IA fresca de hoy
    //    (evita pisar un comentario de IA con uno de plantilla en un re-render del mismo día).
    const today = toDateKey();
    const aiFreshToday = habitInsightAiDay[habitId] === today && get().habitInsights[habitId]?.fromAi;
    if (!aiFreshToday) {
      const templateText = resolveReply(getHabitInsight(habitCtx, useAppStore.getState().language));
      set({ habitInsights: { ...get().habitInsights, [habitId]: { text: templateText, fromAi: false } } });
    }

    // 2) Solo enriquecemos con LLM si el engine es llama. Si no, la plantilla es definitiva.
    const profile = get().profile;
    if (profile.engine !== 'llama') return;

    // No reinferir si ya hay IA fresca de hoy, ni lanzar dos inferencias a la vez para este hábito.
    if (aiFreshToday || habitInsightInFlight.has(habitId)) return;

    // Mismas condiciones que el LLM en ensureDailyMessage: nativo, modelo listo y ruta presente.
    const modelPath = profile.modelPath;
    if (Platform.OS === 'web' || profile.modelStatus !== 'ready' || !modelPath) return;

    habitInsightInFlight.add(habitId);
    try {
      const language = useAppStore.getState().language;
      const { generateHabitInsight } = await import('@/ai/llamaEngine');
      const text = await generateHabitInsight(habitCtx, language, modelPath);
      // generateHabitInsight devuelve texto plano (ya en el idioma correcto): se usa tal cual.
      set({ habitInsights: { ...get().habitInsights, [habitId]: { text, fromAi: true } } });
      habitInsightAiDay[habitId] = today;
    } catch (err) {
      // El LLM falló (modelo ausente/OOM/inferencia/timeout): la plantilla ya seteada sigue valiendo.
      await saveLlmRuntimeError('habitInsight', get().profile, err, [`habitId=${habitId}`]);
      if (__DEV__) console.warn('[ai] ensureHabitInsight: fallo generando insight con LLM, queda plantilla', err);
    } finally {
      habitInsightInFlight.delete(habitId);
    }
  },
  clearChat: async () => {
    await clearAiMessages();
    set({ messages: [], chatContextNote: null });
  },
  setEnabled: async (enabled) => {
    await setAiEnabled(enabled);
    set({ profile: toProfileState(await getAiProfile()) });
  },
  // Cambia el motor (template/llama) en la BD y recarga el perfil. Es el gancho que la pantalla de
  // gestión usa para alternar entre el chat por plantillas y el LLM local.
  setEngine: async (engine) => {
    if (engine === 'llama') await clearLlmRuntimeError();
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
      await clearLlmRuntimeError();
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
