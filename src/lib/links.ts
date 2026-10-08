import type { Language } from '@/i18n';

const WEBSITE = 'https://levelarc.app';

export const CONTACT_EMAIL = 'hola@levelarc.app';

// Páginas legales de la web en el idioma de la app. El español vive en la raíz y el inglés en /en/.
export function getLegalUrl(language: Language, page: 'privacy' | 'terms'): string {
  return `${WEBSITE}${language === 'en' ? '/en' : ''}/${page}/`;
}
