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
  MODEL_NAME,
  MODEL_SIZE_BYTES,
  MODEL_STAMP_NAME,
  MODEL_URL,
  formatModelSize,
  MODEL_DISPLAY_NAME,
} from '@/ai/modelMetadata';

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

function getModelStampFile(): File {
  return new File(Paths.document, MODELS_DIR, MODEL_STAMP_NAME);
}

// ¿Está el modelo descargado? En web siempre false.
export function modelExists(): boolean {
  if (!isNative) return false;
  const file = getModelFile();
  const stampFile = getModelStampFile();
  return file.exists && file.size === MODEL_SIZE_BYTES && stampFile.exists;
}

function validateAndStampModel(file: File): void {
  if (!file.exists || file.size !== MODEL_SIZE_BYTES) {
    throw new Error('Downloaded model has invalid size');
  }

  // No calculamos SHA-256 aquí: hacerlo en JS sobre ~3,1 GB bloquea el cierre de la descarga en
  // Android y deja la UI clavada en 100%. `downloadAsync()` + tamaño exacto cubre parciales, y el
  // stamp evita marcar como listo un fichero viejo que no haya pasado esta validación.
  getModelStampFile().write(String(MODEL_SIZE_BYTES));
}

// Recupera una descarga completa que se quedó en estado "downloading" antes de escribir el stamp.
// Esto evita obligar al usuario a redescargar 3,1 GB si el fichero ya estaba entero en disco.
export function recoverDownloadedModel(): string | null {
  if (!isNative) return null;
  const file = getModelFile();
  try {
    validateAndStampModel(file);
    return file.uri;
  } catch {
    return null;
  }
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
  const stampFile = getModelStampFile();
  if (stampFile.exists) {
    stampFile.delete();
  }

  const task = File.createDownloadTask(MODEL_URL, file, {
    onProgress: ({ bytesWritten, totalBytes }) => {
      // totalBytes es -1 si el servidor no envía Content-Length; en ese caso no podemos calcular un
      // ratio fiable, así que dejamos el progreso quieto (la UI muestra el último valor conocido).
      if (totalBytes > 0) {
        // Reservamos el 100% para cuando `downloadAsync()` ya terminó y el fichero pasó la
        // validación ligera. Así la UI no parece colgada en 100% durante el cierre del stream.
        onProgress(Math.min(bytesWritten / totalBytes, 0.99));
      }
    },
    signal,
  });

  await task.downloadAsync();
  try {
    validateAndStampModel(file);
  } catch (error) {
    file.delete();
    if (stampFile.exists) stampFile.delete();
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
  const stampFile = getModelStampFile();
  if (stampFile.exists) {
    stampFile.delete();
  }
}
