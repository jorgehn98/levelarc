import { describe, expect, it } from 'vitest';

import { formatWeekdays } from './weekdays';

describe('weekday labels', () => {
  it('formats LevelArc weekdays as initials in the given language', () => {
    expect(formatWeekdays('1,3,5,6', 'es')).toBe('L · X · V · S');
    expect(formatWeekdays('1,3,5,6', 'en')).toBe('M · W · F · S');
  });

  it('sorts, deduplicates and ignores invalid days', () => {
    expect(formatWeekdays('5,1,1,9,x', 'es')).toBe('L · V');
  });

  it('formats every weekday as daily', () => {
    expect(formatWeekdays('1,2,3,4,5,6,7', 'es')).toBe('Diario');
    expect(formatWeekdays('7,6,5,4,3,2,1', 'en')).toBe('Daily');
  });
});
