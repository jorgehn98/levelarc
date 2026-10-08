import { describe, expect, it } from 'vitest';

import { getAttributeLevelProgress } from './attributes';
import { getLevelUpEssenceBetween } from './economy';
import { getLevelFromXp, getLevelProgress, getXpForLevel } from './ranks';

describe('level from xp', () => {
  it('maps known totals to levels', () => {
    expect(getLevelFromXp(0)).toBe(1);
    expect(getLevelFromXp(29)).toBe(1);
    expect(getLevelFromXp(30)).toBe(2);
    // ceil(30 * 2^1.6) = 91
    expect(getLevelFromXp(90)).toBe(2);
    expect(getLevelFromXp(91)).toBe(3);
  });

  it('is exact at every level floor and one xp below it', () => {
    for (let level = 2; level <= 3000; level += 1) {
      const floor = getXpForLevel(level);
      expect(getLevelFromXp(floor)).toBe(level);
      expect(getLevelFromXp(floor - 1)).toBe(level - 1);
    }
  });

  it('terminates on absurd input instead of looping', () => {
    expect(getLevelFromXp(Number.NaN)).toBe(1);
    expect(getLevelFromXp(-50)).toBe(1);
    expect(getLevelFromXp(Number.NEGATIVE_INFINITY)).toBe(1);

    const capped = getLevelFromXp(Number.MAX_SAFE_INTEGER);
    expect(Number.isSafeInteger(capped)).toBe(true);
    expect(getLevelFromXp(1e300)).toBe(capped);
    expect(getLevelFromXp(Number.POSITIVE_INFINITY)).toBe(capped);
    expect(getLevelProgress(1e300).level).toBe(capped);
    expect(getAttributeLevelProgress(1e300).level).toBe(capped);
  });

  it('sums level-up essence for a huge level range without iterating', () => {
    // 10 + 5·(l−1) para l en (1, 1e9]: 5·(n² + 3n)/2 − 10 con n = 1e9.
    expect(getLevelUpEssenceBetween(1, 1e9)).toBe(2_500_000_007_499_999_990);
    expect(getLevelUpEssenceBetween(0, 3)).toBe(35);
    expect(getLevelUpEssenceBetween(Number.NaN, 3)).toBe(0);
  });
});
