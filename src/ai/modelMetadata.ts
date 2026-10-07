// Metadatos del GGUF local. Mantener esto separado del gestor de ficheros permite testear los valores
// críticos sin importar expo-file-system en Vitest.

export const MODEL_NAME = 'gemma-4-E2B-it-Q4_K_M.gguf';
export const MODEL_STAMP_NAME = `${MODEL_NAME}.ok`;

// Revisión (commit) de Hugging Face a la que se ancla la descarga. NO usar `resolve/main`: el
// publicador resube el fichero (lo hizo el 2026-07-17, +2 016 bytes por una plantilla de chat nueva) y
// entonces la validación por tamaño exacto falla al 100% tras bajar 3,1 GB. Una revisión es inmutable.
// Para actualizar el modelo: cambiar a la vez MODEL_REVISION y MODEL_SIZE_BYTES (el `size` que da
// https://huggingface.co/api/models/unsloth/gemma-4-E2B-it-GGUF/tree/<revisión>) y revalidar en device.
// SHA-256 (LFS) del fichero en esta revisión: 9378bc471710229ef165709b62e34bfb62231420ddaf6d729e727305b5b8672d
const MODEL_REVISION = '739965d73654c0ead8020786aa998fc813070087';
export const MODEL_URL = `https://huggingface.co/unsloth/gemma-4-E2B-it-GGUF/resolve/${MODEL_REVISION}/${MODEL_NAME}`;

// Tamaño exacto del GGUF en MODEL_REVISION. Va atado a esa revisión, no a `main`.
export const MODEL_SIZE_BYTES = 3_106_736_256;

// Margen libre exigido además del tamaño del modelo antes de descargar: el sistema necesita aire
// para seguir funcionando (SQLite, cachés, OTA) y Android degrada con el disco casi lleno.
const MODEL_FREE_SPACE_MARGIN_BYTES = 500_000_000;
const MODEL_REQUIRED_FREE_BYTES = MODEL_SIZE_BYTES + MODEL_FREE_SPACE_MARGIN_BYTES;

// ¿Cabe el modelo? Un valor no fiable del sistema (NaN, negativo) NO bloquea: preferimos intentar la
// descarga y que falle por disco a impedirla por una lectura rota.
export function hasEnoughSpaceForModel(availableBytes: number): boolean {
  if (!Number.isFinite(availableBytes) || availableBytes < 0) return true;
  return availableBytes >= MODEL_REQUIRED_FREE_BYTES;
}

// Nombre legible del modelo, para mostrarlo en la UI sin acoplar el texto al ID del fichero.
export const MODEL_DISPLAY_NAME = 'Gemma 4 E2B';

// GB decimales, que es lo que esperan los usuarios al hablar de descargas grandes. Evita el antiguo
// cálculo MiB/1024 que mostraba 3,0 GB para un fichero de 3,1 GB.
function formatGigabytes(bytes: number, language: 'es' | 'en'): string {
  const gb = (bytes / 1_000_000_000).toFixed(1);
  const decimal = language === 'es' ? gb.replace('.', ',') : gb;
  return `${decimal} GB`;
}

export function formatModelSize(language: 'es' | 'en'): string {
  return formatGigabytes(MODEL_SIZE_BYTES, language);
}

// Espacio libre que pedimos antes de descargar (modelo + margen), para el aviso de "sin espacio".
export function formatModelRequiredSpace(language: 'es' | 'en'): string {
  return formatGigabytes(MODEL_REQUIRED_FREE_BYTES, language);
}
