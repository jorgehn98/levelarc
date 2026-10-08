import Constants from 'expo-constants';
import * as Updates from 'expo-updates';

import { isInternalChannel } from './buildChannel';

// ¿Build interno (desarrollo o QA)? Solo modo desarrollo o los canales `preview` / `development` de
// EAS Update. Sirve para enseñar diagnóstico técnico (versiones, trazas, botones de prueba) solo a
// quien lo necesita; el usuario final nunca debe verlo. Un build sin canal reconocible cuenta como
// build de usuario (ver buildChannel.ts): ante la duda, el diagnóstico se oculta.
export function isInternalBuild(): boolean {
  return isInternalChannel(__DEV__, Updates.channel);
}

// Versión de la app y número de build nativo (versionCode en Android). En web y en desarrollo no hay
// build nativo.
export function getAppVersionInfo(): { version: string; build: string } {
  return {
    version: Constants.expoConfig?.version ?? 'dev',
    build: Constants.nativeBuildVersion ?? 'dev',
  };
}
