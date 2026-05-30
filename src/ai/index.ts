// Selector del motor activo del Chat con el Sistema. Devuelve el motor LLM (llama.rn) solo si el
// perfil lo pide, el modelo está listo, hay ruta y NO estamos en web; en cualquier otro caso cae al
// motor por plantillas, que es SIEMPRE un fallback seguro.
//
// Es async porque cargar el llamaEngine implica un dynamic import (`./llamaEngine`, que a su vez
// importa el nativo llama.rn). Ese import PEREZOSO garantiza que el flujo de plantillas y la web
// nunca arrastren llama.rn: si las condiciones no se cumplen, jamás se evalúa el módulo del LLM.

import { Platform } from 'react-native';

import { templateEngine } from './templateEngine';

import type { AiEngine, AiModelStatus } from '@/db/repository';
import type { SystemChatEngine } from './engine';

export type { SystemChatEngine } from './engine';
export { templateEngine } from './templateEngine';

// Perfil mínimo que necesita el selector para decidir motor.
export type EngineProfile = {
  engine: AiEngine;
  modelStatus: AiModelStatus;
  modelPath: string | null;
};

// ¿Procede el motor LLM real? Solo en nativo, con engine 'llama', modelo 'ready' y ruta presente.
function shouldUseLlama(profile: EngineProfile): profile is EngineProfile & { modelPath: string } {
  return (
    Platform.OS !== 'web' &&
    profile.engine === 'llama' &&
    profile.modelStatus === 'ready' &&
    !!profile.modelPath
  );
}

// Resuelve el motor activo. Carga el llamaEngine de forma perezosa (dynamic import) únicamente
// cuando procede; si el import falla por cualquier motivo, cae a plantillas para no romper el chat.
export async function resolveEngine(profile: EngineProfile): Promise<SystemChatEngine> {
  if (!shouldUseLlama(profile)) return templateEngine;
  try {
    const { createLlamaEngine } = await import('./llamaEngine');
    return createLlamaEngine(profile.modelPath);
  } catch (err) {
    if (__DEV__) console.warn('[ai] resolveEngine: fallo cargando llamaEngine, degradando a plantillas', err);
    return templateEngine;
  }
}
