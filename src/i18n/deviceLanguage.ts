import type { Language } from './index';

// Idioma inicial de la app. Una preferencia guardada siempre gana; sin ella se sigue el idioma del
// dispositivo: inglés si el locale es `en*`, español en cualquier otro caso (es el idioma base).
export function resolveInitialLanguage(storedLanguage: string | null, deviceLocale: string | undefined): Language {
  if (storedLanguage === 'es' || storedLanguage === 'en') return storedLanguage;
  return /^en([-_]|$)/i.test(deviceLocale ?? '') ? 'en' : 'es';
}

// Locale del dispositivo sin dependencias: Hermes y los navegadores lo exponen por Intl.
export function getDeviceLocale(): string | undefined {
  try {
    return Intl.DateTimeFormat().resolvedOptions().locale;
  } catch {
    return undefined;
  }
}
