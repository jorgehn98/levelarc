// Catálogo de Logros del Sistema: hitos desbloqueables que otorgan Esencia. Reglas puras y
// testeables, sin imports de RN/db/i18n como valor. Las claves i18n son strings (nameKey == id,
// descKey == id + '_desc'); el diccionario real vive en src/i18n. El catálogo es la fuente de
// verdad de condiciones y recompensas.

import { compareRanks } from './ranks';
import type { Rank } from '@/theme/colors';

export type AchievementCategory =
  | 'inicio'
  | 'constancia'
  | 'progresion'
  | 'misiones'
  | 'atributos'
  | 'coleccion';

// Snapshot de las stats agregadas del jugador. El evaluador es una función pura de este contexto:
// el repository lo arma desde la base de datos y el evaluador decide qué logros están cumplidos.
export interface AchievementContext {
  nivel: number;
  rango: Rank;
  habitosCreados: number; // count(habits) incl. archivados
  totalCompletados: number; // count(events tipo 'completado')
  maxRachaHabitoActual: number; // mayor racha actual entre hábitos activos
  misionesReclamadas: number; // count(daily_missions reclamada=1)
  rachaMisionesActual: number; // player.rachaMisiones
  rachaPerfectaMax: number; // mayor perfectStreakDays visto (max de daily_missions.perfectStreakDays)
  maxNivelAtributo: number; // mayor nivel entre los 6 atributos
  cosmeticosComprados: number; // count(player_rewards) (la aura default gratis no cuenta)
}

export interface Achievement {
  id: string;
  category: AchievementCategory;
  nameKey: string; // == id; clave i18n
  descKey: string; // id + '_desc'; clave i18n
  essenceReward: number;
  isUnlocked: (ctx: AchievementContext) => boolean;
}

// Helper interno: construye un logro derivando nameKey/descKey del id para no repetirlos.
function achievement(
  id: string,
  category: AchievementCategory,
  essenceReward: number,
  isUnlocked: (ctx: AchievementContext) => boolean,
): Achievement {
  return { id, category, nameKey: id, descKey: `${id}_desc`, essenceReward, isUnlocked };
}

// Rango cumplido cuando es igual o superior al exigido.
function hasRank(ctx: AchievementContext, min: Rank): boolean {
  return compareRanks(ctx.rango, min) >= 0;
}

const ACHIEVEMENTS: Achievement[] = [
  // Inicio
  achievement('ach_first_habit', 'inicio', 10, (ctx) => ctx.habitosCreados >= 1),
  achievement('ach_first_complete', 'inicio', 10, (ctx) => ctx.totalCompletados >= 1),
  achievement('ach_first_mission', 'inicio', 10, (ctx) => ctx.misionesReclamadas >= 1),
  achievement('ach_first_cosmetic', 'inicio', 15, (ctx) => ctx.cosmeticosComprados >= 1),

  // Constancia
  achievement('ach_streak_7', 'constancia', 25, (ctx) => ctx.maxRachaHabitoActual >= 7),
  achievement('ach_streak_30', 'constancia', 75, (ctx) => ctx.maxRachaHabitoActual >= 30),
  achievement('ach_complete_50', 'constancia', 40, (ctx) => ctx.totalCompletados >= 50),
  achievement('ach_complete_100', 'constancia', 75, (ctx) => ctx.totalCompletados >= 100),
  achievement('ach_complete_500', 'constancia', 200, (ctx) => ctx.totalCompletados >= 500),

  // Progresión
  achievement('ach_level_5', 'progresion', 25, (ctx) => ctx.nivel >= 5),
  achievement('ach_level_10', 'progresion', 50, (ctx) => ctx.nivel >= 10),
  achievement('ach_level_25', 'progresion', 120, (ctx) => ctx.nivel >= 25),
  achievement('ach_rank_d', 'progresion', 30, (ctx) => hasRank(ctx, 'D')),
  achievement('ach_rank_c', 'progresion', 60, (ctx) => hasRank(ctx, 'C')),
  achievement('ach_rank_b', 'progresion', 120, (ctx) => hasRank(ctx, 'B')),
  achievement('ach_rank_s', 'progresion', 300, (ctx) => hasRank(ctx, 'S')),

  // Misiones
  achievement('ach_missions_7', 'misiones', 30, (ctx) => ctx.misionesReclamadas >= 7),
  achievement('ach_perfect_week', 'misiones', 60, (ctx) => ctx.rachaPerfectaMax >= 7),

  // Atributos
  achievement('ach_attr_5', 'atributos', 30, (ctx) => ctx.maxNivelAtributo >= 5),
  achievement('ach_attr_10', 'atributos', 70, (ctx) => ctx.maxNivelAtributo >= 10),

  // Colección
  achievement('ach_collector_5', 'coleccion', 100, (ctx) => ctx.cosmeticosComprados >= 5),
];

export function getAchievements(): Achievement[] {
  return ACHIEVEMENTS;
}

export function getAchievement(id: string): Achievement | undefined {
  return ACHIEVEMENTS.find((entry) => entry.id === id);
}

// Devuelve los ids de los logros cuyo isUnlocked(ctx) === true.
export function evaluateUnlocked(ctx: AchievementContext): string[] {
  return ACHIEVEMENTS.filter((entry) => entry.isUnlocked(ctx)).map((entry) => entry.id);
}
