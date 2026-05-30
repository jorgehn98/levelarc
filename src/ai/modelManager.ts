// Gestión del fichero del modelo LLM local (descarga / borrado / existencia). Usa la API NUEVA de
// expo-file-system SDK 56 (File / Directory / Paths). Todo esto es SOLO nativo: en web no hay sistema
// de ficheros persistente para un GGUF de ~3,1 GB ni motor llama.rn, así que las funciones devuelven
// valores seguros (sin existencia, sin descarga) y nunca rompen el bundle web.
//
// El import de expo-file-system es seguro en cualquier plataforma (tiene implementación web), pero la
// descarga del LLM no aplica en web; por eso cada función guarda con Platform.OS.

import { Platform } from 'react-native';
import { Directory, File, Paths } from 'expo-file-system';

// URL pública (redirige a la CDN de Hugging Face) y nombre del fichero. Modelo Gemma 4 E2B (~3,1 GB).
// Uso interno del módulo (la descarga y la ruta del fichero); no se exportan.
const MODEL_URL =
  'https://huggingface.co/unsloth/gemma-4-E2B-it-GGUF/resolve/main/gemma-4-E2B-it-Q4_K_M.gguf';
const MODEL_NAME = 'gemma-4-E2B-it-Q4_K_M.gguf';
// Tamaño aproximado en MB, para mostrarlo en la UI sin hardcodear el número en la pantalla. Interno:
// la UI consume formatModelSize, no este número crudo.
const MODEL_SIZE_MB = 3106;
// Nombre legible del modelo, para mostrarlo en la UI sin acoplar el texto al ID del fichero.
export const MODEL_DISPLAY_NAME = 'Gemma 4 E2B';

// Tamaño formateado para la UI. A partir de ~1 GB lo mostramos en GB con un decimal (es: "3,1 GB",
// en: "3.1 GB"); por debajo, en MB. Evita mostrar "3106 MB", que es poco legible.
export function formatModelSize(language: 'es' | 'en'): string {
  if (MODEL_SIZE_MB < 1024) return `${MODEL_SIZE_MB} MB`;
  const gb = (MODEL_SIZE_MB / 1024).toFixed(1);
  const decimal = language === 'es' ? gb.replace('.', ',') : gb;
  return `${decimal} GB`;
}

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

// ¿Está el modelo descargado? En web siempre false.
export function modelExists(): boolean {
  if (!isNative) return false;
  return getModelFile().exists;
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
