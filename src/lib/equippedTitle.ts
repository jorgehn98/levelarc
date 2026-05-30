// Presentación del título equipado: traduce el id guardado en el jugador a su nombre legible.
// Devuelve null si no hay título equipado o si el id ya no existe en el catálogo.

import { getShopItem } from '@/core/shop';
import { t, type Language } from '@/i18n';

export function getEquippedTitle(tituloEquipado: string | null, language: Language): string | null {
  if (!tituloEquipado) return null;
  const item = getShopItem(tituloEquipado);
  return item ? t(language, item.nameKey as Parameters<typeof t>[1]) : null;
}
