import { describe, expect, it } from 'vitest';

import { applyXpDelta, getCompletionXp, getFailureXp } from './xp';
import { getLevelFromXp, getLevelProgress, getXpForLevel } from './ranks';
import {
  getClaimedDailyMissionStreak,
  getDailyMissionBonus,
  getDailyMissionProgress,
  getPerfectWeekMissionProgress,
} from './missions';
import { getDateKeysBetween, getTodayWeekday, getYesterdayDateKey, toDateKey } from '../lib/date';

describe('xp rules', () => {
  it('caps the habit streak multiplier at x1.50', () => {
    expect(getCompletionXp(4, 1)).toBe(20);
    expect(getCompletionXp(4, 4)).toBe(22);
    expect(getCompletionXp(4, 8)).toBe(24);
    expect(getCompletionXp(4, 15)).toBe(27);
    expect(getCompletionXp(4, 31)).toBe(30);
  });

  it('calculates completion and failure deltas from importance', () => {
    expect(getCompletionXp(1, 1)).toBe(5);
    expect(getCompletionXp(5, 1)).toBe(25);
    expect(getCompletionXp(4, 8)).toBe(24);
    expect(getFailureXp(4)).toBe(-20);
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
  it('requires all scheduled habits for the day', () => {
    expect(getDailyMissionProgress(2, 3).isComplete).toBe(false);
    expect(getDailyMissionProgress(3, 3).isComplete).toBe(true);
    expect(getDailyMissionProgress(0, 0).isAvailable).toBe(false);
  });

  it('scales the daily mission bonus by daily load', () => {
    expect(getDailyMissionBonus(0)).toBe(0);
    expect(getDailyMissionBonus(1)).toBe(5);
    expect(getDailyMissionBonus(3)).toBe(10);
    expect(getDailyMissionBonus(5)).toBe(15);
    expect(getDailyMissionBonus(6)).toBe(20);
  });

  it('tracks the perfect week bonus mission at seven perfect days', () => {
    expect(getPerfectWeekMissionProgress(6)).toMatchObject({ completed: 6, target: 7, isComplete: false });
    expect(getPerfectWeekMissionProgress(7)).toMatchObject({ completed: 7, target: 7, isComplete: true });
    expect(getPerfectWeekMissionProgress(10).completed).toBe(7);
  });

  it('counts only consecutive claimed daily missions', () => {
    const missions = [
      { fecha: '2026-05-21', objetivo: 2, reclamada: true },
      { fecha: '2026-05-22', objetivo: 2, reclamada: false },
      { fecha: '2026-05-23', objetivo: 2, reclamada: true },
      { fecha: '2026-05-24', objetivo: 2, reclamada: true },
    ];

    expect(getClaimedDailyMissionStreak(missions, '2026-05-24')).toBe(2);
    expect(getClaimedDailyMissionStreak(missions, '2026-05-23')).toBe(1);
    expect(getClaimedDailyMissionStreak(missions, '2026-05-22')).toBe(0);
  });
});

describe('weekday rules', () => {
  it('uses LevelArc weekdays from Monday=1 to Sunday=7', () => {
    expect(getTodayWeekday(new Date('2026-05-24T12:00:00'))).toBe(7);
    expect(getTodayWeekday(new Date('2026-05-25T12:00:00'))).toBe(1);
  });

  it('uses the device local calendar date for date keys', () => {
    expect(toDateKey(new Date(2026, 4, 25, 0, 11))).toBe('2026-05-25');
  });

  it('builds local date ranges for missed day closure', () => {
    expect(getYesterdayDateKey(new Date(2026, 4, 25, 0, 11))).toBe('2026-05-24');
    expect(getDateKeysBetween('2026-05-23', '2026-05-25')).toEqual([
      '2026-05-23',
      '2026-05-24',
      '2026-05-25',
    ]);
    expect(getDateKeysBetween('2026-05-26', '2026-05-25')).toEqual([]);
  });
});
