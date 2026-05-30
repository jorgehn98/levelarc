// Motor por plantillas: implementación determinista de SystemChatEngine sobre la voz del Sistema
// (core/systemVoice). Siempre listo, JS puro, offline e instantáneo. Es el motor por defecto y el
// fallback del motor LLM mientras este no esté disponible.

import { getSystemGreeting, getSystemReply } from '@/core/systemVoice';

import type { SystemChatEngine } from './engine';

export const templateEngine: SystemChatEngine = {
  id: 'template',
  isReady: () => true,
  greeting: (ctx) => getSystemGreeting(ctx),
  reply: (ctx, userMessage) => getSystemReply(ctx, userMessage),
};
