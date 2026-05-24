export const DAILY_MISSION_BONUS_XP = 10;
export const PERFECT_WEEK_BONUS_XP = 30;

const PERFECT_WEEK_STREAK_DAYS = 7;

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

export function getPerfectWeekMissionProgress(perfectStreakDays: number) {
  const safeStreak = Math.max(0, Math.floor(perfectStreakDays));
  return {
    completed: Math.min(PERFECT_WEEK_STREAK_DAYS, safeStreak),
    target: PERFECT_WEEK_STREAK_DAYS,
    isComplete: safeStreak >= PERFECT_WEEK_STREAK_DAYS,
    ratio: Math.min(1, safeStreak / PERFECT_WEEK_STREAK_DAYS),
  };
}
