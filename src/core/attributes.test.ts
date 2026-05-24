import { describe, expect, it } from 'vitest';

import {
  applyAttributeDeltas,
  createEmptyAttributeXp,
  getAttributeDeltas,
  getAttributeLevelProgress,
  normalizeHabitAttributes,
} from './attributes';

describe('attribute rules', () => {
  it('normalizes habit attributes with a maximum of three', () => {
    expect(normalizeHabitAttributes('fuerza,vitalidad,intelecto,carisma')).toEqual(['fuerza', 'vitalidad', 'intelecto']);
    expect(normalizeHabitAttributes('unknown')).toEqual(['voluntad']);
  });

  it('splits completion xp evenly across selected attributes', () => {
    expect(getAttributeDeltas(30, 'fuerza')).toMatchObject({ fuerza: 30 });
    expect(getAttributeDeltas(30, 'fuerza,vitalidad')).toMatchObject({ fuerza: 15, vitalidad: 15 });
    expect(getAttributeDeltas(30, 'fuerza,vitalidad,voluntad')).toMatchObject({ fuerza: 10, vitalidad: 10, voluntad: 10 });
  });

  it('accumulates attribute xp without touching unrelated attributes', () => {
    const current = createEmptyAttributeXp();
    const next = applyAttributeDeltas(current, getAttributeDeltas(9, 'fuerza,vitalidad,voluntad'));
    expect(next).toMatchObject({ fuerza: 3, vitalidad: 3, voluntad: 3, intelecto: 0 });
  });

  it('levels attributes slower than one completion', () => {
    expect(getAttributeLevelProgress(0).level).toBe(1);
    expect(getAttributeLevelProgress(119).level).toBe(1);
    expect(getAttributeLevelProgress(120).level).toBe(2);
  });
});
