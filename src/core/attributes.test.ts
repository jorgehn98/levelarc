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

  it('boosts and splits completion xp evenly across selected attributes', () => {
    expect(getAttributeDeltas(30, 'fuerza')).toMatchObject({ fuerza: 45 });
    expect(getAttributeDeltas(30, 'fuerza,vitalidad')).toMatchObject({ fuerza: 22.5, vitalidad: 22.5 });
    expect(getAttributeDeltas(30, 'fuerza,vitalidad,voluntad')).toMatchObject({ fuerza: 15, vitalidad: 15, voluntad: 15 });
  });

  it('accumulates attribute xp without touching unrelated attributes', () => {
    const current = createEmptyAttributeXp();
    const next = applyAttributeDeltas(current, getAttributeDeltas(9, 'fuerza,vitalidad,voluntad'));
    expect(next).toMatchObject({ fuerza: 4.5, vitalidad: 4.5, voluntad: 4.5, intelecto: 0 });
  });

  it('levels attributes slower than one completion', () => {
    expect(getAttributeLevelProgress(0).level).toBe(1);
    expect(getAttributeLevelProgress(29).level).toBe(1);
    expect(getAttributeLevelProgress(30).level).toBe(2);
    expect(getAttributeLevelProgress(91).level).toBe(3);
  });
});
