// Motor por plantillas: implementación determinista de SystemChatEngine sobre la voz del Sistema
// (core/systemVoice). Siempre listo, JS puro, offline e instantáneo. Es el motor por defecto y el
// fallback del motor LLM mientras este no esté disponible. La lógica es síncrona; envolvemos en
// Promise.resolve para cumplir la interface async sin coste real. Ignora `language`: su bilingüismo
// vive en i18n (devuelve { kind: 'key' } y el store resuelve la clave en el idioma activo).

import { getSystemGreeting, getSystemReply } from '@/core/systemVoice';

import type { SystemChatEngine } from './engine';

export const templateEngine: SystemChatEngine = {
  id: 'template',
  isReady: () => true,
  greeting: (ctx) => Promise.resolve(getSystemGreeting(ctx)),
  reply: (ctx, userMessage) => Promise.resolve(getSystemReply(ctx, userMessage)),
};
