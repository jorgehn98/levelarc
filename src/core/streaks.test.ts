import { describe, expect, it } from 'vitest';

import { getScheduledCompletionStreak } from './streaks';

describe('scheduled habit streaks', () => {
  it('ignores days where the habit is not scheduled', () => {
    const completedDates = ['2026-05-18'];

    expect(getScheduledCompletionStreak(completedDates, '2026-05-20', '1,3')).toBe(1);
  });

  it('counts weekly habits by scheduled completions, not calendar days', () => {
    const completedDates = ['2026-05-17', '2026-05-10', '2026-05-03'];

    expect(getScheduledCompletionStreak(completedDates, '2026-05-24', '7')).toBe(3);
  });

  it('breaks when the previous scheduled occurrence was not completed', () => {
    const completedDates = ['2026-05-11'];

    expect(getScheduledCompletionStreak(completedDates, '2026-05-20', '1,3')).toBe(0);
  });
});
