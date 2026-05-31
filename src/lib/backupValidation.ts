export const BACKUP_LIMITS = {
  habits: 500,
  events: 50_000,
  habitDailyProgress: 100_000,
  dailyMissions: 5_000,
  playerRewards: 1_000,
  achievementsUnlocked: 1_000,
  aiMessages: 1_000,
  stringLength: 8_000,
  aiMessageLength: 4_000,
};

export function asLimitedBackupArray(value: unknown, label = 'array', maxItems = Number.POSITIVE_INFINITY): unknown[] {
  if (!Array.isArray(value)) return [];
  if (value.length > maxItems) throw new Error(`Backup ${label} limit exceeded`);
  return value;
}

export function boundedBackupString(value: string, maxLength = BACKUP_LIMITS.stringLength): string {
  if (value.length > maxLength) throw new Error('Backup field too large');
  return value;
}
