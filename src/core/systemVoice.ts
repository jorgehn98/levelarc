// Voz del Sistema: decide QUÉ dice el Sistema según el contexto. Módulo PURO y testeable, sin
// imports de RN/db/i18n como valor. Devuelve una respuesta ABSTRACTA (clave i18n + params), así el
// bilingüismo vive en i18n y el motor/core nunca traduce. Motor de reglas, no LLM: la intención del
// usuario se detecta por palabras clave normalizadas (sin tildes, minúsculas) en ES/EN.

import type { HabitContext, SystemContext } from './aiContext';

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
  | 'mission_failed' // cerró el día sin completar la misión
  | 'level_up' // subió de nivel (mismo rango: el ascenso de rango ya tiene su cinemática)
  | 'streak_broken'; // rompió una racha de hábito que merecía la pena (feedback inmediato al fallar)

// Tono de la aparición, que la UI del personaje (otra tarea) usa para elegir la pose.
export type InterjectionTone = 'celebrate' | 'serious' | 'neutral';

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

// Situación del día, de la que depende qué puede decir el Sistema sin inventar nada:
//  - 'no_habits': el jugador aún no ha registrado ningún hábito.
//  - 'rest': tiene hábitos, pero ninguno programado hoy.
//  - 'pending': quedan misiones por hacer hoy.
//  - 'done': todo lo de hoy está completado.
//  - 'failed': no queda nada pendiente y hubo algún fallo.
type DayState = 'no_habits' | 'rest' | 'pending' | 'done' | 'failed';

export function getDayState(ctx: SystemContext): DayState {
  if (ctx.pendientesHoy > 0) return 'pending';
  if (ctx.habitosHoyTotal === 0) return ctx.habitosActivos === 0 ? 'no_habits' : 'rest';
  return ctx.falladosHoy > 0 ? 'failed' : 'done';
}

// Firma gruesa del estado del día para decidir si un mensaje ya generado sigue valiendo. Incluye el
// número de pendientes porque el texto suele citarlo; no incluye nada más para que el LLM no se
// reejecute por cambios que no alteran lo que diría (progreso parcial de un contable, esencia, XP).
export function getDailyStateSignature(ctx: SystemContext): string {
  return `${getDayState(ctx)}:${ctx.pendientesHoy}`;
}

// Mensaje del día (banner de Hoy) según la situación. Con pendientes es un briefing accionable: si
// conocemos el eslabón débil dice por dónde empezar; si no, degrada al empujón genérico. Sin
// pendientes NUNCA habla de "misiones pendientes": invita a crear la primera, reconoce el descanso o
// cierra el día. Determinista: misma entrada, misma clave.
export function getDailyBriefing(ctx: SystemContext): SystemReply {
  const params = statusParams(ctx);
  switch (getDayState(ctx)) {
    case 'no_habits':
      return keyReply(pick('sys_no_habits', 2, ctx), params);
    case 'rest':
      return keyReply(pick('sys_rest_day', 2, ctx), params);
    case 'done':
      return keyReply(pick('sys_perfect', 2, ctx), params);
    case 'failed':
      return keyReply(pick('sys_failed', 2, ctx), params);
    case 'pending':
      break;
  }
  // Una sola misión: frase en singular (las genéricas dirían "1 misiones").
  if (ctx.pendientesHoy === 1) return keyReply('sys_pending_one', params);
  if (ctx.eslabonDebil) {
    return keyReply(pick('sys_briefing', 2, ctx), {
      ...params,
      eslabon: ctx.eslabonDebil.nombre,
      ratioEslabon: Math.round(ctx.eslabonDebil.ratio * 100),
    });
  }
  return keyReply(pick('sys_pending', 2, ctx), params);
}

// Saludo proactivo de apertura del chat, por prioridad de reglas. La primera condición que se
// cumple gana, de mayor a menor urgencia.
export function getSystemGreeting(ctx: SystemContext): SystemReply {
  const params = statusParams(ctx);

  // 0) Sin ningún hábito registrado → lo único útil es invitar a crear el primero.
  if (getDayState(ctx) === 'no_habits') {
    return getDailyBriefing(ctx);
  }

  // 1) Hay misiones pendientes hoy → briefing accionable (empieza por el eslabón débil si lo hay).
  if (ctx.pendientesHoy > 0) {
    return getDailyBriefing(ctx);
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

type Intent = 'hello' | 'status' | 'help' | 'ideas' | 'tone' | 'completed' | 'thanks' | 'motivate' | 'unknown';

// Palabras clave por intención, ya normalizadas (sin tildes, minúsculas), ES y EN juntas. Las de
// una sola palabra se buscan por token exacto (evita falsos positivos como 'hi' dentro de
// "history"); las multi-palabra (con espacio) se buscan como substring sobre el mensaje.
const INTENT_KEYWORDS: { intent: Intent; words: string[] }[] = [
  { intent: 'thanks', words: ['gracias', 'thanks', 'thank you', 'thx'] },
  {
    intent: 'ideas',
    words: [
      'idea',
      'ideas',
      'sugerencia',
      'sugerencias',
      'ejemplo',
      'ejemplos',
      'no se me ocurren',
      'que anada',
      'anadir',
      'crear habitos',
      'mas habitos',
      'habit ideas',
      'suggestions',
    ],
  },
  {
    intent: 'tone',
    words: ['dura', 'duro', 'borde', 'seca', 'seco', 'amable', 'suave', 'no seas', 'demasiado', 'hard on me', 'too harsh'],
  },
  {
    intent: 'completed',
    words: ['ya esta', 'ya acabe', 'acabe', 'termine', 'hecho', 'completado', 'done', 'finished'],
  },
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
    case 'ideas':
      return keyReply(pick('sys_reply_ideas', 3, ctx, extra), params);
    case 'tone':
      return keyReply(pick('sys_reply_tone', 2, ctx, extra), params);
    case 'completed':
      return keyReply(pick('sys_reply_completed', 2, ctx, extra), params);
    case 'thanks':
      return keyReply(pick('sys_reply_thanks', 2, ctx, extra), params);
    case 'motivate':
      return keyReply(pick('sys_reply_motivate', 2, ctx, extra), params);
    case 'unknown':
    default:
      // No reconoce intención: pide concreción sin machacar al usuario ni reciclar el briefing.
      // Si reutilizamos el saludo proactivo aquí, cualquier frase casual acaba sonando a plantilla.
      return keyReply(pick('sys_reply_unknown', 2, ctx, extra), params);
  }
}

// Tono de cada trigger, para que la UI del personaje elija la pose. Mapa fijo y exhaustivo: si se
// añade un trigger, TypeScript obliga a darle tono aquí.
const INTERJECTION_TONE: Record<InterjectionTrigger, InterjectionTone> = {
  mission_complete: 'celebrate',
  streak_milestone: 'celebrate',
  level_up: 'celebrate',
  mission_failed: 'serious',
  streak_broken: 'serious',
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
  level_up: 'sys_int_level_up',
  streak_broken: 'sys_int_streak_broken',
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

// Frase del Sistema para la subida de rango (pantalla de ascensión). Determinista y SIN modelo: la
// animación es corta y un LLM la arruinaría, así que solo plantilla. Devuelve { kind: 'key' } como el
// resto del core; la UI traduce con i18n. Si el rango alcanzado es S (clímax del juego), usa una
// variante especial; el resto comparte la plantilla genérica. La variante (_1/_2) se rota de forma
// estable derivando el índice de los propios rangos (sin Math.random: mismo from/to → misma frase).
export function getRankUpLine(fromRank: string, toRank: string, _language?: string): SystemReply {
  const params = { from: fromRank, to: toRank };
  const prefix = toRank === 'S' ? 'sys_rankup_s' : 'sys_rankup';
  const seed = fromRank.length + toRank.length + toRank.charCodeAt(0);
  const variant = (seed % 2) + 1;
  return keyReply(`${prefix}_${variant}`, params);
}

// Índice determinista para rotar variantes a partir del contexto de un hábito (no del SystemContext).
// Mismo criterio que `variantIndex` pero con señales del propio hábito, para que la frase sea estable
// por hábito sin Math.random.
function habitVariantIndex(habit: HabitContext, total: number): number {
  const seed = habit.completados7 + habit.fallados7 + habit.rachaActual + habit.nombre.length;
  return ((seed % total) + total) % total;
}

// Lee un hábito y devuelve una frase del Sistema interpretando su rendimiento. Regla determinista por
// prioridad: un patrón claro de fallos reciente (>=2 en 7 días) se señala primero; si no, se juzga
// por la consistencia 30d (alta → reconocimiento seco, media → exigencia neutral, baja → corrección).
// Devuelve { kind: 'key' } con params para que i18n traduzca; tono coherente con el resto de la voz.
export function getHabitInsight(habit: HabitContext, _language?: string): SystemReply {
  const consistenciaPct = Math.round(habit.consistencia * 100);
  const params = {
    habito: habit.nombre,
    consistencia: consistenciaPct,
    racha: habit.rachaActual,
    fallos: habit.fallados7,
  };

  // 1) Patrón de fallos reciente claro: lo señala por encima de la media de 30d.
  if (habit.fallados7 >= 2) {
    return keyReply(pickHabit('sys_habit_failpattern', 2, habit), params);
  }

  // 2) Consistencia alta → reconocimiento seco.
  if (habit.consistencia >= 0.8) {
    return keyReply(pickHabit('sys_habit_high', 2, habit), params);
  }

  // 3) Consistencia baja → corrección.
  if (habit.consistencia < 0.5) {
    return keyReply(pickHabit('sys_habit_low', 2, habit), params);
  }

  // 4) Consistencia media → exigencia neutral.
  return keyReply(pickHabit('sys_habit_mid', 2, habit), params);
}

// Variante `prefix_1..prefix_N` para frases de hábito, según el índice derivado del propio hábito.
function pickHabit(prefix: string, total: number, habit: HabitContext): string {
  return `${prefix}_${habitVariantIndex(habit, total) + 1}`;
}
