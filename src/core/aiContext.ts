// Contexto determinista del Chat con el Sistema. Módulo PURO y testeable: sin imports de RN, db ni
// i18n como valor. El repository arma este SystemContext leyendo SQLite; la voz del Sistema
// (systemVoice) decide qué decir a partir de él. `buildSystemContextText` lo serializa a un texto
// compacto y estable, útil como prompt para el LLM en 5B.

import type { Rank } from '@/theme/colors';

export interface SystemContext {
  nombre: string | null;
  nivel: number;
  rango: Rank;
  esencia: number;
  ratioNivel: number; // 0..1, progreso dentro del nivel actual
  faltaParaNivel: number; // XP que falta para el siguiente nivel
  rachaMisiones: number;
  atributoTop: { id: string; nivel: number } | null;
  habitosHoyTotal: number;
  completadosHoy: number;
  pendientesHoy: number;
  falladosHoy: number;
  diaPerfecto: boolean;
  mejorRachaHabito: number;
  rachaPerfecta: number;
  // Eslabón débil del día: de los hábitos programados hoy, el de peor consistencia 30d. Opcional:
  // null cuando no hay pendientes o no se pudo calcular. El briefing diario lo usa para decir por
  // dónde empezar.
  eslabonDebil?: { nombre: string; ratio: number } | null;
}

// Estado de un día en la ventana reciente de un hábito. Espejo de `HabitDayStatus` del repository
// (mantenido como literal propio para no importar db y conservar core puro).
type HabitDayState = 'pendiente' | 'completado' | 'fallado' | 'no_programado';

// Entrada plana para construir el contexto de UN hábito. Espejo de los campos de `HabitInsightRecord`
// (src/db/repository.ts) que el LLM necesita, pero como tipo propio para no importar db: el
// repository arma esto leyendo SQLite y se lo pasa al core.
export interface HabitInsightInput {
  nombre: string;
  consistency30: number; // ratio 0..1 de completados sobre programados en 30d
  currentStreak: number;
  mejorRachaHabito: number;
  importancia: number; // 1..5
  atributos: string[]; // ids de atributos que refuerza el hábito
  last7: HabitDayState[]; // estados de los últimos 7 días, del más antiguo al más reciente
}

// Contexto determinista de un hábito, derivado de su insight. Lo consume la voz del Sistema
// (getHabitInsight) y se serializa a texto compacto para el prompt del LLM.
export interface HabitContext {
  nombre: string;
  consistencia: number; // 0..1
  rachaActual: number;
  mejorRacha: number;
  importancia: number;
  atributos: string[];
  last7: HabitDayState[];
  completados7: number; // completados dentro de los últimos 7 días
  fallados7: number; // fallados dentro de los últimos 7 días
}

// Construye el HabitContext a partir de la entrada plana. Función pura: cuenta completados/fallados
// de la ventana de 7 días y normaliza el resto de campos.
export function buildHabitContext(input: HabitInsightInput): HabitContext {
  const completados7 = input.last7.filter((d) => d === 'completado').length;
  const fallados7 = input.last7.filter((d) => d === 'fallado').length;
  return {
    nombre: input.nombre,
    consistencia: input.consistency30,
    rachaActual: input.currentStreak,
    mejorRacha: input.mejorRachaHabito,
    importancia: input.importancia,
    atributos: input.atributos,
    last7: input.last7,
    completados7,
    fallados7,
  };
}

// Abreviaturas estables de cada estado para la línea `ultimos_7` del prompt (compacto y legible para
// el LLM). Determinista: un estado siempre produce el mismo símbolo.
const HABIT_DAY_SHORT: Record<HabitDayState, string> = {
  completado: 'C',
  fallado: 'X',
  pendiente: 'P',
  no_programado: '-',
};

// Serializa el contexto de un hábito a líneas `clave: valor` deterministas, mismo patrón que
// `buildSystemContextText`. Orden fijo para una salida reproducible.
export function buildHabitContextText(ctx: HabitContext): string {
  const lines = [
    `habito: ${ctx.nombre}`,
    `consistencia_30d: ${Math.round(ctx.consistencia * 100)}%`,
    `racha_actual: ${ctx.rachaActual}`,
    `mejor_racha: ${ctx.mejorRacha}`,
    `importancia: ${ctx.importancia}`,
    `atributos: ${ctx.atributos.length ? ctx.atributos.join(', ') : '-'}`,
    `ultimos_7: ${ctx.last7.map((d) => HABIT_DAY_SHORT[d]).join('')}`,
    `completados_7: ${ctx.completados7}`,
    `fallados_7: ${ctx.fallados7}`,
  ];
  return lines.join('\n');
}

// Serializa el contexto a líneas `clave: valor` deterministas. El orden es fijo para que el mismo
// contexto produzca siempre el mismo texto (clave para tests y para un prompt reproducible).
export function buildSystemContextText(ctx: SystemContext): string {
  const lines = [
    `nombre: ${ctx.nombre ?? '-'}`,
    `nivel: ${ctx.nivel}`,
    `rango: ${ctx.rango}`,
    `esencia: ${ctx.esencia}`,
    `progreso_nivel: ${Math.round(ctx.ratioNivel * 100)}%`,
    `falta_para_nivel: ${ctx.faltaParaNivel}`,
    `racha_misiones: ${ctx.rachaMisiones}`,
    `atributo_top: ${ctx.atributoTop ? `${ctx.atributoTop.id} (nivel ${ctx.atributoTop.nivel})` : '-'}`,
    `habitos_hoy: ${ctx.habitosHoyTotal}`,
    `completados_hoy: ${ctx.completadosHoy}`,
    `pendientes_hoy: ${ctx.pendientesHoy}`,
    `fallados_hoy: ${ctx.falladosHoy}`,
    `dia_perfecto: ${ctx.diaPerfecto ? 'si' : 'no'}`,
    `mejor_racha_habito: ${ctx.mejorRachaHabito}`,
    `racha_perfecta: ${ctx.rachaPerfecta}`,
    `eslabon_debil: ${ctx.eslabonDebil ? `${ctx.eslabonDebil.nombre} (${Math.round(ctx.eslabonDebil.ratio * 100)}%)` : '-'}`,
  ];
  return lines.join('\n');
}
