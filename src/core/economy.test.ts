import { describe, expect, it } from 'vitest';

import {
  PERFECT_WEEK_ESSENCE,
  getCompletionEssence,
  getLevelUpEssence,
  getLevelUpEssenceBetween,
  getMissionEssence,
  getPerfectWeekEssence,
} from './economy';

describe('completion essence', () => {
  it('grants double the importance, clamped at zero', () => {
    expect(getCompletionEssence(1)).toBe(2);
    expect(getCompletionEssence(3)).toBe(6);
    expect(getCompletionEssence(5)).toBe(10);
    expect(getCompletionEssence(0)).toBe(0);
    expect(getCompletionEssence(-3)).toBe(0);
  });

  it('rounds fractional importance before doubling', () => {
    expect(getCompletionEssence(2.4)).toBe(4);
    expect(getCompletionEssence(2.6)).toBe(6);
  });
});

describe('mission essence', () => {
  it('scales the daily mission essence by load', () => {
    expect(getMissionEssence(0)).toBe(0);
    expect(getMissionEssence(-2)).toBe(0);
    expect(getMissionEssence(1)).toBe(3);
    expect(getMissionEssence(2)).toBe(5);
    expect(getMissionEssence(3)).toBe(5);
    expect(getMissionEssence(4)).toBe(8);
    expect(getMissionEssence(5)).toBe(8);
    expect(getMissionEssence(6)).toBe(12);
    expect(getMissionEssence(12)).toBe(12);
  });
});

describe('perfect week essence', () => {
  it('returns the constant perfect week reward', () => {
    expect(getPerfectWeekEssence()).toBe(25);
    expect(getPerfectWeekEssence()).toBe(PERFECT_WEEK_ESSENCE);
  });
});

describe('level up essence', () => {
  it('grants nothing for level one or below', () => {
    expect(getLevelUpEssence(1)).toBe(0);
    expect(getLevelUpEssence(0)).toBe(0);
    expect(getLevelUpEssence(-5)).toBe(0);
  });

  it('scales the level up reward by five per level', () => {
    expect(getLevelUpEssence(2)).toBe(15);
    expect(getLevelUpEssence(5)).toBe(30);
    expect(getLevelUpEssence(10)).toBe(55);
  });
});

describe('level up essence between levels', () => {
  it('returns zero when the target is not higher', () => {
    expect(getLevelUpEssenceBetween(5, 5)).toBe(0);
    expect(getLevelUpEssenceBetween(5, 3)).toBe(0);
  });

  it('sums a single level jump', () => {
    expect(getLevelUpEssenceBetween(1, 2)).toBe(15);
    expect(getLevelUpEssenceBetween(4, 5)).toBe(30);
  });

  it('sums multiple level jumps inclusive of the target level', () => {
    // levels 2 (15) + 3 (20) + 4 (25) = 60
    expect(getLevelUpEssenceBetween(1, 4)).toBe(60);
    // levels 3 (20) + 4 (25) + 5 (30) = 75
    expect(getLevelUpEssenceBetween(2, 5)).toBe(75);
  });
});
