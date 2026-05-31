// Metadatos del GGUF local. Mantener esto separado del gestor de ficheros permite testear los valores
// críticos sin importar expo-file-system en Vitest.

export const MODEL_URL =
  'https://huggingface.co/unsloth/gemma-4-E2B-it-GGUF/resolve/main/gemma-4-E2B-it-Q4_K_M.gguf';
export const MODEL_NAME = 'gemma-4-E2B-it-Q4_K_M.gguf';
export const MODEL_STAMP_NAME = `${MODEL_NAME}.ok`;

// Tamaño exacto publicado por Hugging Face para este GGUF.
// Ojo: si Hugging Face cambia el fichero, actualizar esto o la descarga fallará al finalizar.
export const MODEL_SIZE_BYTES = 3_106_736_256;

// Nombre legible del modelo, para mostrarlo en la UI sin acoplar el texto al ID del fichero.
export const MODEL_DISPLAY_NAME = 'Gemma 4 E2B';

// Tamaño formateado para la UI usando GB decimales, que es lo que esperan los usuarios al hablar de
// descargas grandes. Evita el antiguo cálculo MiB/1024 que mostraba 3,0 GB para un fichero de 3,1 GB.
export function formatModelSize(language: 'es' | 'en'): string {
  const gb = (MODEL_SIZE_BYTES / 1_000_000_000).toFixed(1);
  const decimal = language === 'es' ? gb.replace('.', ',') : gb;
  return `${decimal} GB`;
}
