import { BackupFormatError } from './backupValidation';

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

// JSON compacto: la sangría duplicaba el tamaño del fichero sin que nadie lo lea a mano.
export function serializeBackupPayload(data: unknown): string {
  const payload: BackupPayload = { version: BACKUP_VERSION, exportedAt: new Date().toISOString(), data };
  return JSON.stringify(payload);
}

export function parseBackupPayload(raw: string): BackupPayload {
  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new BackupFormatError('Invalid backup JSON');
  }

  if (!isRecord(parsed)) {
    throw new BackupFormatError('Invalid backup payload');
  }

  if (!READABLE_VERSIONS.includes(parsed.version as number)) {
    // Un número mayor es un backup de una app más nueva; cualquier otra cosa no es un backup.
    const isNewer = typeof parsed.version === 'number' && parsed.version > BACKUP_VERSION;
    throw new BackupFormatError(`Unsupported backup version: ${String(parsed.version)}`, isNewer ? 'version' : 'invalid');
  }

  if (typeof parsed.exportedAt !== 'string' || !isRecord(parsed.data)) {
    throw new BackupFormatError('Invalid backup payload');
  }

  return parsed as BackupPayload;
}

// Clave i18n del motivo por el que falló una importación. Lo que no sea un problema del fichero
// (lectura, escritura en la base) cae en el motivo genérico.
export function getImportFailureReasonKey(error: unknown) {
  if (!(error instanceof BackupFormatError)) return 'importReasonUnknown';
  if (error.reason === 'version') return 'importReasonVersion';
  if (error.reason === 'tooLarge') return 'importReasonTooLarge';
  return 'importReasonInvalid';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
