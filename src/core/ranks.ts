import type { Rank } from '@/theme/colors';

const LEVEL_CURVE_BASE = 30;
const LEVEL_CURVE_EXPONENT = 1.6;

const rankThresholds: { rank: Rank; minLevel: number }[] = [
  { rank: 'S', minLevel: 100 },
  { rank: 'A', minLevel: 70 },
  { rank: 'B', minLevel: 45 },
  { rank: 'C', minLevel: 25 },
  { rank: 'D', minLevel: 10 },
  { rank: 'E', minLevel: 1 },
];

// Orden ascendente de rangos (E < D < C < B < A < S), derivado del umbral de nivel para no
// duplicar la fuente de verdad. Útil para comparar rangos (requisitos de tienda, etc.).
export const RANK_ORDER: Rank[] = rankThresholds
  .slice()
  .sort((a, b) => a.minLevel - b.minLevel)
  .map(({ rank }) => rank);

// Devuelve negativo si a < b, cero si iguales, positivo si a > b, según RANK_ORDER.
export function compareRanks(a: Rank, b: Rank): number {
  return RANK_ORDER.indexOf(a) - RANK_ORDER.indexOf(b);
}

export function getXpForLevel(level: number): number {
  if (!Number.isFinite(level) || level <= 1) {
    return 0;
  }

  return Math.ceil(LEVEL_CURVE_BASE * Math.pow(level - 1, LEVEL_CURVE_EXPONENT));
}

export function getLevelFromXp(totalXp: number): number {
  const safeXp = Math.max(0, Math.floor(totalXp));
  let level = 1;

  while (safeXp >= getXpForLevel(level + 1)) {
    level += 1;
  }

  return level;
}

function getRankForLevel(level: number): Rank {
  const safeLevel = Math.max(1, Math.floor(level));
  return rankThresholds.find(({ minLevel }) => safeLevel >= minLevel)?.rank ?? 'E';
}

export function getLevelProgress(totalXp: number) {
  const level = getLevelFromXp(totalXp);
  const currentFloor = getXpForLevel(level);
  const nextFloor = getXpForLevel(level + 1);
  const gainedInLevel = Math.max(0, totalXp - currentFloor);
  const neededForLevel = Math.max(1, nextFloor - currentFloor);

  return {
    level,
    rank: getRankForLevel(level),
    currentFloor,
    nextFloor,
    gainedInLevel,
    neededForLevel,
    ratio: Math.min(1, gainedInLevel / neededForLevel),
  };
}
