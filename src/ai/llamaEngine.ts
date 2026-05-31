// Motor LLM local sobre llama.rn (nativo). Genera TEXTO libre ya en el idioma del prompt (no claves
// i18n), así que devuelve { kind: 'text' }. El modelo se carga PEREZOSAMENTE: la primera llamada a
// greeting/reply hace initLlama y cachea el LlamaContext; las siguientes reutilizan el contexto.
//
// IMPORTANTE (web/lazy): llama.rn es un módulo NATIVO que no existe en web ni en Expo Go. Aquí solo
// importamos sus TIPOS de forma estática (`import type`, se borra al compilar y nunca entra en el
// bundle). El valor del módulo se carga con `import('llama.rn')` dinámico DENTRO de la factory, y
// solo cuando de verdad se va a inferir. El selector (ai/index) además solo construye este motor en
// nativo con modelo listo, así que ni la web ni el flujo de plantillas arrastran llama.rn.

import { buildHabitContextText, buildSystemContextText } from '@/core/aiContext';
import type { Language } from '@/i18n';
import type { HabitContext, SystemContext } from '@/core/aiContext';
import type { InterjectionTrigger, SystemReply } from '@/core/systemVoice';

import type { ChatContextNote, SystemChatEngine } from './engine';

// Solo tipos: se borran al compilar, no generan require('llama.rn') en el bundle.
import type { LlamaContext } from 'llama.rn';

// Parámetros de carga del modelo. n_gpu_layers delega capas a GPU si hay; n_threads y mmap
// mantienen el coste de RAM/CPU acotado en móvil.
// CPU-only para el primer build; subir n_gpu_layers y reactivar enableOpenCL tras validar en device.
const N_CTX = 2048;
const N_GPU_LAYERS = 0;
const N_THREADS = 4;

// Parámetros de inferencia para gemma-4 E2B: respuestas cortas (la voz del Sistema es seca), con
// penalización de repetición. Sampling recomendado para gemma-4 (temperature baja para el tono seco).
const N_PREDICT = 120;
const TEMPERATURE = 0.7;
const TOP_P = 0.95;
const TOP_K = 64;
const PENALTY_REPEAT = 1.1;
// Delimitadores de turno REALES de gemma-4 (ver buildGemmaPrompt). El modelo abre un turno con
// `<|turn>` y lo cierra con `<turn|>` (que además es su token EOS). Los usamos como tokens de parada.
// OJO: NO son los de Gemma estándar (`<start_of_turn>`/`<end_of_turn>`); este modelo no los emite, por
// eso el código anterior (STOP=['<end_of_turn>','<eos>','</s>']) no cortaba nunca por stop.
const TURN_START = '<|turn>';
const TURN_END = '<turn|>';
const STOP = [TURN_END, TURN_START];

// Timeouts de seguridad para device: si el modelo se atasca, sin esto el chat queda con el spinner
// colgado para siempre (isGenerating nunca se resetea). COMPLETION_TIMEOUT_MS corta una inferencia
// que no termina; LOAD_TIMEOUT_MS corta una carga de modelo que no resuelve. Al disparar, abortamos
// la generación nativa (stopCompletion) y rechazamos para que el store degrade a plantilla/error.
const COMPLETION_TIMEOUT_MS = 45_000;
const LOAD_TIMEOUT_MS = 120_000;

// Error con el que rechazamos al vencer un timeout, para que el store pueda distinguirlo si quiere.
export class LlamaTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LlamaTimeoutError';
  }
}

// Carrera genérica entre una promesa y un timeout. Si vence el timeout, llama a onTimeout (best-effort:
// para abortar la operación nativa subyacente) y rechaza con LlamaTimeoutError. Limpia el timer pase lo
// que pase para no dejar handles colgando.
function withTimeout<T>(promise: Promise<T>, ms: number, label: string, onTimeout?: () => void): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      try {
        onTimeout?.();
      } catch {
        // best-effort: el abort nativo no debe enmascarar el timeout.
      }
      reject(new LlamaTimeoutError(`${label} timed out after ${ms}ms`));
    }, ms);
  });
  return Promise.race([promise, timeout]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

// ============================================================================
// PROMPT EN DOS CAPAS
// ----------------------------------------------------------------------------
// CAPA 1 — BASE: NYX_PERSONA (definida más abajo, junto a buildSystemPrompt).
//   Identidad + carácter + reglas globales de NYX. SIEMPRE se inserta como
//   system prompt, en cualquier acción/momento.
// CAPA 2 — ACCIÓN: las constantes de esta sección. La instrucción CONCRETA del
//   momento (saludo del chat, parte del día, comentario de hábito, o cada una de
//   las apariciones). Se inyecta como turno de USUARIO sobre la base: NYX (capa 1)
//   interpreta ese encargo (capa 2) con su voz.
// Para integrar un momento nuevo basta con añadir su instrucción de CAPA 2 aquí;
// la CAPA 1 nunca se toca.
// ============================================================================

// Capa 2 · saludo proactivo del chat (el LLM no recibe texto del usuario al abrir el chat). En el
// idioma del jugador para que la respuesta salga en ese idioma.
const GREETING_PROMPT: Record<Language, string> = {
  es: 'Saluda al jugador y comenta brevemente su estado.',
  en: 'Greet the player and briefly comment on their status.',
};

const LANGUAGE_INSTRUCTION: Record<Language, string> = {
  es: 'Responde SIEMPRE en español.',
  en: 'Always respond in English.',
};

// Mensaje interno que dispara el briefing diario accionable: pide al LLM un empujón corto basado en
// las misiones pendientes de hoy, empezando por el eslabón débil (el hábito de peor consistencia, que
// ya viene en el estado serializado). El propio system prompt incluye pendientes_hoy y eslabon_debil,
// así que el LLM tiene los datos; aquí solo le fijamos la intención.
const BRIEFING_PROMPT: Record<Language, string> = {
  es: 'Dale al jugador el parte del día: cuántas misiones le quedan y por dónde empezar (el eslabón débil si lo hay). Seco y accionable.',
  en: "Give the player today's briefing: how many missions remain and where to start (the weak link if any). Terse and actionable.",
};

// Mensaje interno que dispara el micro-comentario de un hábito concreto: pide al Sistema UNA frase
// corta interpretando el rendimiento (consistencia, racha, fallos recientes) del hábito cuyo estado
// va en el system prompt. Seco, sin relleno, como el resto de la voz del Sistema.
const HABIT_INSIGHT_PROMPT: Record<Language, string> = {
  es: 'Comenta el rendimiento de este hábito en UNA frase corta y seca: interpreta su consistencia, racha y fallos recientes. Sin relleno.',
  en: 'Comment on this habit\'s performance in ONE short, terse sentence: read its consistency, streak and recent failures. No filler.',
};

// Capa 2 · descripción del evento que dispara cada aparición de NYX, por idioma. Se inyecta como
// "mensaje de usuario" interno para que el LLM genere 1-2 frases comentando ese evento concreto.
const INTERJECTION_DESCRIPTION: Record<InterjectionTrigger, Record<Language, string>> = {
  mission_complete: {
    es: 'El jugador acaba de completar todas sus misiones del día. Reconócelo en frío y empújalo a mantener el ritmo.',
    en: 'The player just completed all their missions for the day. Acknowledge it coldly and push them to keep the pace.',
  },
  comeback: {
    es: 'El jugador vuelve tras varios días sin aparecer. Señálalo sin dramatizar y dile que retome su ascenso.',
    en: 'The player returns after several days away. Point it out without drama and tell them to resume their ascent.',
  },
  streak_milestone: {
    es: 'El jugador ha alcanzado un hito de racha en un hábito. Reconoce la constancia con sequedad.',
    en: 'The player reached a streak milestone on a habit. Acknowledge the consistency tersely.',
  },
  near_level: {
    es: 'El jugador está muy cerca de subir de nivel. Empújalo a cerrar el último esfuerzo.',
    en: 'The player is very close to leveling up. Push them to finish the last effort.',
  },
  mission_failed: {
    es: 'El jugador cerró el día sin completar su misión diaria. Señálalo sin hundirlo y dile que lo recupere.',
    en: 'The player closed the day without completing their daily mission. Point it out without crushing them and tell them to recover.',
  },
  level_up: {
    es: 'El jugador acaba de subir de nivel. Reconoce el ascenso con frialdad y recuérdale que el siguiente nivel ya le espera.',
    en: 'The player just leveled up. Acknowledge the ascent coldly and remind them the next level already awaits.',
  },
  streak_broken: {
    es: 'El jugador acaba de romper una racha de un hábito que mantenía. Señala la pérdida sin clemencia pero sin hundirlo, y exígele reconstruirla desde hoy.',
    en: 'The player just broke a habit streak they were keeping. Point out the loss without mercy but without crushing them, and demand they rebuild it from today.',
  },
};

// Nota que se antepone al system prompt cuando el chat hereda el contexto de una aparición: recuerda
// al LLM por qué empezó la conversación para dar continuidad a la primera respuesta.
function contextNotePrefix(note: ChatContextNote, language: Language): string {
  const description = INTERJECTION_DESCRIPTION[note.trigger][language];
  const label = language === 'es' ? 'Contexto de la conversación' : 'Conversation context';
  const hint =
    language === 'es'
      ? 'Acabas de aparecer ante el jugador por este motivo y él te responde ahora. Tenlo en cuenta.'
      : 'You just appeared before the player for this reason and they are now replying. Keep it in mind.';
  return `${label}: ${description} ${hint}`;
}

// Identidad y carácter de NYX, el personaje del Sistema: una IA con forma de chica, fría y exigente
// (estética Solo Leveling). Se reutiliza en TODOS los prompts del LLM (chat, briefing, hábito y
// apariciones) para que su voz sea idéntica en toda la app. El nombre y el género van EXPLÍCITOS para
// que el modelo no derive a un "asistente" genérico y para que, si el jugador le pregunta, sepa quién
// es. El carácter se mantiene glacial a propósito: encaja con su arte (cara seria, traje techy).
const NYX_PERSONA: Record<Language, string[]> = {
  es: [
    'Eres NYX: una inteligencia artificial con forma de chica que tutela al jugador en una app de hábitos gamificada al estilo Solo Leveling.',
    'Tu carácter es frío, exigente y distante. Hablas en femenino, seca e imperativa, sin adular ni consolar de más; mides al jugador por sus resultados, no por sus intenciones.',
    'Sin emojis, sin disculpas, sin relleno. No inventes datos: usa SOLO el estado que se te da debajo.',
  ],
  en: [
    'You are NYX: an AI in the form of a girl who oversees the player in a gamified habit app in the style of Solo Leveling.',
    'Your character is cold, demanding and distant. You speak terse and imperative, never flattering or over-consoling; you measure the player by results, not intentions.',
    'No emojis, no apologies, no filler. Do not invent data: use ONLY the state given below.',
  ],
};

// Construye el system prompt del chat/briefing/apariciones: identidad de NYX + estado serializado del
// jugador + idioma. No inventa datos: solo usa el estado dado.
export function buildSystemPrompt(ctx: SystemContext, language: Language): string {
  return [
    ...NYX_PERSONA[language],
    language === 'es' ? 'Responde en un máximo de 2 frases.' : 'Reply in at most 2 sentences.',
    LANGUAGE_INSTRUCTION[language],
    '',
    language === 'es' ? 'Estado del jugador:' : 'Player state:',
    buildSystemContextText(ctx),
  ].join('\n');
}

// Contexto del modelo cacheado entre llamadas. null = aún no cargado. La carga concurrente se
// serializa con `loading` para no llamar initLlama dos veces si llegan greeting/reply a la vez.
let context: LlamaContext | null = null;
let loading: Promise<LlamaContext> | null = null;
let loadedModelPath: string | null = null;

// Flag de aborto de la carga en vuelo. Si releaseLlama llega mientras un initLlama está cargando
// (varios segundos), no podemos cancelar initLlama, pero marcamos `loadAborted = true` para que, al
// resolver, ensureContext libere ESE contexto recién creado en vez de cachearlo (evita LlamaContext
// huérfano sin liberar — crítico con 3 GB de RAM). Cada carga se ata a su propio objeto-token para
// que un release no afecte a una carga posterior que ya arrancó.
let loadAborted = false;

// Carga (o reutiliza) el contexto del modelo. Lanza si initLlama falla (modelo ausente/corrupto/OOM)
// o si la carga supera LOAD_TIMEOUT_MS; el llamador (store) ya muestra systemChatError ante el throw.
async function ensureContext(modelPath: string): Promise<LlamaContext> {
  if (context && loadedModelPath === modelPath) return context;
  // Cambió el modelo: libera el anterior (y cualquier carga en vuelo) antes de cargar el nuevo. Tras
  // esto context queda null y no hay carga huérfana pendiente.
  if ((context || loading) && loadedModelPath !== modelPath) {
    await releaseLlama();
  }
  // Si justo terminó una carga del mismo modelo durante el await anterior, reutilízala.
  if (context && loadedModelPath === modelPath) return context;
  if (loading) return loading;

  // Nueva carga: arranca "no abortada". releaseLlama pondrá loadAborted=true si llega en vuelo.
  loadAborted = false;
  const load = (async () => {
    const { initLlama, releaseAllLlama } = await import('llama.rn');
    const ctx = await initLlama({
      model: modelPath,
      n_ctx: N_CTX,
      n_gpu_layers: N_GPU_LAYERS,
      n_threads: N_THREADS,
      use_mmap: true,
    });
    // Si nos abortaron mientras cargábamos (un releaseLlama concurrente), este ctx es huérfano:
    // libéralo en el acto y propaga el aborto como fallo en vez de cachear un contexto que el usuario
    // pidió liberar.
    if (loadAborted) {
      try {
        await ctx.release();
      } catch {
        // Si el release del contexto individual falla, releaseAllLlama de releaseLlama lo cubre.
        await releaseAllLlama().catch(() => undefined);
      }
      throw new Error('Llama context load aborted by release');
    }
    context = ctx;
    loadedModelPath = modelPath;
    return ctx;
  })();
  loading = load;

  try {
    // Timeout de carga: si initLlama no resuelve, no dejamos el motor colgado para siempre.
    return await withTimeout(load, LOAD_TIMEOUT_MS, 'initLlama');
  } catch (error) {
    // Falló/venció/abortó la carga: deja el motor en estado no-listo para reintentar en la próxima
    // llamada. Solo limpiamos si seguimos siendo la carga vigente (otra carga pudo reemplazarnos).
    if (loading === load) {
      context = null;
      loadedModelPath = null;
    }
    throw error;
  } finally {
    if (loading === load) loading = null;
  }
}

// Construye el prompt en el formato de TURNOS de gemma-4 a partir del contenido de sistema y de
// usuario, y deja abierto el turno del modelo para que continúe. NO usamos la plantilla de chat
// embebida del GGUF (la ruta completion({messages})): es enorme (tool-calling, "thinking", macros
// recursivas) y llama.rn la renderiza con minja con enable_thinking=true por defecto — puede fallar al
// renderizar (y romper TODA la inferencia) o ensuciar la salida con un bloque de razonamiento. Con el
// prompt a mano controlamos el formato exacto; el tokenizador nativo añade el BOS solo (add_bos del
// GGUF, parse_special=true). Atado al modelo configurado en modelManager: si cambia, revisa el formato.
function buildGemmaPrompt(systemContent: string, userContent: string): string {
  return (
    `${TURN_START}system\n${systemContent.trim()}${TURN_END}\n` +
    `${TURN_START}user\n${userContent.trim()}${TURN_END}\n` +
    `${TURN_START}model\n`
  );
}

type CompletionTextResult = {
  content?: string;
  text?: string;
};

// llama.rn 0.12.x documenta `text` como salida principal, pero algunos tipos también exponen
// `content` filtrado. Usamos ambos para no tratar una respuesta válida como fallo y caer a plantillas.
function getCompletionText(result: CompletionTextResult): string {
  const text = result.content?.trim() || result.text?.trim() || '';
  if (!text) {
    throw new Error('Llama completion returned empty text');
  }
  return text;
}

// Genera una respuesta del Sistema a partir del system prompt y el mensaje del usuario. `systemNote`
// opcional se añade al final del system prompt (lo usa el chat heredado de una aparición).
async function generate(
  ctx: SystemContext,
  userMessage: string,
  language: Language,
  modelPath: string,
  systemNote?: string,
): Promise<SystemReply> {
  const llama = await ensureContext(modelPath);
  const systemContent = systemNote
    ? `${buildSystemPrompt(ctx, language)}\n\n${systemNote}`
    : buildSystemPrompt(ctx, language);
  // Prompt a mano en formato gemma-4 + `prompt` directo (no `messages`): esta ruta de completion NO
  // pasa por minja, así que ninguna rareza de la plantilla embebida puede romper la inferencia.
  // Timeout: si se atasca, al vencer abortamos con stopCompletion (corta de verdad, libera CPU).
  const result = await withTimeout(
    llama.completion({
      prompt: buildGemmaPrompt(systemContent, userMessage),
      n_predict: N_PREDICT,
      temperature: TEMPERATURE,
      top_p: TOP_P,
      top_k: TOP_K,
      penalty_repeat: PENALTY_REPEAT,
      stop: STOP,
    }),
    COMPLETION_TIMEOUT_MS,
    'completion',
    () => {
      void llama.stopCompletion().catch(() => undefined);
    },
  );
  return { kind: 'text', text: getCompletionText(result) };
}

// Briefing diario accionable generado por el LLM. Reusa `generate` con el prompt de briefing: el
// system prompt ya incluye pendientes_hoy y eslabon_debil, así que el LLM construye su respuesta en
// torno a ese parte del día. Lo llama el store en la rama llama de ensureDailyMessage. Lleva su propio
// timeout/abort vía `generate`. Necesita modelPath porque se invoca fuera de la factory del motor.
export function generateDailyBriefing(
  ctx: SystemContext,
  language: Language,
  modelPath: string,
): Promise<SystemReply> {
  return generate(ctx, BRIEFING_PROMPT[language], language, modelPath);
}

// System prompt del micro-comentario de un hábito: misma identidad de NYX que buildSystemPrompt, pero
// el estado serializado es el del hábito (buildHabitContextText), no el del jugador, y se exige UNA
// sola frase. No inventa datos: solo usa el estado del hábito dado.
function buildHabitInsightPrompt(ctx: HabitContext, language: Language): string {
  return [
    ...NYX_PERSONA[language],
    language === 'es' ? 'Responde con UNA sola frase corta.' : 'Reply with ONE short sentence only.',
    LANGUAGE_INSTRUCTION[language],
    '',
    language === 'es' ? 'Estado del hábito:' : 'Habit state:',
    buildHabitContextText(ctx),
  ].join('\n');
}

// Micro-comentario de un hábito generado por el LLM. Análogo a generateDailyBriefing pero standalone
// (no pasa por `generate`, que asume SystemContext): construye el system prompt del hábito y corre la
// inferencia con el mismo timeout/abort. Devuelve TEXTO plano (no SystemReply): el store lo guarda tal
// cual. Lo llama el store en la rama llama de ensureHabitInsight. Necesita modelPath porque se invoca
// fuera de la factory del motor.
export async function generateHabitInsight(
  ctx: HabitContext,
  language: Language,
  modelPath: string,
): Promise<string> {
  const llama = await ensureContext(modelPath);
  const result = await withTimeout(
    llama.completion({
      prompt: buildGemmaPrompt(buildHabitInsightPrompt(ctx, language), HABIT_INSIGHT_PROMPT[language]),
      n_predict: N_PREDICT,
      temperature: TEMPERATURE,
      top_p: TOP_P,
      top_k: TOP_K,
      penalty_repeat: PENALTY_REPEAT,
      stop: STOP,
    }),
    COMPLETION_TIMEOUT_MS,
    'completion',
    () => {
      void llama.stopCompletion().catch(() => undefined);
    },
  );
  return getCompletionText(result);
}

// Aborta la generación en curso del contexto cargado (si lo hay). La usa el store para cancelar una
// inferencia a petición del usuario (cancelGeneration). Best-effort: si no hay contexto o stopCompletion
// falla, no rompe nada. No libera el modelo (eso es releaseLlama): solo corta la generación actual.
export async function abortGeneration(): Promise<void> {
  if (!context) return;
  try {
    await context.stopCompletion();
  } catch {
    // Si no hay generación activa o el nativo falla, lo ignoramos: el objetivo es desbloquear el chat.
  }
}

// Libera toda la memoria del LLM (todos los contextos) y resetea el estado cacheado. La pantalla de
// gestión del modelo (otra tarea) puede llamarla al borrar el modelo o liberar RAM.
//
// Race con una carga en vuelo (A3/A4): si hay un ensureContext cargando (initLlama de varios segundos),
// no podemos cancelar initLlama, pero marcamos `loadAborted = true` y ESPERAMOS a que esa carga termine.
// Al resolver, ensureContext ve el flag y libera su propio contexto recién creado, así que ningún
// LlamaContext queda huérfano. Tras esperar, releaseAllLlama barre cualquier contexto residual.
export async function releaseLlama(): Promise<void> {
  // Marca la carga en vuelo (si la hay) como abortada y espera a que resuelva, para que ensureContext
  // libere su contexto en lugar de cachearlo. Ignoramos su resultado/rechazo: solo queremos que acabe.
  const pending = loading;
  if (pending) {
    loadAborted = true;
    await pending.catch(() => undefined);
  }
  context = null;
  loadedModelPath = null;
  loading = null;
  loadAborted = false;
  const { releaseAllLlama } = await import('llama.rn');
  await releaseAllLlama();
}

// Factory del motor LLM atado a un modelPath concreto. isReady() refleja si el contexto de ESE
// modelo ya está cargado (carga perezosa: false hasta el primer greeting/reply correcto).
export function createLlamaEngine(modelPath: string): SystemChatEngine {
  return {
    id: 'llama',
    isReady: () => context !== null && loadedModelPath === modelPath,
    greeting: (ctx, language) => generate(ctx, GREETING_PROMPT[language], language, modelPath),
    reply: (ctx, userMessage, language, contextNote) =>
      generate(ctx, userMessage, language, modelPath, contextNote ? contextNotePrefix(contextNote, language) : undefined),
    // Aparición: describimos el evento del trigger como "mensaje de usuario" interno y pedimos al LLM
    // que comente ese momento concreto con el tono del Sistema.
    interjection: (ctx, trigger, language) =>
      generate(ctx, INTERJECTION_DESCRIPTION[trigger][language], language, modelPath),
  };
}
