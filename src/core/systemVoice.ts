// Voz del Sistema: decide QUÉ dice el Sistema según el contexto. Módulo PURO y testeable, sin
// imports de RN/db/i18n como valor. Devuelve una respuesta ABSTRACTA (clave i18n + params), así el
// bilingüismo vive en i18n y el motor/core nunca traduce. Motor de reglas, no LLM: la intención del
// usuario se detecta por palabras clave normalizadas (sin tildes, minúsculas) en ES/EN.

import type { SystemContext } from './aiContext';

// Respuesta de un motor del chat. Union discriminada por `kind`:
// - 'key': clave i18n abstracta + params, que el store resuelve con t(language, key, params). La usa
//   el motor por plantillas (determinista, bilingüe vía i18n).
// - 'text': texto libre ya en el idioma correcto, que el store usa tal cual. La usa el motor LLM, que
//   genera lenguaje natural y no claves abstractas.
export type SystemReply =
  | { kind: 'key'; key: string; params?: Record<string, string | number> }
  | { kind: 'text'; text: string };

// Apariciones del Sistema: eventos del juego en los que el Sistema "salta" de forma autónoma con un
// mensaje contextual (no responde a un mensaje del usuario, aparece solo).
export type InterjectionTrigger =
  | 'mission_complete' // completó la misión diaria
  | 'comeback' // vuelve tras ausencia
  | 'streak_milestone' // racha de hábito alcanza un hito (7/30)
  | 'near_level' // muy cerca de subir de nivel
  | 'mission_failed'; // cerró el día sin completar la misión

// Tono de la aparición, que la UI del personaje (otra tarea) usa para elegir la pose.
export type InterjectionTone = 'celebrate' | 'serious' | 'neutral';

export interface SystemInterjection {
  reply: SystemReply;
  tone: InterjectionTone;
}

// Params comunes del estado, reutilizados por casi todas las frases.
function statusParams(ctx: SystemContext): Record<string, string | number> {
  return {
    nombre: ctx.nombre ?? '',
    nivel: ctx.nivel,
    rango: ctx.rango,
    esencia: ctx.esencia,
    n: ctx.pendientesHoy,
    racha: ctx.rachaMisiones,
  };
}

// Índice determinista para rotar entre variantes sin Math.random (rompería tests y resume). Deriva
// de señales del contexto (+ longitud opcional del mensaje) para dar variedad estable: el mismo
// estado produce siempre la misma variante.
function variantIndex(ctx: SystemContext, total: number, extra = 0): number {
  const seed = ctx.completadosHoy + ctx.pendientesHoy + ctx.falladosHoy + ctx.nivel + extra;
  return ((seed % total) + total) % total;
}

// Elige la variante `prefix_1..prefix_N` según el índice determinista.
function pick(prefix: string, total: number, ctx: SystemContext, extra = 0): string {
  return `${prefix}_${variantIndex(ctx, total, extra) + 1}`;
}

// Envuelve clave + params en la variante 'key' del union SystemReply.
function keyReply(key: string, params?: Record<string, string | number>): SystemReply {
  return { kind: 'key', key, params };
}

// Saludo proactivo de apertura del chat, por prioridad de reglas. La primera condición que se
// cumple gana, de mayor a menor urgencia.
export function getSystemGreeting(ctx: SystemContext): SystemReply {
  const params = statusParams(ctx);

  // 1) Hay misiones pendientes hoy → empuja.
  if (ctx.pendientesHoy > 0) {
    return keyReply(pick('sys_pending', 2, ctx), params);
  }

  // 2) Día perfecto (hay hábitos hoy y todos completados, sin fallos) → reconoce.
  if (ctx.diaPerfecto) {
    return keyReply(pick('sys_perfect', 2, ctx), params);
  }

  // 3) Falló algo hoy → señala sin dramatizar.
  if (ctx.falladosHoy > 0) {
    return keyReply(pick('sys_failed', 2, ctx), params);
  }

  // 4) Cerca de subir de nivel → motiva.
  if (ctx.ratioNivel >= 0.8) {
    return keyReply(pick('sys_near_level', 2, ctx), { ...params, falta: ctx.faltaParaNivel });
  }

  // 5) Racha de misiones alta → felicita en frío.
  if (ctx.rachaMisiones >= 3) {
    return keyReply(pick('sys_streak', 2, ctx), params);
  }

  // 6) Nada destacable → saludo de estado con nivel/rango.
  return keyReply(pick('sys_greet_state', 2, ctx), params);
}

type Intent = 'hello' | 'status' | 'help' | 'thanks' | 'motivate' | 'unknown';

// Palabras clave por intención, ya normalizadas (sin tildes, minúsculas), ES y EN juntas. Las de
// una sola palabra se buscan por token exacto (evita falsos positivos como 'hi' dentro de
// "history"); las multi-palabra (con espacio) se buscan como substring sobre el mensaje.
const INTENT_KEYWORDS: Array<{ intent: Intent; words: string[] }> = [
  { intent: 'thanks', words: ['gracias', 'thanks', 'thank you', 'thx'] },
  { intent: 'help', words: ['ayuda', 'help', 'que hago', 'what do i do', 'what should', 'que debo'] },
  { intent: 'status', words: ['como voy', 'estado', 'progreso', 'status', 'how am i', 'progress'] },
  { intent: 'motivate', words: ['animo', 'animame', 'motiva', 'motivate', 'motivation', 'motivame'] },
  { intent: 'hello', words: ['hola', 'buenas', 'hey', 'hello', 'hi', 'holaa'] },
];

// Quita tildes/diacríticos y baja a minúsculas para comparar sin depender de acentos.
export function normalizeMessage(message: string): string {
  return message
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();
}

// Detecta la intención del mensaje del usuario por palabras clave. El orden de INTENT_KEYWORDS fija
// la prioridad si varias coinciden (agradecimiento > ayuda > estado > motivación > saludo).
export function detectIntent(message: string): Intent {
  const normalized = normalizeMessage(message);
  if (!normalized) return 'unknown';
  // Tokenizamos en palabras (separadas por cualquier no-alfanumérico) para comparar keywords de una
  // sola palabra por coincidencia exacta de token, en vez de substring.
  const tokens = new Set(normalized.split(/[^a-z0-9]+/).filter(Boolean));
  for (const { intent, words } of INTENT_KEYWORDS) {
    const matched = words.some((word) =>
      word.includes(' ') ? normalized.includes(word) : tokens.has(word),
    );
    if (matched) return intent;
  }
  return 'unknown';
}

// Responde al mensaje del usuario. Cada intención elige una frase contextual; la variante se rota de
// forma determinista usando también la longitud del mensaje para variar entre repeticiones.
export function getSystemReply(ctx: SystemContext, userMessage: string): SystemReply {
  const intent = detectIntent(userMessage);
  const extra = userMessage.length;
  const params = statusParams(ctx);

  switch (intent) {
    case 'hello':
      return keyReply(pick('sys_reply_hello', 2, ctx, extra), params);
    case 'status':
      return keyReply(pick('sys_reply_status', 2, ctx, extra), { ...params, completados: ctx.completadosHoy, falta: ctx.faltaParaNivel });
    case 'help':
      return keyReply(pick('sys_reply_help', 2, ctx, extra), params);
    case 'thanks':
      return keyReply(pick('sys_reply_thanks', 2, ctx, extra), params);
    case 'motivate':
      return keyReply(pick('sys_reply_motivate', 2, ctx, extra), params);
    case 'unknown':
    default:
      // No reconoce intención: comenta el estado. Si hay algo destacable, reutiliza el saludo
      // proactivo; si no, responde con la variante "no entiendo, pero el Sistema observa".
      if (ctx.pendientesHoy > 0 || ctx.diaPerfecto || ctx.falladosHoy > 0) {
        return getSystemGreeting(ctx);
      }
      return keyReply(pick('sys_reply_unknown', 2, ctx, extra), params);
  }
}

// Tono de cada trigger, para que la UI del personaje elija la pose. Mapa fijo y exhaustivo: si se
// añade un trigger, TypeScript obliga a darle tono aquí.
const INTERJECTION_TONE: Record<InterjectionTrigger, InterjectionTone> = {
  mission_complete: 'celebrate',
  streak_milestone: 'celebrate',
  mission_failed: 'serious',
  comeback: 'neutral',
  near_level: 'neutral',
};

export function getInterjectionTone(trigger: InterjectionTrigger): InterjectionTone {
  return INTERJECTION_TONE[trigger];
}

// Prefijo de clave i18n por trigger. Cada uno tiene 2 variantes deterministas (`_1` / `_2`) que se
// rotan con el mismo índice del contexto que usa el resto de la voz (sin Math.random: estable y
// testeable).
const INTERJECTION_KEY_PREFIX: Record<InterjectionTrigger, string> = {
  mission_complete: 'sys_int_mission_complete',
  comeback: 'sys_int_comeback',
  streak_milestone: 'sys_int_streak',
  near_level: 'sys_int_near_level',
  mission_failed: 'sys_int_mission_failed',
};

// Frase de una aparición del Sistema según el trigger. Devuelve { kind: 'key' } como el resto del
// core; el store traduce con i18n en el idioma activo. Interpola nombre/nivel/racha/falta según el
// trigger (el set de params es superset: i18n solo usa los que aparecen en la plantilla).
export function getSystemInterjection(ctx: SystemContext, trigger: InterjectionTrigger): SystemReply {
  const params = {
    ...statusParams(ctx),
    falta: ctx.faltaParaNivel,
    mejorRacha: ctx.mejorRachaHabito,
    completados: ctx.completadosHoy,
  };
  return keyReply(pick(INTERJECTION_KEY_PREFIX[trigger], 2, ctx), params);
}
