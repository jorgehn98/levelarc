import { describe, expect, it } from 'vitest';

import { applyXpDelta, getCompletionXp, getFailureXp } from './xp';
import { getLevelFromXp, getLevelProgress, getXpForLevel } from './ranks';
import { getDailyMissionProgress } from './missions';
import { getTodayWeekday } from '../lib/date';

describe('xp rules', () => {
  it('uses the closed streak multiplier table', () => {
    expect(getCompletionXp(4, 1)).toBe(4);
    expect(getCompletionXp(4, 4)).toBe(5);
    expect(getCompletionXp(4, 8)).toBe(6);
    expect(getCompletionXp(4, 15)).toBe(7);
    expect(getCompletionXp(4, 31)).toBe(8);
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
  it('maps levels to player ranks', () => {
    expect(getLevelProgress(getXpForLevel(1)).rank).toBe('E');
    expect(getLevelProgress(getXpForLevel(10)).rank).toBe('D');
    expect(getLevelProgress(getXpForLevel(25)).rank).toBe('C');
    expect(getLevelProgress(getXpForLevel(45)).rank).toBe('B');
    expect(getLevelProgress(getXpForLevel(70)).rank).toBe('A');
    expect(getLevelProgress(getXpForLevel(100)).rank).toBe('S');
  });
});

describe('daily mission', () => {
  it('marks the fixed mission complete at three completed habits', () => {
    expect(getDailyMissionProgress(2).isComplete).toBe(false);
    expect(getDailyMissionProgress(3).isComplete).toBe(true);
  });
});

describe('weekday rules', () => {
  it('uses LevelArc weekdays from Monday=1 to Sunday=7', () => {
    expect(getTodayWeekday(new Date('2026-05-24T12:00:00'))).toBe(7);
    expect(getTodayWeekday(new Date('2026-05-25T12:00:00'))).toBe(1);
  });
});
