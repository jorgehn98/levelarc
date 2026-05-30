// Catálogo de la Tienda del Sistema: cosméticos comprables con Esencia. Reglas puras y testeables,
// sin imports de RN/db. Los precios y requisitos son la fuente de verdad del catálogo.

import { compareRanks } from './ranks';
import type { Rank } from '@/theme/colors';

export type ShopItemKind = 'title' | 'aura';

export interface ShopRequirement {
  minLevel?: number;
  minRank?: Rank;
}

export interface ShopItem {
  id: string;
  kind: ShopItemKind;
  cost: number;
  requirement?: ShopRequirement;
  nameKey: string;
}

// Aura por defecto: gratis y siempre poseída. Es el glow base del jugador.
export const DEFAULT_AURA_ID = 'aura_cyan';

const SHOP_ITEMS: ShopItem[] = [
  // Títulos
  { id: 'title_awakened', kind: 'title', cost: 30, nameKey: 'title_awakened' },
  { id: 'title_hunter', kind: 'title', cost: 80, requirement: { minLevel: 5 }, nameKey: 'title_hunter' },
  { id: 'title_relentless', kind: 'title', cost: 150, requirement: { minLevel: 10 }, nameKey: 'title_relentless' },
  { id: 'title_shadow', kind: 'title', cost: 300, requirement: { minRank: 'B' }, nameKey: 'title_shadow' },
  { id: 'title_monarch', kind: 'title', cost: 600, requirement: { minRank: 'S' }, nameKey: 'title_monarch' },
  // Auras
  { id: 'aura_cyan', kind: 'aura', cost: 0, nameKey: 'aura_cyan' },
  { id: 'aura_amber', kind: 'aura', cost: 50, nameKey: 'aura_amber' },
  { id: 'aura_violet', kind: 'aura', cost: 120, requirement: { minLevel: 8 }, nameKey: 'aura_violet' },
  { id: 'aura_emerald', kind: 'aura', cost: 200, requirement: { minLevel: 15 }, nameKey: 'aura_emerald' },
  { id: 'aura_crimson', kind: 'aura', cost: 350, requirement: { minRank: 'A' }, nameKey: 'aura_crimson' },
  { id: 'aura_gold', kind: 'aura', cost: 700, requirement: { minRank: 'S' }, nameKey: 'aura_gold' },
];

// Glow (hex) de cada aura. El cian es el mismo que brand.cyanCore (colors.ts); se deja literal
// para no importar el módulo de tema (RN) en lógica pura y poder testearlo en aislamiento.
const AURA_COLORS: Record<string, string> = {
  aura_cyan: '#3FCAE6',
  aura_amber: '#FFB454',
  aura_violet: '#A78BFA',
  aura_emerald: '#34D399',
  aura_crimson: '#F87171',
  aura_gold: '#FFD166',
};

export function getShopItems(): ShopItem[] {
  return SHOP_ITEMS;
}

export function getShopItem(id: string): ShopItem | undefined {
  return SHOP_ITEMS.find((item) => item.id === id);
}

export function getTitleItems(): ShopItem[] {
  return SHOP_ITEMS.filter((item) => item.kind === 'title');
}

export function getAuraItems(): ShopItem[] {
  return SHOP_ITEMS.filter((item) => item.kind === 'aura');
}

export function canAfford(item: ShopItem, esencia: number): boolean {
  return esencia >= item.cost;
}

export function meetsRequirement(item: ShopItem, level: number, rank: Rank): boolean {
  const requirement = item.requirement;
  if (!requirement) return true;
  if (requirement.minLevel !== undefined && level < requirement.minLevel) return false;
  if (requirement.minRank !== undefined && compareRanks(rank, requirement.minRank) < 0) return false;
  return true;
}

// Color del glow del aura. El cian es el fallback para ids desconocidos.
export function getAuraColor(auraId: string): string {
  return AURA_COLORS[auraId] ?? AURA_COLORS[DEFAULT_AURA_ID];
}
