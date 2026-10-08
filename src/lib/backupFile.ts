import { BackupFormatError } from './backupValidation';
import { toDateKey } from './date';

// Parte pura del backup en fichero: nombre, limpieza de exportaciones viejas y tope de tamaño.

const BACKUP_FILE_PREFIX = 'levelarc-backup-';
const BACKUP_FILE_EXTENSION = '.json';

export const BACKUP_MIME_TYPE = 'application/json';

// Un backup dentro de los límites de BACKUP_LIMITS no pasa de unas decenas de MB. Por encima de
// este tope el fichero no puede ser válido y leerlo entero en memoria solo arriesga cerrar la app.
export const MAX_BACKUP_FILE_BYTES = 50 * 1024 * 1024;

// Fecha local del dispositivo: es la que el usuario espera ver en el nombre.
export function getBackupFileName(date = new Date()): string {
  return `${BACKUP_FILE_PREFIX}${toDateKey(date)}${BACKUP_FILE_EXTENSION}`;
}

// ¿Es un fichero de exportación generado por la app? Sirve para borrar los anteriores de la caché.
export function isBackupExportFile(name: string): boolean {
  return name.startsWith(BACKUP_FILE_PREFIX) && name.endsWith(BACKUP_FILE_EXTENSION);
}

// Lanza si el fichero elegido no puede ser un backup por tamaño. Un tamaño desconocido (el selector
// no siempre lo da) no bloquea: lo decide la validación del contenido.
export function assertBackupFileSize(size: number | null | undefined): void {
  if (typeof size === 'number' && size > MAX_BACKUP_FILE_BYTES) {
    throw new BackupFormatError('Backup file too large', 'tooLarge');
  }
}
