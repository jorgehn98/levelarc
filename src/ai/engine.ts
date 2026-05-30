// Interface del motor del Chat con el Sistema. Capa enchufable: el motor por plantillas
// (templateEngine) es determinista y vive en JS; el motor LLM (llamaEngine) usa llama.rn nativo y es
// asíncrono (carga del modelo + inferencia). El store consume esta interface sin saber qué motor hay
// detrás. greeting/reply son async (el LLM tarda) y reciben `language` para que el LLM responda en el
// idioma correcto; el motor por plantillas lo ignora (su bilingüismo vive en i18n vía la clave).

import type { Language } from '@/i18n';
import type { SystemContext } from '@/core/aiContext';
import type { InterjectionTrigger, SystemReply } from '@/core/systemVoice';

// Nota de contexto opcional que el chat hereda de una aparición del Sistema: por qué empezó la
// conversación. Solo el motor LLM la usa (la añade al prompt); el motor por plantillas la ignora.
export interface ChatContextNote {
  trigger: InterjectionTrigger;
}

export interface SystemChatEngine {
  readonly id: 'template' | 'llama';
  isReady(): boolean;
  greeting(ctx: SystemContext, language: Language): Promise<SystemReply>;
  // contextNote: si el chat arranca tras una aparición del Sistema, el motivo de la misma. El motor
  // LLM lo incorpora al prompt para dar continuidad; el de plantillas lo ignora.
  reply(ctx: SystemContext, userMessage: string, language: Language, contextNote?: ChatContextNote): Promise<SystemReply>;
  // Aparición autónoma del Sistema ante un evento del juego (no responde a un mensaje del usuario).
  interjection(ctx: SystemContext, trigger: InterjectionTrigger, language: Language): Promise<SystemReply>;
}
