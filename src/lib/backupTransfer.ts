// Backup como fichero en nativo: exportar escribe un JSON en la caché y lo comparte por su URI;
// importar abre el selector de documentos del sistema. Compartir el backup como texto topaba con el
// límite de ~1 MB de los intents de Android. `backupTransfer.web.ts` es el equivalente del navegador.

import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { BACKUP_MIME_TYPE, assertBackupFileSize, getBackupFileName, isBackupExportFile } from './backupFile';

// El dispositivo no puede abrir la hoja de compartir. Error propio para avisar con ese motivo.
export class ShareUnavailableError extends Error {
  constructor() {
    super('Sharing is not available on this device');
    this.name = 'ShareUnavailableError';
  }
}

// Algunos gestores de ficheros y nubes etiquetan un .json como texto o binario genérico; con solo
// application/json el fichero saldría deshabilitado en el selector.
const PICKABLE_TYPES = [BACKUP_MIME_TYPE, 'text/plain', 'application/octet-stream'];

function deleteQuietly(file: File): void {
  try {
    if (file.exists) file.delete();
  } catch {
    // La caché la limpia el sistema; no merece fallar por esto.
  }
}

// Escribe el backup en la caché y abre la hoja de compartir. Antes borra las exportaciones
// anteriores: llevan todos los datos del usuario y no deben acumularse. La promesa se resuelve
// cuando el usuario cierra la hoja; el sistema no dice si llegó a guardar el fichero.
export async function shareBackupFile(json: string, dialogTitle: string): Promise<void> {
  if (!(await Sharing.isAvailableAsync())) throw new ShareUnavailableError();

  for (const entry of Paths.cache.list()) {
    if (entry instanceof File && isBackupExportFile(entry.name)) deleteQuietly(entry);
  }

  const file = new File(Paths.cache, getBackupFileName());
  file.write(json);
  await Sharing.shareAsync(file.uri, { mimeType: BACKUP_MIME_TYPE, dialogTitle, UTI: 'public.json' });
}

// Abre el selector y devuelve el texto del fichero elegido, o null si el usuario cancela. Lanza
// BackupFormatError si el fichero es demasiado grande para ser un backup.
export async function pickBackupFile(): Promise<string | null> {
  const result = await DocumentPicker.getDocumentAsync({ type: PICKABLE_TYPES, copyToCacheDirectory: true });
  if (result.canceled) return null;

  const asset = result.assets[0];
  if (!asset) return null;

  // El selector deja una copia en la caché: se lee y se borra.
  const file = new File(asset.uri);
  try {
    assertBackupFileSize(asset.size ?? file.size);
    return await file.text();
  } finally {
    deleteQuietly(file);
  }
}
