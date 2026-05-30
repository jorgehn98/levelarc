// Adapter del LLM local (llama.rn). Pendiente de development build; ver docs/IA. Por ahora delega en
// plantillas: requiere un binario nativo nuevo (no entra por OTA ni funciona en Expo Go), así que en
// 5A queda como stub no listo. isReady() === false hace que getActiveEngine nunca lo seleccione; aun
// así greeting/reply delegan en templateEngine para que jamás rompan si alguien lo invoca directo.

import { templateEngine } from './templateEngine';

import type { SystemChatEngine } from './engine';

export const llamaEngine: SystemChatEngine = {
  id: 'llama',
  isReady: () => false,
  greeting: (ctx) => templateEngine.greeting(ctx),
  reply: (ctx, userMessage) => templateEngine.reply(ctx, userMessage),
};
