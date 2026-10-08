import { describe, expect, it } from 'vitest';

import { applyXpDelta, getCompletionXp, getFailureXp } from './xp';
import { getLevelFromXp, getLevelProgress, getXpForLevel } from './ranks';
import {
  canClaimPerfectWeek,
  getClaimedDailyMissionStreak,
  getDailyMissionBonus,
  getDailyMissionProgress,
  getPerfectDayStreak,
  getPerfectWeekMissionProgress,
  shouldShowPerfectWeekMission,
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
    expect(getFailureXp(4)).toBe(-16);
    expect(getFailureXp(5)).toBe(-20);
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

  it('pays the perfect week bonus once per cycle of seven perfect days', () => {
    expect(getPerfectWeekMissionProgress(6)).toMatchObject({ completed: 6, target: 7, isComplete: false });
    expect(getPerfectWeekMissionProgress(7)).toMatchObject({ completed: 7, target: 7, isComplete: true });
    expect(getPerfectWeekMissionProgress(8)).toMatchObject({ completed: 1, target: 7, isComplete: false });
    expect(getPerfectWeekMissionProgress(14)).toMatchObject({ completed: 7, target: 7, isComplete: true });
    expect(getPerfectWeekMissionProgress(0).isComplete).toBe(false);
  });

  it('only allows the perfect week claim on an unclaimed, perfect, seventh day', () => {
    const day7 = { objetivo: 2, completados: 2, perfectStreakDays: 7, streakBonusClaimed: false };

    expect(canClaimPerfectWeek(day7)).toBe(true);
    expect(canClaimPerfectWeek({ ...day7, streakBonusClaimed: true })).toBe(false);
    expect(canClaimPerfectWeek({ ...day7, perfectStreakDays: 8 })).toBe(false);
    // Racha de 7 arrastrada de ayer, pero hoy aún no es un día perfecto.
    expect(canClaimPerfectWeek({ ...day7, completados: 1 })).toBe(false);
    expect(canClaimPerfectWeek({ ...day7, objetivo: 0, completados: 0 })).toBe(false);
    expect(canClaimPerfectWeek(null)).toBe(false);
  });

  it('shows the perfect week card only around a payout day', () => {
    const day = (perfectStreakDays: number, completados: number, streakBonusClaimed = false) => ({
      objetivo: 2,
      completados,
      perfectStreakDays,
      streakBonusClaimed,
    });

    // Lejos del pago.
    expect(shouldShowPerfectWeekMission(day(5, 2))).toBe(false);
    expect(shouldShowPerfectWeekMission(day(0, 0))).toBe(false);
    // Víspera: hoy fue el sexto día perfecto.
    expect(shouldShowPerfectWeekMission(day(6, 2))).toBe(true);
    // Día de pago en curso: seis perfectos hasta ayer, hoy pendiente.
    expect(shouldShowPerfectWeekMission(day(6, 1))).toBe(true);
    expect(shouldShowPerfectWeekMission(day(13, 0))).toBe(true);
    // Día de pago completado: reclamable y, después, reclamado.
    expect(shouldShowPerfectWeekMission(day(7, 2))).toBe(true);
    expect(shouldShowPerfectWeekMission(day(14, 2, true))).toBe(true);
    // El pago fue ayer: hoy empieza otro ciclo.
    expect(shouldShowPerfectWeekMission(day(7, 1, true))).toBe(false);
    expect(shouldShowPerfectWeekMission({ ...day(7, 0), objetivo: 0 })).toBe(false);
    expect(shouldShowPerfectWeekMission(day(8, 2))).toBe(false);
    expect(shouldShowPerfectWeekMission(null)).toBe(false);
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

  it('skips rest days and stops at a day without a mission row', () => {
    const missions = [
      { fecha: '2026-05-19', objetivo: 1, completados: 1, reclamada: true },
      // 2026-05-20 no tiene fila: rompe.
      { fecha: '2026-05-21', objetivo: 2, completados: 2, reclamada: true },
      { fecha: '2026-05-22', objetivo: 0, completados: 0, reclamada: false },
      { fecha: '2026-05-23', objetivo: 0, completados: 0, reclamada: false },
      { fecha: '2026-05-24', objetivo: 2, completados: 2, reclamada: true },
    ];

    expect(getClaimedDailyMissionStreak(missions, '2026-05-24')).toBe(2);
    expect(getPerfectDayStreak(missions, '2026-05-24')).toBe(2);
    expect(getPerfectDayStreak(missions, '2026-05-23')).toBe(1);
  });

  it('breaks the perfect day streak on an incomplete scheduled day', () => {
    const missions = [
      { fecha: '2026-05-22', objetivo: 2, completados: 2, reclamada: false },
      { fecha: '2026-05-23', objetivo: 2, completados: 1, reclamada: false },
      { fecha: '2026-05-24', objetivo: 2, completados: 2, reclamada: false },
    ];

    expect(getPerfectDayStreak(missions, '2026-05-24')).toBe(1);
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
