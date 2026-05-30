import type { ImageSourcePropType } from 'react-native';

import type { InterjectionTone } from '@/core/systemVoice';
import { colors } from '@/theme/colors';

// Sistema de poses ENCHUFABLE del personaje del Sistema (las "Apariciones del Sistema"). Cada tono
// de aparición mapea a una pose: un color de acento (glow/borde) y, opcionalmente, un sprite.
//
// PARA ENCHUFAR EL PERSONAJE ANIME (sprites reales):
//   1) Añade PNG SIN FONDO (transparente) en assets/character/ con estos nombres exactos:
//        assets/character/celebrate.png
//        assets/character/serious.png
//        assets/character/neutral.png
//   2) Descomenta el `source: require(...)` de la pose correspondiente aquí abajo.
//   3) Listo: el overlay usará el sprite. Si `source` es undefined, cae al emblema placeholder
//      (assets/brand/levelarc-emblem-detailed-transparent.png) con el glow del tono.
//
// El acento sigue el mismo criterio de tono que la voz del Sistema (src/core/systemVoice.ts):
//   celebrate → verde (logro), serious → rojo (corrección), neutral → cian (identidad de marca).
export const CHARACTER_POSES: Record<InterjectionTone, { source?: ImageSourcePropType; accent: string }> = {
  celebrate: {
    // source: require('../../assets/character/celebrate.png'),
    accent: colors.state.completed,
  },
  serious: {
    // source: require('../../assets/character/serious.png'),
    accent: colors.state.failed,
  },
  neutral: {
    // source: require('../../assets/character/neutral.png'),
    accent: colors.brand.cyanCore,
  },
};

// Emblema de marca usado como avatar placeholder mientras no haya sprites del personaje.
export const PLACEHOLDER_POSE_SOURCE: ImageSourcePropType = require('../../assets/brand/levelarc-emblem-detailed-transparent.png');

// Devuelve la pose de un tono con el sprite ya resuelto: el del personaje si existe, o el emblema.
export function getCharacterPose(tone: InterjectionTone): { source: ImageSourcePropType; accent: string } {
  const pose = CHARACTER_POSES[tone];
  return { source: pose.source ?? PLACEHOLDER_POSE_SOURCE, accent: pose.accent };
}
