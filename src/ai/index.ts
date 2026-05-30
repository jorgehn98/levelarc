// Selector del motor activo del Chat con el Sistema. Devuelve el motor LLM si el perfil lo pide Y
// está listo; en cualquier otro caso cae al motor por plantillas. Mientras llamaEngine sea un stub
// (isReady() === false) esto siempre acaba en templateEngine.

import { llamaEngine } from './llamaEngine';
import { templateEngine } from './templateEngine';

import type { SystemChatEngine } from './engine';

export type { SystemChatEngine } from './engine';
export { templateEngine } from './templateEngine';
export { llamaEngine } from './llamaEngine';

export function getActiveEngine(profileEngine: 'template' | 'llama'): SystemChatEngine {
  if (profileEngine === 'llama' && llamaEngine.isReady()) return llamaEngine;
  return templateEngine;
}
