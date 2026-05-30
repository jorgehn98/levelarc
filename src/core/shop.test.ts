import { describe, expect, it } from 'vitest';

import {
  DEFAULT_AURA_ID,
  canAfford,
  getAuraColor,
  getAuraItems,
  getShopItem,
  getShopItems,
  getTitleItems,
  meetsRequirement,
  type ShopItem,
} from './shop';

function item(overrides: Partial<ShopItem> = {}): ShopItem {
  return { id: 'x', kind: 'title', cost: 100, nameKey: 'x', ...overrides };
}

describe('canAfford', () => {
  it('allows when essence is exactly the cost', () => {
    expect(canAfford(item({ cost: 50 }), 50)).toBe(true);
  });

  it('allows when essence is above the cost', () => {
    expect(canAfford(item({ cost: 50 }), 80)).toBe(true);
  });

  it('rejects when essence is below the cost', () => {
    expect(canAfford(item({ cost: 50 }), 49)).toBe(false);
  });
});

describe('meetsRequirement', () => {
  it('passes when there is no requirement', () => {
    expect(meetsRequirement(item({ requirement: undefined }), 1, 'E')).toBe(true);
  });

  it('checks minLevel', () => {
    const req = item({ requirement: { minLevel: 5 } });
    expect(meetsRequirement(req, 5, 'E')).toBe(true);
    expect(meetsRequirement(req, 6, 'E')).toBe(true);
    expect(meetsRequirement(req, 4, 'E')).toBe(false);
  });

  it('checks minRank using rank order', () => {
    const req = item({ requirement: { minRank: 'B' } });
    expect(meetsRequirement(req, 1, 'A')).toBe(true); // A > B
    expect(meetsRequirement(req, 1, 'B')).toBe(true); // equal passes
    expect(meetsRequirement(req, 1, 'C')).toBe(false); // C < B
  });

  it('requires both when minLevel and minRank are present', () => {
    const req = item({ requirement: { minLevel: 10, minRank: 'B' } });
    expect(meetsRequirement(req, 10, 'B')).toBe(true);
    expect(meetsRequirement(req, 9, 'B')).toBe(false);
    expect(meetsRequirement(req, 10, 'C')).toBe(false);
  });
});

describe('getAuraColor', () => {
  it('returns the cyan default for unknown ids', () => {
    expect(getAuraColor('does_not_exist')).toBe(getAuraColor(DEFAULT_AURA_ID));
  });

  it('returns distinct colors for known auras', () => {
    expect(getAuraColor('aura_gold')).not.toBe(getAuraColor(DEFAULT_AURA_ID));
  });
});

describe('catalog integrity', () => {
  it('has no duplicate ids', () => {
    const ids = getShopItems().map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('has only non-negative costs', () => {
    for (const entry of getShopItems()) {
      expect(entry.cost).toBeGreaterThanOrEqual(0);
    }
  });

  it('splits items by kind', () => {
    expect(getTitleItems().every((entry) => entry.kind === 'title')).toBe(true);
    expect(getAuraItems().every((entry) => entry.kind === 'aura')).toBe(true);
    expect(getTitleItems().length + getAuraItems().length).toBe(getShopItems().length);
  });

  it('exposes the default aura as a free, requirement-free item', () => {
    const cyan = getShopItem(DEFAULT_AURA_ID);
    expect(cyan).toBeDefined();
    expect(cyan?.cost).toBe(0);
    expect(cyan?.requirement).toBeUndefined();
  });
});
