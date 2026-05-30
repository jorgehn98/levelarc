// Gestión del fichero del modelo LLM local (descarga / borrado / existencia). Usa la API NUEVA de
// expo-file-system SDK 56 (File / Directory / Paths). Todo esto es SOLO nativo: en web no hay sistema
// de ficheros persistente para un GGUF de ~806 MB ni motor llama.rn, así que las funciones devuelven
// valores seguros (sin existencia, sin descarga) y nunca rompen el bundle web.
//
// El import de expo-file-system es seguro en cualquier plataforma (tiene implementación web), pero la
// descarga del LLM no aplica en web; por eso cada función guarda con Platform.OS.

import { Platform } from 'react-native';
import { Directory, File, Paths } from 'expo-file-system';

// URL pública (redirige a la CDN de Hugging Face) y nombre del fichero. El modelo pesa ~806 MB.
export const MODEL_URL =
  'https://huggingface.co/unsloth/gemma-3-1b-it-GGUF/resolve/main/gemma-3-1b-it-Q4_K_M.gguf';
export const MODEL_NAME = 'gemma-3-1b-it-Q4_K_M.gguf';
// Tamaño aproximado en MB, para mostrarlo en la UI sin hardcodear el número en la pantalla.
export const MODEL_SIZE_MB = 806;

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

// Referencia al fichero del modelo (exista o no en disco).
export function getModelFile(): File {
  return new File(Paths.document, MODELS_DIR, MODEL_NAME);
}

// ¿Está el modelo descargado? En web siempre false.
export function modelExists(): boolean {
  if (!isNative) return false;
  return getModelFile().exists;
}

// URI del modelo si existe, null si no (o en web). Es lo que consume resolveEngine para construir el
// llamaEngine (necesita la ruta del .gguf).
export function getModelUri(): string | null {
  if (!isNative) return null;
  const file = getModelFile();
  return file.exists ? file.uri : null;
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
  return file.uri;
}

// Borra el modelo del disco si existe. No-op en web o si no hay fichero.
export function deleteModel(): void {
  if (!isNative) return;
  const file = getModelFile();
  if (file.exists) {
    file.delete();
  }
}
