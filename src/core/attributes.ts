import { getLevelProgress } from './ranks';

export const attributeIds = ['fuerza', 'vitalidad', 'intelecto', 'voluntad', 'carisma', 'destreza'] as const;

export type AttributeId = (typeof attributeIds)[number];
export type AttributeXp = Record<AttributeId, number>;

const defaultHabitAttributes: AttributeId[] = ['voluntad'];
const attributeXpMultiplier = 1.5;
export const maxHabitAttributes = 3;

const attributeSet = new Set<string>(attributeIds);

export function createEmptyAttributeXp(): AttributeXp {
  return {
    fuerza: 0,
    vitalidad: 0,
    intelecto: 0,
    voluntad: 0,
    carisma: 0,
    destreza: 0,
  };
}

export function normalizeHabitAttributes(value: unknown): AttributeId[] {
  const rawValues = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value.split(',')
      : [];
  const normalized: AttributeId[] = [];

  for (const item of rawValues) {
    const id = String(item).trim();
    if (attributeSet.has(id) && !normalized.includes(id as AttributeId)) {
      normalized.push(id as AttributeId);
    }
    if (normalized.length >= maxHabitAttributes) break;
  }

  return normalized.length > 0 ? normalized : defaultHabitAttributes;
}

export function serializeHabitAttributes(value: unknown): string {
  return normalizeHabitAttributes(value).join(',');
}

export function normalizeAttributeXp(value: unknown): AttributeXp {
  const empty = createEmptyAttributeXp();
  if (typeof value === 'string' && value.trim()) {
    try {
      return normalizeAttributeXp(JSON.parse(value));
    } catch {
      return empty;
    }
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return empty;

  const record = value as Record<string, unknown>;
  for (const id of attributeIds) {
    const raw = record[id];
    const number = typeof raw === 'number' ? raw : Number(raw);
    empty[id] = Number.isFinite(number) ? Math.max(0, roundAttributeXp(number)) : 0;
  }
  return empty;
}

export function serializeAttributeXp(value: unknown): string {
  return JSON.stringify(normalizeAttributeXp(value));
}

export function getAttributeDeltas(xpDelta: number, attributes: unknown): AttributeXp {
  const ids = normalizeHabitAttributes(attributes);
  const delta = roundAttributeXp((Math.max(0, xpDelta) * attributeXpMultiplier) / ids.length);
  const result = createEmptyAttributeXp();

  for (const id of ids) {
    result[id] = delta;
  }
  return result;
}

export function applyAttributeDeltas(current: unknown, deltas: unknown): AttributeXp {
  const next = normalizeAttributeXp(current);
  const normalizedDeltas = normalizeAttributeXp(deltas);

  for (const id of attributeIds) {
    next[id] = roundAttributeXp(next[id] + normalizedDeltas[id]);
  }
  return next;
}

export function getAttributeLevelProgress(totalXp: number) {
  const xp = Math.max(0, roundAttributeXp(totalXp));
  const progress = getLevelProgress(xp);

  return {
    level: progress.level,
    totalXp: xp,
    gainedInLevel: roundAttributeXp(progress.gainedInLevel),
    neededForLevel: progress.neededForLevel,
    ratio: progress.ratio,
  };
}

function roundAttributeXp(value: number) {
  return Math.round(value * 100) / 100;
}
