// Interface del motor del Chat con el Sistema. Capa enchufable: hoy solo existe el motor por
// plantillas (templateEngine), determinista y disponible por OTA; el motor LLM (llamaEngine) queda
// como stub para un build nativo posterior (5B). El store consume esta interface sin saber qué motor
// hay detrás.

import type { SystemContext } from '@/core/aiContext';
import type { SystemReply } from '@/core/systemVoice';

export interface SystemChatEngine {
  readonly id: 'template' | 'llama';
  isReady(): boolean;
  greeting(ctx: SystemContext): SystemReply;
  reply(ctx: SystemContext, userMessage: string): SystemReply;
}
