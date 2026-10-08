// Versión del formato de backup. v2 añade la hora real de cada claim de misión
// (`reclamada_en`, `streak_bonus_reclamado_en`), admite saldo de Esencia negativo y limita el
// historial de chat. v1 se sigue leyendo: lo que le falta se deriva al importar.
const BACKUP_VERSION = 2;
const READABLE_VERSIONS = [1, BACKUP_VERSION];

type BackupPayload = {
  version: number;
  exportedAt: string;
  data: unknown;
};

// JSON compacto: la sangría duplicaba el tamaño de un texto que se comparte y se pega a mano.
export function serializeBackupPayload(data: unknown): string {
  const payload: BackupPayload = { version: BACKUP_VERSION, exportedAt: new Date().toISOString(), data };
  return JSON.stringify(payload);
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

  if (!READABLE_VERSIONS.includes(parsed.version as number)) {
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
