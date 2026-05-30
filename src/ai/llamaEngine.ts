// Motor LLM local sobre llama.rn (nativo). Genera TEXTO libre ya en el idioma del prompt (no claves
// i18n), así que devuelve { kind: 'text' }. El modelo se carga PEREZOSAMENTE: la primera llamada a
// greeting/reply hace initLlama y cachea el LlamaContext; las siguientes reutilizan el contexto.
//
// IMPORTANTE (web/lazy): llama.rn es un módulo NATIVO que no existe en web ni en Expo Go. Aquí solo
// importamos sus TIPOS de forma estática (`import type`, se borra al compilar y nunca entra en el
// bundle). El valor del módulo se carga con `import('llama.rn')` dinámico DENTRO de la factory, y
// solo cuando de verdad se va a inferir. El selector (ai/index) además solo construye este motor en
// nativo con modelo listo, así que ni la web ni el flujo de plantillas arrastran llama.rn.

import { buildSystemContextText } from '@/core/aiContext';
import type { Language } from '@/i18n';
import type { SystemContext } from '@/core/aiContext';
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

// Parámetros de inferencia para Gemma 4 E2B: respuestas cortas (la voz del Sistema es seca), con
// penalización de repetición y tokens de parada de Gemma/genéricos para cortar limpio. Sampling
// recomendado para Gemma 4 (temperature baja para el tono seco, top_p/top_k del modelo).
const N_PREDICT = 120;
const TEMPERATURE = 0.7;
const TOP_P = 0.95;
const TOP_K = 64;
const PENALTY_REPEAT = 1.1;
const STOP = ['<end_of_turn>', '<eos>', '</s>'];

// Mensaje interno que dispara el saludo proactivo (el LLM no recibe texto del usuario al abrir el
// chat). En el idioma del jugador para que la respuesta salga en ese idioma.
const GREETING_PROMPT: Record<Language, string> = {
  es: 'Saluda al jugador y comenta brevemente su estado.',
  en: 'Greet the player and briefly comment on their status.',
};

const LANGUAGE_INSTRUCTION: Record<Language, string> = {
  es: 'Responde SIEMPRE en español.',
  en: 'Always respond in English.',
};

// Descripción del evento que dispara cada aparición del Sistema, por idioma. Se inyecta como
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

// Construye el system prompt: tono de "EL SISTEMA" + estado serializado del jugador + idioma. No
// inventa datos: solo usa el estado dado.
export function buildSystemPrompt(ctx: SystemContext, language: Language): string {
  const persona =
    language === 'es'
      ? [
          'Eres EL SISTEMA de una app de hábitos gamificada al estilo Solo Leveling.',
          'Hablas seco, imperativo y directo. Máximo 2 frases. Sin emojis, sin disculpas, sin relleno.',
          'No inventes datos: usa SOLO el estado del jugador que se te da debajo.',
        ]
      : [
          'You are THE SYSTEM of a gamified habit app in the style of Solo Leveling.',
          'You speak terse, imperative and direct. Maximum 2 sentences. No emojis, no apologies, no filler.',
          'Do not invent data: use ONLY the player state given below.',
        ];
  return [
    ...persona,
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

// Carga (o reutiliza) el contexto del modelo. Lanza si initLlama falla (modelo ausente/corrupto/OOM);
// el llamador (store) ya muestra systemChatError ante el throw.
async function ensureContext(modelPath: string): Promise<LlamaContext> {
  if (context && loadedModelPath === modelPath) return context;
  // Cambió el modelo: libera el anterior antes de cargar el nuevo.
  if (context && loadedModelPath !== modelPath) {
    await releaseLlama();
  }
  if (loading) return loading;

  loading = (async () => {
    const { initLlama } = await import('llama.rn');
    const ctx = await initLlama({
      model: modelPath,
      n_ctx: N_CTX,
      n_gpu_layers: N_GPU_LAYERS,
      n_threads: N_THREADS,
      use_mmap: true,
    });
    context = ctx;
    loadedModelPath = modelPath;
    return ctx;
  })();

  try {
    return await loading;
  } catch (error) {
    // Falló la carga: deja el motor en estado no-listo para reintentar en la próxima llamada.
    context = null;
    loadedModelPath = null;
    throw error;
  } finally {
    loading = null;
  }
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
  const result = await llama.completion({
    messages: [
      { role: 'system', content: systemContent },
      { role: 'user', content: userMessage },
    ],
    n_predict: N_PREDICT,
    temperature: TEMPERATURE,
    top_p: TOP_P,
    top_k: TOP_K,
    penalty_repeat: PENALTY_REPEAT,
    stop: STOP,
  });
  return { kind: 'text', text: result.content.trim() };
}

// Libera toda la memoria del LLM (todos los contextos) y resetea el estado cacheado. La pantalla de
// gestión del modelo (otra tarea) puede llamarla al borrar el modelo o liberar RAM.
export async function releaseLlama(): Promise<void> {
  context = null;
  loadedModelPath = null;
  loading = null;
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
