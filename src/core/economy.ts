// Esencia (Essence): moneda de juego gastable. En esta fase solo se gana y se muestra.
// Reglas puras, sin imports de RN/db, para poder testearlas en aislamiento.

export const PERFECT_WEEK_ESSENCE = 25;

export function getCompletionEssence(importance: number): number {
  return Math.max(0, Math.round(importance)) * 2;
}

export function getMissionEssence(target: number): number {
  const safeTarget = Math.max(0, Math.floor(target));
  if (safeTarget <= 0) return 0;
  if (safeTarget === 1) return 3;
  if (safeTarget <= 3) return 5;
  if (safeTarget <= 5) return 8;
  return 12;
}

export function getPerfectWeekEssence(): number {
  return PERFECT_WEEK_ESSENCE;
}

export function getLevelUpEssence(level: number): number {
  if (!Number.isFinite(level) || level <= 1) return 0;
  return 10 + (Math.floor(level) - 1) * 5;
}

export function getLevelUpEssenceBetween(fromLevel: number, toLevel: number): number {
  const from = Math.floor(fromLevel);
  const to = Math.floor(toLevel);
  if (to <= from) return 0;

  let total = 0;
  for (let level = from + 1; level <= to; level += 1) {
    total += getLevelUpEssence(level);
  }
  return total;
}
