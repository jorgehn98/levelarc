import { describe, expect, it } from 'vitest';

import { applyXpDelta, getCompletionXp, getFailureXp, getStreakMultiplier } from './xp';
import { getLevelFromXp, getRankForLevel, getXpForLevel } from './ranks';
import { getDailyMissionProgress } from './missions';

describe('xp rules', () => {
  it('uses the closed streak multiplier table', () => {
    expect(getStreakMultiplier(1)).toBe(1);
    expect(getStreakMultiplier(4)).toBe(1.25);
    expect(getStreakMultiplier(8)).toBe(1.5);
    expect(getStreakMultiplier(15)).toBe(1.75);
    expect(getStreakMultiplier(31)).toBe(2);
  });

  it('calculates completion and failure deltas from importance', () => {
    expect(getCompletionXp(4, 8)).toBe(6);
    expect(getFailureXp(4)).toBe(-4);
  });

  it('never drops below the current level floor when applying penalties', () => {
    const levelThreeFloor = getXpForLevel(3);
    expect(getLevelFromXp(levelThreeFloor)).toBe(3);
    expect(applyXpDelta(levelThreeFloor + 1, -5)).toBe(levelThreeFloor);
  });
});

describe('progression', () => {
  it('maps levels to hunter ranks', () => {
    expect(getRankForLevel(1)).toBe('E');
    expect(getRankForLevel(10)).toBe('D');
    expect(getRankForLevel(25)).toBe('C');
    expect(getRankForLevel(45)).toBe('B');
    expect(getRankForLevel(70)).toBe('A');
    expect(getRankForLevel(100)).toBe('S');
  });
});

describe('daily mission', () => {
  it('marks the fixed mission complete at three completed habits', () => {
    expect(getDailyMissionProgress(2).isComplete).toBe(false);
    expect(getDailyMissionProgress(3).isComplete).toBe(true);
  });
});
