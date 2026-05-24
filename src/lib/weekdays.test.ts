import { describe, expect, it } from 'vitest';

import { formatWeekdays } from './weekdays';

describe('weekday labels', () => {
  it('formats LevelArc weekdays as initials', () => {
    expect(formatWeekdays('1,3,5,6')).toBe('L · X · V · S');
  });

  it('formats every weekday as daily', () => {
    expect(formatWeekdays('1,2,3,4,5,6,7')).toBe('Diario');
    expect(formatWeekdays('7,6,5,4,3,2,1')).toBe('Diario');
  });
});
