// Interface del motor del Chat con el Sistema. Capa enchufable: el motor por plantillas
// (templateEngine) es determinista y vive en JS; el motor LLM (llamaEngine) usa llama.rn nativo y es
// asíncrono (carga del modelo + inferencia). El store consume esta interface sin saber qué motor hay
// detrás. greeting/reply son async (el LLM tarda) y reciben `language` para que el LLM responda en el
// idioma correcto; el motor por plantillas lo ignora (su bilingüismo vive en i18n vía la clave).

import type { Language } from '@/i18n';
import type { SystemContext } from '@/core/aiContext';
import type { SystemReply } from '@/core/systemVoice';

export interface SystemChatEngine {
  readonly id: 'template' | 'llama';
  isReady(): boolean;
  greeting(ctx: SystemContext, language: Language): Promise<SystemReply>;
  reply(ctx: SystemContext, userMessage: string, language: Language): Promise<SystemReply>;
}
