import * as Updates from 'expo-updates';

// ¿Build interno (desarrollo o QA)? Todo lo que no llegue por el canal `production` de EAS Update:
// dev client, Expo Go y APK preview. Sirve para enseñar diagnóstico técnico (versiones, trazas,
// botones de prueba) solo a quien lo necesita; el usuario final nunca debe verlo.
// Ojo: un build de release hecho a mano SIN canal configurado (`Updates.channel === null`) cuenta
// como interno. Los builds de tienda deben salir del perfil `production` de eas.json.
export function isInternalBuild(): boolean {
  return __DEV__ || Updates.channel !== 'production';
}
