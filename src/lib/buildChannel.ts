// Predicado PURO de "build interno", separado de buildInfo.ts para poder testearlo sin expo-updates.
//
// Lista de PERMITIDOS, no de excluidos: solo cuentan como internos el modo desarrollo y los canales
// de QA conocidos. Cualquier otro valor (incluido "sin canal") es build de usuario. Importa porque en
// Android el canal ausente llega como cadena vacía, no null, y expo-updates arranca sin cabeceras si
// falla su almacenamiento: con una regla "todo lo que no sea production" un build de tienda en ese
// estado enseñaría el diagnóstico.
const INTERNAL_CHANNELS = ['preview', 'development'];

export function isInternalChannel(isDev: boolean, channel: string | null | undefined): boolean {
  return isDev || (typeof channel === 'string' && INTERNAL_CHANNELS.includes(channel));
}
