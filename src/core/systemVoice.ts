// Voz del Sistema: decide QUÉ dice el Sistema según el contexto. Módulo PURO y testeable, sin
// imports de RN/db/i18n como valor. Devuelve una respuesta ABSTRACTA (clave i18n + params), así el
// bilingüismo vive en i18n y el motor/core nunca traduce. Motor de reglas, no LLM: la intención del
// usuario se detecta por palabras clave normalizadas (sin tildes, minúsculas) en ES/EN.

import type { SystemContext } from './aiContext';

export type SystemReply = { key: string; params?: Record<string, string | number> };

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

// Saludo proactivo de apertura del chat, por prioridad de reglas. La primera condición que se
// cumple gana, de mayor a menor urgencia.
export function getSystemGreeting(ctx: SystemContext): SystemReply {
  const params = statusParams(ctx);

  // 1) Hay misiones pendientes hoy → empuja.
  if (ctx.pendientesHoy > 0) {
    return { key: pick('sys_pending', 2, ctx), params };
  }

  // 2) Día perfecto (hay hábitos hoy y todos completados, sin fallos) → reconoce.
  if (ctx.diaPerfecto) {
    return { key: pick('sys_perfect', 2, ctx), params };
  }

  // 3) Falló algo hoy → señala sin dramatizar.
  if (ctx.falladosHoy > 0) {
    return { key: pick('sys_failed', 2, ctx), params };
  }

  // 4) Cerca de subir de nivel → motiva.
  if (ctx.ratioNivel >= 0.8) {
    return { key: pick('sys_near_level', 2, ctx), params: { ...params, falta: ctx.faltaParaNivel } };
  }

  // 5) Racha de misiones alta → felicita en frío.
  if (ctx.rachaMisiones >= 3) {
    return { key: pick('sys_streak', 2, ctx), params };
  }

  // 6) Nada destacable → saludo de estado con nivel/rango.
  return { key: pick('sys_greet_state', 2, ctx), params };
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
      return { key: pick('sys_reply_hello', 2, ctx, extra), params };
    case 'status':
      return { key: pick('sys_reply_status', 2, ctx, extra), params: { ...params, completados: ctx.completadosHoy, falta: ctx.faltaParaNivel } };
    case 'help':
      return { key: pick('sys_reply_help', 2, ctx, extra), params };
    case 'thanks':
      return { key: pick('sys_reply_thanks', 2, ctx, extra), params };
    case 'motivate':
      return { key: pick('sys_reply_motivate', 2, ctx, extra), params };
    case 'unknown':
    default:
      // No reconoce intención: comenta el estado. Si hay algo destacable, reutiliza el saludo
      // proactivo; si no, responde con la variante "no entiendo, pero el Sistema observa".
      if (ctx.pendientesHoy > 0 || ctx.diaPerfecto || ctx.falladosHoy > 0) {
        return getSystemGreeting(ctx);
      }
      return { key: pick('sys_reply_unknown', 2, ctx, extra), params };
  }
}
