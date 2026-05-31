// Gestión del fichero del modelo LLM local (descarga / borrado / existencia). Usa la API NUEVA de
// expo-file-system SDK 56 (File / Directory / Paths). Todo esto es SOLO nativo: en web no hay sistema
// de ficheros persistente para un GGUF de ~3,1 GB ni motor llama.rn, así que las funciones devuelven
// valores seguros (sin existencia, sin descarga) y nunca rompen el bundle web.
//
// El import de expo-file-system es seguro en cualquier plataforma (tiene implementación web), pero la
// descarga del LLM no aplica en web; por eso cada función guarda con Platform.OS.

import { Platform } from 'react-native';
import { Directory, File, Paths } from 'expo-file-system';

import {
  MODEL_HASH_NAME,
  MODEL_NAME,
  MODEL_SHA256,
  MODEL_SIZE_BYTES,
  MODEL_URL,
  formatModelSize,
  MODEL_DISPLAY_NAME,
} from '@/ai/modelMetadata';
import { Sha256 } from '@/lib/sha256';

export { MODEL_DISPLAY_NAME, formatModelSize };

// Subcarpeta dentro del directorio de documentos (persistente, no la borra el sistema).
const MODELS_DIR = 'models';

// True solo en nativo. En web cortamos antes de tocar el sistema de ficheros del LLM.
const isNative = Platform.OS !== 'web';

// Directorio `models/` dentro de Paths.document. Se crea perezosamente con ensureModelsDir().
function getModelsDir(): Directory {
  return new Directory(Paths.document, MODELS_DIR);
}

// Crea la carpeta `models/` si no existe. Idempotente: si ya existe, no hace nada.
function ensureModelsDir(): void {
  const dir = getModelsDir();
  if (!dir.exists) {
    dir.create({ intermediates: true });
  }
}

// Referencia al fichero del modelo (exista o no en disco). Interno: solo lo usan modelExists,
// downloadModel y deleteModel dentro de este módulo.
function getModelFile(): File {
  return new File(Paths.document, MODELS_DIR, MODEL_NAME);
}

function getModelHashFile(): File {
  return new File(Paths.document, MODELS_DIR, MODEL_HASH_NAME);
}

// ¿Está el modelo descargado? En web siempre false.
export function modelExists(): boolean {
  if (!isNative) return false;
  const file = getModelFile();
  const hashFile = getModelHashFile();
  return file.exists && file.size === MODEL_SIZE_BYTES && hashFile.exists && hashFile.textSync().trim() === MODEL_SHA256;
}

async function hashFile(file: File): Promise<string> {
  const hasher = new Sha256();
  const reader = file.readableStream().getReader();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) hasher.update(value);
    }
  } finally {
    reader.releaseLock();
  }

  return hasher.digestHex();
}

async function validateAndStampModel(file: File): Promise<void> {
  if (!file.exists || file.size !== MODEL_SIZE_BYTES) {
    throw new Error('Downloaded model has invalid size');
  }

  const digest = await hashFile(file);
  if (digest !== MODEL_SHA256) {
    throw new Error('Downloaded model failed SHA-256 check');
  }

  getModelHashFile().write(digest);
}

// Descarga el modelo con progreso (ratio 0..1) y soporte de cancelación vía AbortSignal.
// Devuelve la uri del fichero descargado. En web lanza: la IA avanzada no aplica ahí.
// Si ya existe un fichero (posible descarga parcial/corrupta previa), lo borra antes de redescargar.
export async function downloadModel(
  onProgress: (ratio: number) => void,
  signal?: AbortSignal,
): Promise<string> {
  if (!isNative) {
    throw new Error('Model download is only available on native platforms');
  }

  ensureModelsDir();
  const file = getModelFile();
  if (file.exists) {
    file.delete();
  }
  const hashFile = getModelHashFile();
  if (hashFile.exists) {
    hashFile.delete();
  }

  const task = File.createDownloadTask(MODEL_URL, file, {
    onProgress: ({ bytesWritten, totalBytes }) => {
      // totalBytes es -1 si el servidor no envía Content-Length; en ese caso no podemos calcular un
      // ratio fiable, así que dejamos el progreso quieto (la UI muestra el último valor conocido).
      if (totalBytes > 0) {
        onProgress(bytesWritten / totalBytes);
      }
    },
    signal,
  });

  await task.downloadAsync();
  try {
    await validateAndStampModel(file);
  } catch (error) {
    file.delete();
    if (hashFile.exists) hashFile.delete();
    throw error;
  }
  return file.uri;
}

// Borra el modelo del disco si existe. No-op en web o si no hay fichero.
export function deleteModel(): void {
  if (!isNative) return;
  const file = getModelFile();
  if (file.exists) {
    file.delete();
  }
  const hashFile = getModelHashFile();
  if (hashFile.exists) {
    hashFile.delete();
  }
}
