import { describe, expect, it } from 'vitest';

import { getMissingHabitFields } from './habitFormValidation';

describe('habit form validation', () => {
  it('accepts a habit with name, days and attributes', () => {
    expect(getMissingHabitFields({ name: 'Leer', days: [1], attributes: ['intelecto'] })).toEqual([]);
  });

  it('lists what is missing in form order', () => {
    expect(getMissingHabitFields({ name: '', days: [], attributes: [] })).toEqual(['attributes', 'name', 'days']);
    expect(getMissingHabitFields({ name: 'Leer', days: [], attributes: ['intelecto'] })).toEqual(['days']);
  });

  it('treats a blank name as missing', () => {
    expect(getMissingHabitFields({ name: '   ', days: [1], attributes: ['intelecto'] })).toEqual(['name']);
  });
});
