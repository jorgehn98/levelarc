import { describe, expect, it } from 'vitest';

import { formatWeekdays } from './weekdays';

describe('weekday labels', () => {
  it('formats LevelArc weekdays as initials', () => {
    expect(formatWeekdays('1,3,5,6')).toBe('L · X · V · S');
  });
});
