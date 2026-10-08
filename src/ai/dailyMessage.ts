// Mensaje del día del Sistema (banner de Hoy). Módulo PURO: la clave de vigencia y el parseo del
// cache viven aquí para poder testearlos sin AsyncStorage.

// Import relativo a propósito: Vitest no resuelve el alias `@/` para imports de valor.
import { getDailyStateSignature } from '../core/systemVoice';
import type { SystemContext } from '@/core/aiContext';
import type { Language } from '@/i18n';

// `key` identifica para qué se escribió el texto (día + idioma + estado del día). `fromAi` indica si
// lo generó el LLM local (true) o las plantillas (false), para mostrar el distintivo.
export type DailyMessage = {
  key: string;
  text: string;
  fromAi: boolean;
};

// Un mensaje solo vale mientras no cambie nada de esto: al cambiar el día, el idioma o el estado del
// día (p. ej. de "quedan 2" a "todo hecho") hay que regenerarlo. El estado va resumido en una firma
// gruesa para no reinferir con el LLM por cambios que no alteran lo que diría.
export function buildDailyMessageKey(date: string, language: Language, ctx: SystemContext): string {
  return `${date}|${language}|${getDailyStateSignature(ctx)}`;
}

// Lee el JSON cacheado. Devuelve null si está corrupto o tiene el formato antiguo (sin `key`): en ese
// caso simplemente se regenera.
export function parseCachedDailyMessage(raw: string | null): DailyMessage | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<DailyMessage> | null;
    if (
      typeof parsed?.key === 'string' &&
      typeof parsed.text === 'string' &&
      typeof parsed.fromAi === 'boolean'
    ) {
      return { key: parsed.key, text: parsed.text, fromAi: parsed.fromAi };
    }
    return null;
  } catch {
    return null;
  }
}
