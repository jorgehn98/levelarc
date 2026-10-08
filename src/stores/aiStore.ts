import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { create } from 'zustand';

import { resolveEngine, templateEngine } from '@/ai';
import { buildDailyMessageKey, parseCachedDailyMessage, type DailyMessage } from '@/ai/dailyMessage';
import { isInferenceSkipped } from '@/ai/inferenceQueue';
import * as modelManager from '@/ai/modelManager';
import { planModelReconcile } from '@/ai/modelReconcile';
import { t } from '@/i18n';
import { isInternalBuild } from '@/lib/buildInfo';
import { toDateKey, toIsoTimestamp } from '@/lib/date';
import { buildHabitContext } from '@/core/aiContext';
import { getDailyBriefing, getHabitInsight, getInterjectionTone } from '@/core/systemVoice';
import type { HabitInsightInput, SystemContext } from '@/core/aiContext';
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
  // Motivo conocido del último fallo de descarga, para dar un mensaje concreto. null = genérico. Solo
  // en memoria: tras reiniciar, un estado 'error' muestra el mensaje genérico.
  modelErrorReason: 'storage' | null;
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
  // Genera el mensaje del día: plantilla al instante (siempre recalculada) + LLM en background si está
  // activo. Solo el texto del LLM se cachea, por día + idioma + estado del día.
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

// Apertura del chat en curso (ver openChat): evita dos saludos por aperturas solapadas.
let openChatInFlight: Promise<void> | null = null;

// Tope de mensajes del chat que se cargan en memoria/pantalla. El historial en BD no se toca aquí;
// esto solo evita que cada envío relea y repinte una conversación entera que crece sin límite.
const CHAT_HISTORY_LIMIT = 200;

// Control de ensureDailyMessage (handles, no UI). `dailyMessageRun` numera las llamadas: si entra una
// más nueva mientras otra espera a la BD, la vieja se retira para no pisar con un estado anterior.
// `dailyAiInFlightKey` evita lanzar dos inferencias para el mismo día/idioma/estado. `aiSessionEpoch`
// cambia en resetAiSession: una inferencia que empezó antes de un reset de datos no debe escribir.
let dailyMessageRun = 0;
let dailyAiInFlightKey: string | null = null;
let aiSessionEpoch = 0;

// Cache/dedupe en memoria del micro-comentario de IA por hábito. `habitInsightAiDay[habitId]` guarda
// día + idioma del último insight de IA fresco: si coincide, no reinferimos con el LLM (lento). El Set
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
    abortGeneration();
  } catch (err) {
    if (__DEV__) console.warn('[ai] abortGeneration falló', err);
  }
}

// Clave de AsyncStorage donde se cachea el mensaje del día generado por el LLM (JSON DailyMessage).
// Evita reinferir (lento) al reabrir la app si ya hay uno vigente. El de plantilla no se guarda: es
// gratis de recalcular y así nunca se queda viejo.
const DAILY_MESSAGE_KEY = 'levelarc.dailyMessage';

// Lee el mensaje del día cacheado en AsyncStorage. Devuelve null si no hay nada, está corrupto o es
// del formato antiguo (no rompemos: simplemente se regenera).
async function loadCachedDailyMessage(): Promise<DailyMessage | null> {
  try {
    return parseCachedDailyMessage(await AsyncStorage.getItem(DAILY_MESSAGE_KEY));
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

// La traza JS solo se guarda en builds internos: en producción nadie debe poder verla y no aporta
// nada al usuario (la pantalla de IA enseña un aviso corto con "reintentar").
function describeError(error: unknown): string {
  if (error instanceof Error) {
    const stack = isInternalBuild() && error.stack && error.stack !== error.message ? `\n${error.stack}` : '';
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

// "Reintentar" del aviso de fallo del motor local: suelta el contexto cargado (si se quedó en mal
// estado, la siguiente inferencia lo recarga limpio) y borra el aviso. No toca modelo ni preferencias.
export async function retryLlmEngine(): Promise<void> {
  // Con una respuesta del chat generándose no se suelta el contexto (el motor está funcionando y se
  // perdería la respuesta): solo se limpia el aviso. releaseLlama descarta antes las inferencias de
  // fondo que hubiera y espera a que suelten el contexto.
  if (Platform.OS !== 'web' && !useAiStore.getState().isGenerating) {
    try {
      const { releaseLlama } = await import('@/ai/llamaEngine');
      await releaseLlama();
    } catch {
      // Si no había contexto o llama.rn no está disponible, no hay nada que soltar.
    }
  }
  await clearLlmRuntimeError();
}

async function saveLlamaResolvedAsTemplate(
  source: LlmRuntimeErrorSource,
  profile: AiProfileState,
  extra: string[] = [],
): Promise<void> {
  if (profile.engine !== 'llama') return;
  await saveLlmRuntimeError(
    source,
    profile,
    new Error('resolveEngine returned template while profile requested llama'),
    [`resolvedEngine=template`, ...extra],
  );
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

// Contexto del Sistema. buildSystemContext ya incluye el nº de hábitos activos.
function loadSystemContext(): Promise<SystemContext> {
  return buildSystemContext();
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

// Reconcilia el estado del modelo en BD con la realidad (memoria/disco) al cargar. Solo nativo: en
// web el LLM no aplica. Devuelve true si normalizó algo (el caller recarga el profile). Las reglas
// están en planModelReconcile (puro y testeado); aquí solo se leen los hechos y se aplica el plan.
async function reconcileModelState(
  profile: Awaited<ReturnType<typeof getAiProfile>>,
): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  // Con una descarga viva no se toca el fichero: está a medio escribir.
  if (downloadController) return false;

  // recoverDownloadedModel valida el tamaño exacto y repone el stamp si faltaba.
  const modelPath = modelManager.recoverDownloadedModel();
  const plan = planModelReconcile(profile.modelStatus, modelPath !== null, false);
  if (!plan) return false;

  if (plan.deletePartial) modelManager.deleteModel();
  if (plan.status === 'ready') await setAiModelStatus('ready', modelPath);
  else await setAiModelStatus('none');
  if (plan.engine) await setAiEngine(plan.engine);
  return true;
}

// Reinicia la sesión de IA en memoria. Llamar DESPUÉS de un "resetear todo" o de importar un backup:
// esas operaciones reescriben ai_profile/ai_messages en BD, pero el store seguiría mostrando el chat,
// el mensaje del día y los comentarios de los datos anteriores. Cancela lo que esté generando, vacía
// los caches (también el mensaje del día persistido y el aviso de fallo del motor) y relee el perfil
// con loadAi(), que además readopta un modelo que siga en disco. No borra el modelo ni las
// preferencias de apariciones.
export async function resetAiSession(): Promise<void> {
  aiSessionEpoch += 1;
  chatGenerationToken += 1;
  dailyMessageRun += 1;
  void abortLlamaGeneration();
  for (const habitId of Object.keys(habitInsightAiDay)) delete habitInsightAiDay[habitId];
  useAiStore.setState({
    messages: [],
    isGenerating: false,
    dailyMessage: null,
    habitInsights: {},
    interjection: null,
    chatContextNote: null,
    modelErrorReason: null,
  });
  await AsyncStorage.multiRemove([DAILY_MESSAGE_KEY, LLM_RUNTIME_ERROR_KEY]).catch(() => undefined);
  await useAiStore.getState().loadAi();
}

export const useAiStore = create<AiState>((set, get) => ({
  messages: [],
  profile: { enabled: false, engine: 'template', modelStatus: 'none', modelPath: null },
  isGenerating: false,
  isReady: false,
  modelProgress: 0,
  modelErrorReason: null,
  dailyMessage: null,
  habitInsights: {},
  interjection: null,
  interjectionsEnabled: true,
  chatContextNote: null,
  loadAi: async () => {
    const [profile, messages, interjectionsEnabled] = await Promise.all([
      getAiProfile(),
      listAiMessages(CHAT_HISTORY_LIMIT),
      loadInterjectionsEnabled(),
    ]);
    // Normaliza divergencias del modelo (solo nativo) antes de proyectar al estado: 'downloading'
    // huérfano, 'ready' sin fichero y 'none' con el modelo en disco. Si reconcilió, recarga el profile.
    const reconciled = await reconcileModelState(profile);
    const finalProfile = reconciled ? await getAiProfile() : profile;
    set({ profile: toProfileState(finalProfile), messages, interjectionsEnabled, isReady: true });
  },
  // Abre el chat: si está vacío, lo arranca con un saludo proactivo. Una sola apertura a la vez: el
  // saludo del LLM tarda (carga en frío + inferencia) y entrar, salir y volver a entrar lanzaba dos y
  // guardaba dos saludos. Las llamadas solapadas comparten la que ya está en curso.
  openChat: () => {
    openChatInFlight ??= (async () => {
      // Token como en sendMessage: si el usuario cancela (y quizá escribe) mientras generamos, este
      // saludo ya no pinta nada y no debe guardarse detrás de su mensaje.
      let token: number | null = null;
      try {
        // Evita duplicar saludos: si ya hay historial, no genera otro de apertura.
        const existing = await listAiMessages(CHAT_HISTORY_LIMIT);
        if (existing.length > 0) {
          set({ messages: existing, isReady: true });
          return;
        }
        // Marcamos isGenerating para que la UI muestre el indicador de escritura. Todo lo que puede
        // fallar va dentro del try: el finally garantiza que la marca no se queda puesta.
        token = ++chatGenerationToken;
        set({ isGenerating: true });
        const language = useAppStore.getState().language;
        const ctx = await loadSystemContext();
        let text: string;
        try {
          const profileBeforeEngine = get().profile;
          const engine = await resolveEngine(profileBeforeEngine);
          if (profileBeforeEngine.engine === 'llama' && engine.id !== 'llama') {
            await saveLlamaResolvedAsTemplate('openChat', profileBeforeEngine);
          }
          text = resolveReply(await engine.greeting(ctx, language));
        } catch (err) {
          if (__DEV__) console.warn('[ai] openChat: fallo en el saludo del Sistema', err);
          if (token !== chatGenerationToken) return;
          // Inferencia descartada sin cancelar el chat (se soltó el modelo): no es un fallo del
          // motor, solo cae a plantilla y no se toca el perfil.
          if (!isInferenceSkipped(err)) {
            set({ profile: await handleLlmRuntimeFailure(get().profile, err, 'openChat') });
          }
          text = resolveReply(await templateEngine.greeting(ctx, language));
        }
        if (token !== chatGenerationToken) return;
        await addAiMessage('assistant', text);
      } catch (err) {
        // Fallo de BD/contexto: el chat queda sin saludo, pero ni se cuelga ni rechaza sin dueño.
        if (__DEV__) console.warn('[ai] openChat: no se pudo abrir el chat', err);
      } finally {
        openChatInFlight = null;
        if (token !== null) {
          const messages = await listAiMessages(CHAT_HISTORY_LIMIT).catch(() => get().messages);
          // Solo soltamos isGenerating si seguimos siendo la generación vigente: tras cancelar, puede
          // haber ya un envío del usuario generando.
          set(token === chatGenerationToken ? { messages, isReady: true, isGenerating: false } : { messages, isReady: true });
        }
      }
    })();
    return openChatInFlight;
  },
  sendMessage: async (text) => {
    const trimmed = text.trim();
    if (!trimmed || get().isGenerating) return;

    await addAiMessage('user', trimmed);
    // Token de esta generación: si cancelGeneration lo invalida mientras inferimos, descartamos la
    // respuesta en vez de persistirla.
    const token = ++chatGenerationToken;
    set({ messages: await listAiMessages(CHAT_HISTORY_LIMIT), isGenerating: true });

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
        await saveLlamaResolvedAsTemplate('sendMessage', profileBeforeEngine);
      }
      const ctx = await loadSystemContext();
      const reply = resolveReply(await engine.reply(ctx, trimmed, language, contextNote ?? undefined));
      // Cancelada/reemplazada mientras inferíamos: descarta la respuesta, no la persistas.
      if (token !== chatGenerationToken) return;
      await addAiMessage('assistant', reply);
      set({ messages: await listAiMessages(CHAT_HISTORY_LIMIT), chatContextNote: null });
    } catch (err) {
      // La pantalla llama con `void sendMessage(...)`, así que sin catch un fallo quedaría como
      // unhandled rejection silenciosa. Si el LLM peta (modelo ausente/OOM/inferencia/timeout),
      // registramos un mensaje de error del Sistema para que el usuario vea feedback en lugar de
      // silencio. Si fue cancelación (token ya invalidado), no escribimos error: cancelGeneration ya
      // limpió el estado.
      if (__DEV__) console.warn('[ai] sendMessage: fallo en la respuesta del Sistema', err);
      if (token !== chatGenerationToken) return;
      const language = useAppStore.getState().language;
      const ctx = await loadSystemContext();
      // Inferencia descartada sin cancelar el chat (se soltó el modelo por debajo, p. ej. al borrarlo):
      // no es un fallo del motor. Responde la plantilla y no se toca el perfil; registrar el fallo
      // aquí dejaba un borrado deliberado en estado 'error'.
      if (!isInferenceSkipped(err)) {
        set({ profile: await handleLlmRuntimeFailure(get().profile, err, 'sendMessage') });
      }
      const fallback = resolveReply(await templateEngine.reply(ctx, trimmed, language, contextNote ?? undefined));
      await addAiMessage('assistant', fallback);
      // Limpiamos el contextNote igualmente: el intento ya consumió el contexto inicial.
      set({ messages: await listAiMessages(CHAT_HISTORY_LIMIT), chatContextNote: null });
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
    const ctx = await loadSystemContext();
    const templateText = resolveReply(await templateEngine.interjection(ctx, trigger, useAppStore.getState().language));
    set({ interjection: { trigger, tone, text: templateText, fromAi: false, createdAt } });

    // Si el engine activo no es llama, ya está: la plantilla es definitiva.
    if (get().profile.engine !== 'llama') return;

    // IA activa: regenera en background. La plantilla ya está visible; si el LLM responde, la sustituye.
    try {
      const language = useAppStore.getState().language;
      const engine = await resolveEngine(get().profile);
      if (engine.id !== 'llama') {
        await saveLlamaResolvedAsTemplate('interjection', get().profile, [
          `trigger=${trigger}`,
          `resolvedSurface=interjection`,
        ]);
        return;
      }
      const aiText = resolveReply(await engine.interjection(ctx, trigger, language));
      // La aparición pudo descartarse/cambiar mientras inferíamos: solo sustituye si sigue siendo esta.
      const current = get().interjection;
      if (current && current.trigger === trigger && current.createdAt === createdAt) {
        set({ interjection: { ...current, text: aiText, fromAi: true } });
      }
    } catch (err) {
      // Motor ocupado (el chat tiene prioridad): la plantilla ya visible es la definitiva.
      if (isInferenceSkipped(err)) return;
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
      messages: await listAiMessages(CHAT_HISTORY_LIMIT),
    });
  },
  // Asegura el mensaje del día del Sistema para la pantalla Hoy. Estrategia "instantáneo primero":
  //  1) Si el LLM está activo y ya hay un texto suyo VIGENTE (mismo día, idioma y estado del día), en
  //     memoria o en cache, se usa y no se reinfiere (lento).
  //  2) Si no, se calcula SIEMPRE el texto de plantilla con el estado actual (síncrono, offline). No
  //     se cachea: así refleja al momento un hábito creado o completado, o un cambio de idioma.
  //  3) Con el LLM activo, se regenera EN BACKGROUND y sustituye a la plantilla si sigue vigente al
  //     terminar. Un fallo del LLM (o motor ocupado por el chat) deja la plantilla.
  // Es barata e idempotente: se puede llamar en cada foco y cada vez que cambie el estado del día.
  ensureDailyMessage: async () => {
    // El perfil decide el motor (template/llama). Si todavía no se cargó (Hoy puede llamar antes de
    // que nadie haya llamado a loadAi), lo cargamos: sin esto engine sería siempre 'template' y la IA
    // nunca se usaría para el mensaje del día.
    if (!get().isReady) await get().loadAi();

    const run = ++dailyMessageRun;
    const epoch = aiSessionEpoch;
    const today = toDateKey();
    const language = useAppStore.getState().language;
    const ctx = await loadSystemContext();
    // Entró una llamada más nueva (o un reset) mientras leíamos: ella manda, con estado más reciente.
    if (run !== dailyMessageRun) return;

    const key = buildDailyMessageKey(today, language, ctx);
    const profile = get().profile;
    const isLlama = profile.engine === 'llama';

    // 1) Texto del LLM ya vigente → nada que hacer.
    if (isLlama) {
      const current = get().dailyMessage;
      if (current?.fromAi && current.key === key) return;
      const cached = await loadCachedDailyMessage();
      if (run !== dailyMessageRun) return;
      if (cached?.fromAi && cached.key === key) {
        set({ dailyMessage: cached });
        return;
      }
    }

    // 2) Plantilla con el estado actual. Solo toca el estado si cambia algo (evita re-renders).
    const templateText = resolveReply(getDailyBriefing(ctx));
    const shown = get().dailyMessage;
    if (!shown || shown.key !== key || shown.fromAi || shown.text !== templateText) {
      set({ dailyMessage: { key, text: templateText, fromAi: false } });
    }

    // 3) Si el engine activo NO es llama, la plantilla es definitiva.
    if (!isLlama) return;

    // Solo procede en nativo con modelo listo y ruta presente (mismas condiciones que resolveEngine).
    const modelPath = profile.modelPath;
    if (Platform.OS === 'web' || profile.modelStatus !== 'ready' || !modelPath) {
      await saveLlamaResolvedAsTemplate('dailyMessage', profile, [
        `date=${today}`,
        `reason=llama_preconditions_not_met`,
      ]);
      return;
    }

    // Ya hay una inferencia en vuelo para este mismo día/idioma/estado: no lances otra.
    if (dailyAiInFlightKey === key) return;
    dailyAiInFlightKey = key;
    let wentStale = false;
    try {
      const { generateDailyBriefing } = await import('@/ai/llamaEngine');
      const text = resolveReply(await generateDailyBriefing(ctx, language, modelPath));
      // Mientras inferíamos pudo cambiar el día, el idioma o el estado (o resetearse los datos): un
      // texto escrito para otra situación no se muestra ni se cachea.
      const currentKey = buildDailyMessageKey(
        toDateKey(),
        useAppStore.getState().language,
        await loadSystemContext(),
      );
      if (epoch !== aiSessionEpoch || currentKey !== key) {
        wentStale = true;
      } else {
        const aiMessage: DailyMessage = { key, text, fromAi: true };
        set({ dailyMessage: aiMessage });
        await persistDailyMessage(aiMessage);
      }
    } catch (err) {
      // Motor ocupado (el chat tiene prioridad) → queda la plantilla, sin registrar fallo. Si el LLM
      // falló de verdad (OOM/inferencia/timeout) también queda la plantilla, sin error en el banner.
      if (!isInferenceSkipped(err)) {
        await saveLlmRuntimeError('dailyMessage', get().profile, err, [`date=${today}`]);
        if (__DEV__) console.warn('[ai] ensureDailyMessage: fallo generando briefing con LLM, queda plantilla', err);
      }
    } finally {
      if (dailyAiInFlightKey === key) dailyAiInFlightKey = null;
    }
    // El estado se movió durante la inferencia: una pasada más con la situación actual. Termina sola
    // en cuanto el estado deja de cambiar.
    if (wentStale) await get().ensureDailyMessage();
  },
  // Fuerza regenerar el mensaje del día ignorando el cache: borra el estado y delega en
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
    // La vigencia incluye el idioma: tras cambiarlo, el comentario de IA anterior ya no vale.
    const freshKey = `${toDateKey()}|${useAppStore.getState().language}`;
    const aiFreshToday = habitInsightAiDay[habitId] === freshKey && get().habitInsights[habitId]?.fromAi;
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
    if (Platform.OS === 'web' || profile.modelStatus !== 'ready' || !modelPath) {
      await saveLlamaResolvedAsTemplate('habitInsight', profile, [
        `habitId=${habitId}`,
        `reason=llama_preconditions_not_met`,
      ]);
      return;
    }

    habitInsightInFlight.add(habitId);
    try {
      const language = useAppStore.getState().language;
      const { generateHabitInsight } = await import('@/ai/llamaEngine');
      const text = await generateHabitInsight(habitCtx, language, modelPath);
      // generateHabitInsight devuelve texto plano (ya en el idioma correcto): se usa tal cual.
      set({ habitInsights: { ...get().habitInsights, [habitId]: { text, fromAi: true } } });
      habitInsightAiDay[habitId] = freshKey;
    } catch (err) {
      // Motor ocupado (el chat tiene prioridad): la plantilla vale y se reintenta en la próxima visita.
      if (isInferenceSkipped(err)) return;
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
    set({ modelProgress: 0, modelErrorReason: null });
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
    } catch (err) {
      // Aborto del usuario o fallo de red/disco: limpiamos el fichero parcial y volvemos a 'none'
      // si fue cancelación, o 'error' si fue un fallo. En ambos casos engine queda en 'template'.
      const aborted = downloadController?.signal.aborted ?? false;
      modelManager.deleteModel();
      await setAiModelStatus(aborted ? 'none' : 'error');
      await setAiEngine('template');
      set({
        profile: toProfileState(await getAiProfile()),
        modelProgress: 0,
        modelErrorReason: !aborted && err instanceof modelManager.InsufficientStorageError ? 'storage' : null,
      });
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
  // releaseLlama descarta primero cualquier inferencia en vuelo y espera a que suelte el contexto: una
  // respuesta del chat a medias termina como "descartada" y sendMessage la resuelve con plantilla sin
  // registrar fallo, así que el borrado acaba siempre en 'none' y no en 'error'.
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
