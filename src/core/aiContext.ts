// Contexto determinista del Chat con el Sistema. Módulo PURO y testeable: sin imports de RN, db ni
// i18n como valor. El repository arma este SystemContext leyendo SQLite; la voz del Sistema
// (systemVoice) decide qué decir a partir de él. `buildSystemContextText` lo serializa a un texto
// compacto y estable, útil como prompt para el LLM en 5B.

import type { Rank } from '@/theme/colors';

export interface SystemContext {
  nombre: string | null;
  nivel: number;
  rango: Rank;
  esencia: number;
  ratioNivel: number; // 0..1, progreso dentro del nivel actual
  faltaParaNivel: number; // XP que falta para el siguiente nivel
  rachaMisiones: number;
  atributoTop: { id: string; nivel: number } | null;
  habitosHoyTotal: number;
  completadosHoy: number;
  pendientesHoy: number;
  falladosHoy: number;
  diaPerfecto: boolean;
  mejorRachaHabito: number;
  rachaPerfecta: number;
}

// Serializa el contexto a líneas `clave: valor` deterministas. El orden es fijo para que el mismo
// contexto produzca siempre el mismo texto (clave para tests y para un prompt reproducible).
export function buildSystemContextText(ctx: SystemContext): string {
  const lines = [
    `nombre: ${ctx.nombre ?? '-'}`,
    `nivel: ${ctx.nivel}`,
    `rango: ${ctx.rango}`,
    `esencia: ${ctx.esencia}`,
    `progreso_nivel: ${Math.round(ctx.ratioNivel * 100)}%`,
    `falta_para_nivel: ${ctx.faltaParaNivel}`,
    `racha_misiones: ${ctx.rachaMisiones}`,
    `atributo_top: ${ctx.atributoTop ? `${ctx.atributoTop.id} (nivel ${ctx.atributoTop.nivel})` : '-'}`,
    `habitos_hoy: ${ctx.habitosHoyTotal}`,
    `completados_hoy: ${ctx.completadosHoy}`,
    `pendientes_hoy: ${ctx.pendientesHoy}`,
    `fallados_hoy: ${ctx.falladosHoy}`,
    `dia_perfecto: ${ctx.diaPerfecto ? 'si' : 'no'}`,
    `mejor_racha_habito: ${ctx.mejorRachaHabito}`,
    `racha_perfecta: ${ctx.rachaPerfecta}`,
  ];
  return lines.join('\n');
}
