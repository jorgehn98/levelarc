import { toDateKey } from '@/lib/date';

export const DAILY_MISSION_BONUS_XP = 10;
export const PERFECT_WEEK_BONUS_XP = 30;

const PERFECT_WEEK_STREAK_DAYS = 7;

// Tope de días que se recorren hacia atrás al contar rachas de misión (~10 años). Las rachas no
// tienen otro límite: los repositorios cargan esta misma ventana, no las últimas N filas.
export const MISSION_STREAK_LOOKBACK_DAYS = 3650;

type MissionStreakEntry = {
  fecha: string;
  objetivo: number;
  completados?: number;
  reclamada: boolean | number;
};

type PerfectWeekEntry = {
  objetivo: number;
  completados: number;
  perfectStreakDays: number;
  streakBonusClaimed: boolean;
};

export function getDailyMissionBonus(target: number) {
  const safeTarget = Math.max(0, Math.floor(target));
  if (safeTarget === 0) return 0;
  if (safeTarget === 1) return 5;
  if (safeTarget <= 3) return 10;
  if (safeTarget <= 5) return 15;
  return 20;
}

export function getDailyMissionProgress(completedHabits: number, target: number) {
  const safeCompleted = Math.max(0, Math.floor(completedHabits));
  const safeTarget = Math.max(0, Math.floor(target));
  const isAvailable = safeTarget > 0;

  return {
    completed: safeCompleted,
    target: safeTarget,
    isAvailable,
    isComplete: isAvailable && safeCompleted >= safeTarget,
    ratio: isAvailable ? Math.min(1, safeCompleted / safeTarget) : 0,
  };
}

// Progreso del ciclo de 7 días perfectos en curso. El bonus se paga una vez por ciclo (día 7, 14,
// 21…), así que el contador vuelve a empezar tras cada múltiplo de 7 en lugar de quedarse en 7/7.
export function getPerfectWeekMissionProgress(perfectStreakDays: number) {
  const safeStreak = Math.max(0, Math.floor(perfectStreakDays));
  const isComplete = safeStreak > 0 && safeStreak % PERFECT_WEEK_STREAK_DAYS === 0;
  const completed = isComplete ? PERFECT_WEEK_STREAK_DAYS : safeStreak % PERFECT_WEEK_STREAK_DAYS;
  return {
    completed,
    target: PERFECT_WEEK_STREAK_DAYS,
    isComplete,
    ratio: completed / PERFECT_WEEK_STREAK_DAYS,
  };
}

// Única regla de "se puede reclamar el bonus de racha perfecta": la usan la UI y los repositorios,
// así que el botón solo aparece cuando el repositorio aceptaría el claim.
export function canClaimPerfectWeek(mission: PerfectWeekEntry | null | undefined): boolean {
  if (!mission || mission.streakBonusClaimed) return false;
  if (mission.objetivo <= 0 || mission.completados < mission.objetivo) return false;
  return getPerfectWeekMissionProgress(mission.perfectStreakDays).isComplete;
}

// Días programados consecutivos que cumplen `qualifies`, contando hacia atrás desde dateKey
// (incluido). Misma convención que las rachas de hábito (streaks.ts): un día sin hábitos programados
// (objetivo 0) ni rompe ni suma. Un día sin fila sí rompe: no hay registro de que fuera descanso.
function countMissionStreak(
  missions: Iterable<MissionStreakEntry>,
  dateKey: string,
  qualifies: (mission: MissionStreakEntry) => boolean,
) {
  const missionsByDate = new Map<string, MissionStreakEntry>();
  for (const mission of missions) missionsByDate.set(mission.fecha, mission);
  const cursor = new Date(`${dateKey}T12:00:00`);
  let streak = 0;

  for (let day = 0; day < MISSION_STREAK_LOOKBACK_DAYS; day += 1) {
    const mission = missionsByDate.get(toDateKey(cursor));
    if (!mission) break;
    if (mission.objetivo > 0) {
      if (!qualifies(mission)) break;
      streak += 1;
    }
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

export function getClaimedDailyMissionStreak(missions: Iterable<MissionStreakEntry>, dateKey: string) {
  return countMissionStreak(missions, dateKey, (mission) => Boolean(mission.reclamada));
}

export function getPerfectDayStreak(missions: Iterable<MissionStreakEntry>, dateKey: string) {
  return countMissionStreak(missions, dateKey, (mission) => (mission.completados ?? 0) >= mission.objetivo);
}

