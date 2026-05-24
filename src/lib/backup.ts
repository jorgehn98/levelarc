const BACKUP_VERSION = 1;

export type BackupPayload = {
  version: typeof BACKUP_VERSION;
  exportedAt: string;
  data: unknown;
};

export function createBackupPayload(data: unknown): BackupPayload {
  return {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    data,
  };
}

export function parseBackupPayload(raw: string): BackupPayload {
  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('Invalid backup JSON');
  }

  if (!isRecord(parsed)) {
    throw new Error('Invalid backup payload');
  }

  if (parsed.version !== BACKUP_VERSION) {
    throw new Error(`Unsupported backup version: ${String(parsed.version)}`);
  }

  if (typeof parsed.exportedAt !== 'string' || !isRecord(parsed.data)) {
    throw new Error('Invalid backup payload');
  }

  return parsed as BackupPayload;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
