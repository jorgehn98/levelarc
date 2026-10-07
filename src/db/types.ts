import type { AttributeXp } from '@/core/attributes';
import type { HabitImportance } from '@/core/xp';
import type { Rank } from '@/theme/colors';

// Tipos públicos del repositorio. Los comparten la implementación nativa (repository.ts), el
// fallback web (repository.web.ts) y la validación de backups, así que no pueden divergir.

export type HabitType = 'binario' | 'contable';
export type ProgressState = 'pendiente' | 'completado' | 'fallado';
export type EventType = 'completado' | 'fallado';

export type HabitRecord = {
  id: string;
  nombre: string;
  icono: string;
  atributos: string;
  importancia: HabitImportance;
  tipo: HabitType;
  meta: number;
  diasSemana: string;
  horaRecordatorio: string | null;
  notificationId: string | null;
  archivado: boolean;
  creadoEn: string;
};

export type HabitInput = {
  nombre: string;
  icono: string;
  atributos: string;
  importancia: HabitImportance;
  tipo: HabitType;
  meta: number;
  diasSemana: string;
  horaRecordatorio: string | null;
};

export type TodayHabit = HabitRecord & {
  cantidad: number;
  estado: ProgressState;
};

export type PlayerRecord = {
  nombre: string | null;
  xpTotal: number;
  nivel: number;
  rango: Rank;
  rachaMisiones: number;
  atributosXp: AttributeXp;
  // Saldo gastable, nunca negativo aquí: el saldo guardado puede serlo tras gastar y deshacer.
  esencia: number;
  nivelEsenciaOtorgado: number;
  tituloEquipado: string | null;
  auraEquipada: string;
  actualizadoEn: string;
};

export type PurchaseResult = { ok: boolean; reason?: 'unknown' | 'owned' | 'locked' | 'insufficient' };
export type EquipResult = { ok: boolean; reason?: 'unknown' | 'notOwned' };

export type DailyMissionRecord = {
  fecha: string;
  objetivo: number;
  completados: number;
  reclamada: boolean;
  xpBonus: number;
  perfectStreakDays: number;
  streakBonusClaimed: boolean;
  streakBonusXp: number;
  esenciaOtorgada: number;
  // Instante real del claim (ISO). Ordena los bonus dentro del ledger al recalcular el jugador.
  reclamadaEn: string | null;
  streakBonusReclamadoEn: string | null;
};

export type EventRecord = {
  id: string;
  habitId: string;
  fecha: string;
  tipoEvento: EventType;
  xpDelta: number;
  attributeDelta: AttributeXp;
  esenciaOtorgada: number;
  registradoEn: string;
  habitName?: string;
};

export type AiEngine = 'template' | 'llama';
export type AiModelStatus = 'none' | 'downloading' | 'ready' | 'error';
export type AiRole = 'system' | 'user' | 'assistant';

export type AiProfile = {
  enabled: boolean;
  engine: AiEngine;
  modelStatus: AiModelStatus;
  modelPath: string | null;
  actualizadoEn: string;
};

export type AiMessage = {
  id: string;
  rol: AiRole;
  contenido: string;
  fecha: string;
  creadoEn: string;
};

export type DailyProgressRecord = {
  id: string;
  habitId: string;
  fecha: string;
  cantidad: number;
  estado: ProgressState;
  actualizadoEn: string;
};

export type RewardRecord = {
  id: string;
  rewardId: string;
  kind: string;
  adquiridoEn: string;
};

export type AchievementUnlockedRecord = {
  id: string;
  achievementId: string;
  desbloqueadoEn: string;
};

type HabitDayStatus = ProgressState | 'no_programado';

export type HabitInsightDay = {
  fecha: string;
  weekday: number;
  status: HabitDayStatus;
  cantidad: number;
  meta: number;
};

export type HabitInsightRecord = {
  today: HabitInsightDay;
  currentStreak: number;
  consistency30: {
    completed: number;
    scheduled: number;
    failed: number;
    ratio: number;
  };
  last7: HabitInsightDay[];
  recentEvents: EventRecord[];
};
