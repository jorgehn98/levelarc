export const DAILY_MISSION_TARGET = 3;
export const DAILY_MISSION_BONUS_XP = 10;

export function getDailyMissionProgress(completedHabits: number, target = DAILY_MISSION_TARGET) {
  const safeCompleted = Math.max(0, Math.floor(completedHabits));
  const safeTarget = Math.max(1, Math.floor(target));

  return {
    completed: safeCompleted,
    target: safeTarget,
    isComplete: safeCompleted >= safeTarget,
    ratio: Math.min(1, safeCompleted / safeTarget),
  };
}
