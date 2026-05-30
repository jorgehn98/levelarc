import { create } from 'zustand';

import { getActiveEngine } from '@/ai';
import { t } from '@/i18n';
import {
  addAiMessage,
  buildSystemContext,
  clearAiMessages,
  getAiProfile,
  listAiMessages,
  setAiEnabled,
  type AiEngine,
  type AiMessage,
  type AiModelStatus,
} from '@/db/repository';
import type { SystemReply } from '@/core/systemVoice';

import { useAppStore } from './appStore';

type AiProfileState = {
  enabled: boolean;
  engine: AiEngine;
  modelStatus: AiModelStatus;
};

type AiState = {
  messages: AiMessage[];
  profile: AiProfileState;
  isGenerating: boolean;
  isReady: boolean;
  loadAi: () => Promise<void>;
  openChat: () => Promise<void>;
  sendMessage: (text: string) => Promise<void>;
  clearChat: () => Promise<void>;
  setEnabled: (enabled: boolean) => Promise<void>;
};

// Resuelve una respuesta abstracta del motor (clave i18n + params) a texto en el idioma activo del
// appStore. El bilingüismo vive aquí: el engine/core nunca importa i18n y el texto se persiste ya
// resuelto en el idioma en que se generó. t() cae al español si la clave no existe en el idioma
// activo; si no existe en NINGÚN idioma, t() reventaría (replace sobre undefined), así que lo
// envolvemos y devolvemos un fallback seguro con la voz del Sistema en vez de propagar.
function resolveReply(reply: SystemReply): string {
  const language = useAppStore.getState().language;
  try {
    return t(language, reply.key as Parameters<typeof t>[1], reply.params);
  } catch {
    return t(language, 'systemChatError');
  }
}

export const useAiStore = create<AiState>((set, get) => ({
  messages: [],
  profile: { enabled: false, engine: 'template', modelStatus: 'none' },
  isGenerating: false,
  isReady: false,
  loadAi: async () => {
    const [profile, messages] = await Promise.all([getAiProfile(), listAiMessages()]);
    set({
      profile: { enabled: profile.enabled, engine: profile.engine, modelStatus: profile.modelStatus },
      messages,
      isReady: true,
    });
  },
  openChat: async () => {
    // Evita duplicar saludos: si ya hay historial, no genera otro de apertura. Solo arranca el chat
    // con un saludo proactivo cuando está vacío.
    const existing = await listAiMessages();
    if (existing.length > 0) {
      set({ messages: existing, isReady: true });
      return;
    }
    const engine = getActiveEngine(get().profile.engine);
    const ctx = await buildSystemContext();
    const text = resolveReply(engine.greeting(ctx));
    await addAiMessage('assistant', text);
    const messages = await listAiMessages();
    set({ messages, isReady: true });
  },
  sendMessage: async (text) => {
    const trimmed = text.trim();
    if (!trimmed || get().isGenerating) return;

    await addAiMessage('user', trimmed);
    set({ messages: await listAiMessages(), isGenerating: true });

    try {
      const engine = getActiveEngine(get().profile.engine);
      const ctx = await buildSystemContext();
      const reply = resolveReply(engine.reply(ctx, trimmed));
      await addAiMessage('assistant', reply);
      set({ messages: await listAiMessages() });
    } catch {
      // La pantalla llama con `void sendMessage(...)`, así que sin catch un fallo quedaría como
      // unhandled rejection silenciosa. Registramos un mensaje de error del Sistema para que el
      // usuario vea feedback en lugar de silencio.
      const language = useAppStore.getState().language;
      await addAiMessage('assistant', t(language, 'systemChatError'));
      set({ messages: await listAiMessages() });
    } finally {
      set({ isGenerating: false });
    }
  },
  clearChat: async () => {
    await clearAiMessages();
    set({ messages: [] });
  },
  setEnabled: async (enabled) => {
    await setAiEnabled(enabled);
    const profile = await getAiProfile();
    set({ profile: { enabled: profile.enabled, engine: profile.engine, modelStatus: profile.modelStatus } });
  },
}));
