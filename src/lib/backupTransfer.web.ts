// Backup como fichero en la previsualización web: exportar descarga el JSON y importar usa el
// selector de ficheros del navegador. Misma interfaz que `backupTransfer.ts`.

import * as DocumentPicker from 'expo-document-picker';

import { BACKUP_MIME_TYPE, assertBackupFileSize, getBackupFileName } from './backupFile';

export class ShareUnavailableError extends Error {}

export async function shareBackupFile(json: string): Promise<void> {
  const url = URL.createObjectURL(new Blob([json], { type: BACKUP_MIME_TYPE }));
  const link = document.createElement('a');
  link.href = url;
  link.download = getBackupFileName();
  link.click();
  URL.revokeObjectURL(url);
}

// En el navegador la cancelación no se notifica: la promesa puede quedar sin resolver, así que quien
// llama no debe bloquear nada mientras espera.
export async function pickBackupFile(): Promise<string | null> {
  const result = await DocumentPicker.getDocumentAsync({ type: BACKUP_MIME_TYPE, base64: false });
  if (result.canceled) return null;

  const file = result.assets[0]?.file;
  if (!file) return null;

  assertBackupFileSize(file.size);
  return file.text();
}
