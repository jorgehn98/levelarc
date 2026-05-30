import { describe, expect, it } from 'vitest';

import {
  evaluateUnlocked,
  getAchievement,
  getAchievements,
  type AchievementContext,
} from './achievements';

function ctx(overrides: Partial<AchievementContext> = {}): AchievementContext {
  return {
    nivel: 1,
    rango: 'E',
    habitosCreados: 0,
    totalCompletados: 0,
    maxRachaHabitoActual: 0,
    misionesReclamadas: 0,
    rachaMisionesActual: 0,
    rachaPerfectaMax: 0,
    maxNivelAtributo: 1,
    cosmeticosComprados: 0,
    ...overrides,
  };
}

describe('catalog integrity', () => {
  it('has no duplicate ids', () => {
    const ids = getAchievements().map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('gives a positive essence reward for every achievement', () => {
    for (const entry of getAchievements()) {
      expect(entry.essenceReward).toBeGreaterThan(0);
    }
  });

  it('derives nameKey and descKey from the id', () => {
    for (const entry of getAchievements()) {
      expect(entry.nameKey).toBe(entry.id);
      expect(entry.descKey).toBe(`${entry.id}_desc`);
    }
  });

  it('finds achievements by id and returns undefined for unknown ids', () => {
    expect(getAchievement('ach_first_habit')?.id).toBe('ach_first_habit');
    expect(getAchievement('does_not_exist')).toBeUndefined();
  });
});

describe('evaluateUnlocked', () => {
  it('unlocks nothing for a brand new player', () => {
    expect(evaluateUnlocked(ctx())).toEqual([]);
  });

  it('unlocks the starter achievements with minimal progress', () => {
    const ids = evaluateUnlocked(
      ctx({ habitosCreados: 1, totalCompletados: 1, misionesReclamadas: 1, cosmeticosComprados: 1 }),
    );
    expect(ids).toContain('ach_first_habit');
    expect(ids).toContain('ach_first_complete');
    expect(ids).toContain('ach_first_mission');
    expect(ids).toContain('ach_first_cosmetic');
  });

  it('respects exact thresholds for completion counters', () => {
    expect(evaluateUnlocked(ctx({ totalCompletados: 49 }))).not.toContain('ach_complete_50');
    expect(evaluateUnlocked(ctx({ totalCompletados: 50 }))).toContain('ach_complete_50');
    expect(evaluateUnlocked(ctx({ totalCompletados: 51 }))).toContain('ach_complete_50');
  });

  it('respects exact thresholds for habit streaks', () => {
    expect(evaluateUnlocked(ctx({ maxRachaHabitoActual: 6 }))).not.toContain('ach_streak_7');
    expect(evaluateUnlocked(ctx({ maxRachaHabitoActual: 7 }))).toContain('ach_streak_7');
    expect(evaluateUnlocked(ctx({ maxRachaHabitoActual: 30 }))).toContain('ach_streak_30');
  });

  it('compares rank against the threshold (equal or above unlocks)', () => {
    expect(evaluateUnlocked(ctx({ rango: 'E' }))).not.toContain('ach_rank_d');
    expect(evaluateUnlocked(ctx({ rango: 'D' }))).toContain('ach_rank_d'); // equal unlocks
    expect(evaluateUnlocked(ctx({ rango: 'C' }))).toContain('ach_rank_d'); // above unlocks
    expect(evaluateUnlocked(ctx({ rango: 'C' }))).not.toContain('ach_rank_b');
    expect(evaluateUnlocked(ctx({ rango: 'S' }))).toContain('ach_rank_s');
  });

  it('respects level, mission, attribute and collection thresholds', () => {
    expect(evaluateUnlocked(ctx({ nivel: 4 }))).not.toContain('ach_level_5');
    expect(evaluateUnlocked(ctx({ nivel: 5 }))).toContain('ach_level_5');
    expect(evaluateUnlocked(ctx({ misionesReclamadas: 7 }))).toContain('ach_missions_7');
    expect(evaluateUnlocked(ctx({ rachaPerfectaMax: 7 }))).toContain('ach_perfect_week');
    expect(evaluateUnlocked(ctx({ maxNivelAtributo: 10 }))).toContain('ach_attr_10');
    expect(evaluateUnlocked(ctx({ cosmeticosComprados: 5 }))).toContain('ach_collector_5');
  });
});
