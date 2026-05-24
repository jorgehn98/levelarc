import { getLevelFromXp, getXpForLevel } from './ranks';

export type HabitImportance = 1 | 2 | 3 | 4 | 5;

function getStreakMultiplier(streakDays: number): number {
  if (streakDays >= 31) return 2;
  if (streakDays >= 15) return 1.75;
  if (streakDays >= 8) return 1.5;
  if (streakDays >= 4) return 1.25;
  return 1;
}

export function getCompletionXp(importance: HabitImportance, streakDays: number): number {
  return Math.round(importance * getStreakMultiplier(streakDays));
}

export function getFailureXp(importance: HabitImportance): number {
  return -importance;
}

export function applyXpDelta(currentTotalXp: number, xpDelta: number): number {
  const currentLevel = getLevelFromXp(currentTotalXp);
  const levelFloor = getXpForLevel(currentLevel);
  return Math.max(levelFloor, currentTotalXp + xpDelta);
}
