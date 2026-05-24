import AsyncStorage from '@react-native-async-storage/async-storage';

import { DAILY_MISSION_BONUS_XP, DAILY_MISSION_TARGET } from '@/core/missions';
import { getLevelProgress } from '@/core/ranks';
import { applyXpDelta, getCompletionXp, getFailureXp, type HabitImportance } from '@/core/xp';
import {
  applyAttributeDeltas,
  createEmptyAttributeXp,
  getAttributeDeltas,
  normalizeAttributeXp,
  serializeAttributeXp,
  serializeHabitAttributes,
  type AttributeXp,
} from '@/core/attributes';
import { toDateKey, toIsoTimestamp } from '@/lib/date';
import { normalizeHabitIcon } from '@/lib/habitIcons';
import { createId } from '@/lib/id';
import type { Rank } from '@/theme/colors';

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
  actualizadoEn: string;
};

export type DailyMissionRecord = {
  fecha: string;
  objetivo: number;
  completados: number;
  reclamada: boolean;
  xpBonus: number;
};

export type EventRecord = {
  id: string;
  habitId: string;
  fecha: string;
  tipoEvento: EventType;
  xpDelta: number;
  attributeDelta: AttributeXp;
  registradoEn: string;
  habitName?: string;
};

type DailyProgressRecord = {
  id: string;
  habitId: string;
  fecha: string;
  cantidad: number;
  estado: ProgressState;
  actualizadoEn: string;
};

type WebDb = {
  habits: HabitRecord[];
  events: EventRecord[];
  progress: DailyProgressRecord[];
  player: PlayerRecord;
  missions: DailyMissionRecord[];
};

const KEY = 'levelarc.webdb.v1';

export async function initializeDatabase() {
  await saveDb(await loadDb());
  await ensureDailyMission(toDateKey());
}

export async function listHabits(includeArchived = false) {
  const db = await loadDb();
  return db.habits
    .filter((habit) => includeArchived || !habit.archivado)
    .sort((a, b) => b.creadoEn.localeCompare(a.creadoEn));
}

export async function listTodayHabits(dateKey = toDateKey()): Promise<TodayHabit[]> {
  const db = await loadDb();
  const weekday = new Date(`${dateKey}T12:00:00`).getDay();
  const levelArcWeekday = weekday === 0 ? 7 : weekday;
  return db.habits
    .filter((habit) => !habit.archivado && habit.diasSemana.split(',').map(Number).includes(levelArcWeekday))
    .sort((a, b) => b.creadoEn.localeCompare(a.creadoEn))
    .map((habit) => {
      const progress = db.progress.find((item) => item.habitId === habit.id && item.fecha === dateKey);
      return { ...habit, cantidad: progress?.cantidad ?? 0, estado: progress?.estado ?? 'pendiente' };
    });
}

export async function getHabit(id: string) {
  const db = await loadDb();
  return db.habits.find((habit) => habit.id === id) ?? null;
}

export async function createHabit(input: HabitInput) {
  const db = await loadDb();
  const id = createId();
  db.habits.push({
    id,
    nombre: input.nombre.trim(),
    icono: normalizeHabitIcon(input.icono),
    atributos: serializeHabitAttributes(input.atributos),
    importancia: input.importancia,
    tipo: input.tipo,
    meta: input.tipo === 'binario' ? 1 : Math.max(1, Math.floor(input.meta)),
    diasSemana: input.diasSemana,
    horaRecordatorio: input.horaRecordatorio,
    notificationId: null,
    archivado: false,
    creadoEn: toIsoTimestamp(),
  });
  await saveDb(db);
  return id;
}

export async function updateHabit(id: string, input: HabitInput) {
  const db = await loadDb();
  db.habits = db.habits.map((habit) =>
    habit.id === id
      ? {
          ...habit,
          nombre: input.nombre.trim(),
          icono: normalizeHabitIcon(input.icono),
          atributos: serializeHabitAttributes(input.atributos),
          importancia: input.importancia,
          tipo: input.tipo,
          meta: input.tipo === 'binario' ? 1 : Math.max(1, Math.floor(input.meta)),
          diasSemana: input.diasSemana,
          horaRecordatorio: input.horaRecordatorio,
        }
      : habit,
  );
  await saveDb(db);
}

export async function archiveHabit(id: string) {
  const db = await loadDb();
  db.habits = db.habits.map((habit) => (habit.id === id ? { ...habit, archivado: true } : habit));
  await saveDb(db);
}

export async function incrementHabitProgress(habitId: string, dateKey = toDateKey()) {
  const db = await loadDb();
  const habit = db.habits.find((item) => item.id === habitId);
  if (!habit) return;
  const progress = getOrCreateProgress(db, habitId, dateKey);
  if (progress.estado !== 'pendiente') return;

  progress.cantidad = Math.min(habit.meta, progress.cantidad + 1);
  progress.actualizadoEn = toIsoTimestamp();
  if (progress.cantidad >= habit.meta) {
    const xpDelta = getCompletionXp(habit.importancia, 1);
    const attributeDelta = getAttributeDeltas(xpDelta, habit.atributos);
    db.player.xpTotal = applyXpDelta(db.player.xpTotal, xpDelta);
    db.player.atributosXp = applyAttributeDeltas(db.player.atributosXp, attributeDelta);
    syncPlayer(db);
    progress.estado = 'completado';
    db.events.push(createEvent(habit, dateKey, 'completado', xpDelta, attributeDelta));
    syncMission(db, dateKey);
  }
  await saveDb(db);
}

export async function markHabitFailed(habitId: string, dateKey = toDateKey()) {
  const db = await loadDb();
  const habit = db.habits.find((item) => item.id === habitId);
  if (!habit) return;
  const progress = getOrCreateProgress(db, habitId, dateKey);
  if (progress.estado !== 'pendiente' || progress.cantidad > 0) return;

  const xpDelta = getFailureXp(habit.importancia);
  const nextXp = applyXpDelta(db.player.xpTotal, xpDelta);
  progress.estado = 'fallado';
  progress.actualizadoEn = toIsoTimestamp();
  db.events.push(createEvent(habit, dateKey, 'fallado', nextXp - db.player.xpTotal));
  db.player.xpTotal = nextXp;
  syncPlayer(db);
  await saveDb(db);
}

export async function closeDay(dateKey = toDateKey()) {
  const today = await listTodayHabits(dateKey);
  for (const habit of today) {
    if (habit.estado === 'pendiente' && habit.cantidad === 0) {
      await markHabitFailed(habit.id, dateKey);
    }
  }
}

export async function undoTodayHabit(habitId: string, dateKey = toDateKey()) {
  const db = await loadDb();
  db.events = db.events.filter((event) => !(event.habitId === habitId && event.fecha === dateKey));
  db.progress = db.progress.filter((progress) => !(progress.habitId === habitId && progress.fecha === dateKey));
  db.player.xpTotal = 0;
  db.player.atributosXp = createEmptyAttributeXp();
  for (const event of db.events.sort((a, b) => a.registradoEn.localeCompare(b.registradoEn))) {
    db.player.xpTotal = applyXpDelta(db.player.xpTotal, event.xpDelta);
    db.player.atributosXp = applyAttributeDeltas(db.player.atributosXp, event.attributeDelta);
  }
  syncPlayer(db);
  syncMission(db, dateKey);
  await saveDb(db);
}

export async function getPlayer() {
  const db = await loadDb();
  return db.player;
}

export async function updatePlayerName(name: string) {
  const db = await loadDb();
  db.player.nombre = normalizePlayerName(name);
  db.player.actualizadoEn = toIsoTimestamp();
  await saveDb(db);
}

export async function getDailyMission(dateKey = toDateKey()) {
  const db = await loadDb();
  const mission = ensureMission(db, dateKey);
  syncMission(db, dateKey);
  await saveDb(db);
  return mission;
}

export async function claimDailyMission(dateKey = toDateKey()) {
  const db = await loadDb();
  const mission = ensureMission(db, dateKey);
  syncMission(db, dateKey);
  if (mission.reclamada || mission.completados < mission.objetivo) return;
  mission.reclamada = true;
  db.player.xpTotal = applyXpDelta(db.player.xpTotal, mission.xpBonus);
  db.player.rachaMisiones += 1;
  syncPlayer(db);
  await saveDb(db);
}

export async function getRecentEvents(limit = 25) {
  const db = await loadDb();
  return db.events.slice().sort((a, b) => b.registradoEn.localeCompare(a.registradoEn)).slice(0, limit);
}

export async function exportAllData() {
  return loadDb();
}

export async function importAllData(data: unknown) {
  await saveDb(normalizeBackupData(data));
  await ensureDailyMission(toDateKey());
}

async function ensureDailyMission(dateKey: string) {
  const db = await loadDb();
  ensureMission(db, dateKey);
  syncMission(db, dateKey);
  await saveDb(db);
}

function getOrCreateProgress(db: WebDb, habitId: string, dateKey: string) {
  let progress = db.progress.find((item) => item.habitId === habitId && item.fecha === dateKey);
  if (!progress) {
    progress = { id: createId(), habitId, fecha: dateKey, cantidad: 0, estado: 'pendiente', actualizadoEn: toIsoTimestamp() };
    db.progress.push(progress);
  }
  return progress;
}

function ensureMission(db: WebDb, dateKey: string) {
  let mission = db.missions.find((item) => item.fecha === dateKey);
  if (!mission) {
    mission = { fecha: dateKey, objetivo: DAILY_MISSION_TARGET, completados: 0, reclamada: false, xpBonus: DAILY_MISSION_BONUS_XP };
    db.missions.push(mission);
  }
  return mission;
}

function syncMission(db: WebDb, dateKey: string) {
  const mission = ensureMission(db, dateKey);
  mission.completados = db.progress.filter((item) => item.fecha === dateKey && item.estado === 'completado').length;
}

function syncPlayer(db: WebDb) {
  const progress = getLevelProgress(db.player.xpTotal);
  db.player.nivel = progress.level;
  db.player.rango = progress.rank;
  db.player.actualizadoEn = toIsoTimestamp();
}

function createEvent(
  habit: HabitRecord,
  dateKey: string,
  tipoEvento: EventType,
  xpDelta: number,
  attributeDelta = createEmptyAttributeXp(),
): EventRecord {
  return {
    id: createId(),
    habitId: habit.id,
    habitName: habit.nombre,
    fecha: dateKey,
    tipoEvento,
    xpDelta,
    attributeDelta,
    registradoEn: toIsoTimestamp(),
  };
}

async function loadDb(): Promise<WebDb> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return createEmptyDb();
  const empty = createEmptyDb();
  const parsed = JSON.parse(raw) as Partial<WebDb>;
  const db = { ...empty, ...parsed, player: { ...empty.player, ...parsed.player } };
  db.habits = db.habits.map((habit) => ({
    ...habit,
    icono: normalizeHabitIcon(habit.icono),
    atributos: serializeHabitAttributes(habit.atributos),
  }));
  db.events = db.events.map((event) => ({ ...event, attributeDelta: normalizeAttributeXp(event.attributeDelta) }));
  db.player.atributosXp = normalizeAttributeXp(db.player.atributosXp);
  return db;
}

async function saveDb(db: WebDb) {
  await AsyncStorage.setItem(KEY, JSON.stringify(db));
}

function createEmptyDb(): WebDb {
  const progress = getLevelProgress(0);
  return {
    habits: [],
    events: [],
    progress: [],
    player: {
      nombre: null,
      xpTotal: 0,
      nivel: progress.level,
      rango: progress.rank,
      rachaMisiones: 0,
      atributosXp: createEmptyAttributeXp(),
      actualizadoEn: toIsoTimestamp(),
    },
    missions: [],
  };
}

function normalizeBackupData(data: unknown): WebDb {
  if (!isRecord(data)) throw new Error('Invalid backup data');
  const empty = createEmptyDb();
  const habits = asArray(data.habits).map(normalizeHabit);
  const events = asArray(data.events).map(normalizeEvent);
  const progress = asArray(data.habitDailyProgress ?? data.progress).map(normalizeProgress);
  const player = normalizePlayer(asArray(data.player)[0] ?? data.player) ?? empty.player;
  const missions = asArray(data.dailyMissions ?? data.missions).map(normalizeMission);

  return { habits, events, progress, player, missions };
}

function normalizeHabit(row: unknown): HabitRecord {
  if (!isRecord(row)) throw new Error('Invalid habit row');
  const tipo = row.tipo === 'contable' ? 'contable' : 'binario';
  return {
    id: asString(row.id),
    nombre: asString(row.nombre).trim(),
    icono: normalizeHabitIcon(row.icono ?? row.icon),
    atributos: serializeHabitAttributes(row.atributos ?? row.attributes),
    importancia: clampImportance(asNumber(row.importancia)),
    tipo,
    meta: tipo === 'binario' ? 1 : Math.max(1, Math.floor(asNumber(row.meta))),
    diasSemana: asString((row.dias_semana ?? row.diasSemana) || '1,2,3,4,5,6,7'),
    horaRecordatorio: nullableString(row.hora_recordatorio ?? row.horaRecordatorio),
    notificationId: null,
    archivado: asBoolean(row.archivado),
    creadoEn: asString((row.creado_en ?? row.creadoEn) || toIsoTimestamp()),
  };
}

function normalizeProgress(row: unknown): DailyProgressRecord {
  if (!isRecord(row)) throw new Error('Invalid progress row');
  return {
    id: asString(row.id),
    habitId: asString(row.habit_id ?? row.habitId),
    fecha: asString(row.fecha),
    cantidad: Math.max(0, Math.floor(asNumber(row.cantidad))),
    estado: normalizeProgressState(row.estado),
    actualizadoEn: asString((row.actualizado_en ?? row.actualizadoEn) || toIsoTimestamp()),
  };
}

function normalizeEvent(row: unknown): EventRecord {
  if (!isRecord(row)) throw new Error('Invalid event row');
  return {
    id: asString(row.id),
    habitId: asString(row.habit_id ?? row.habitId),
    habitName: typeof row.nombre === 'string' ? row.nombre : typeof row.habitName === 'string' ? row.habitName : undefined,
    fecha: asString(row.fecha),
    tipoEvento: row.tipo_evento === 'fallado' || row.tipoEvento === 'fallado' ? 'fallado' : 'completado',
    xpDelta: asNumber(row.xp_delta ?? row.xpDelta),
    attributeDelta: normalizeAttributeXp(row.attribute_delta ?? row.attributeDelta),
    registradoEn: asString((row.registrado_en ?? row.registradoEn) || toIsoTimestamp()),
  };
}

function normalizeMission(row: unknown): DailyMissionRecord {
  if (!isRecord(row)) throw new Error('Invalid mission row');
  return {
    fecha: asString(row.fecha),
    objetivo: Math.max(1, Math.floor(asNumber(row.objetivo))),
    completados: Math.max(0, Math.floor(asNumber(row.completados))),
    reclamada: asBoolean(row.reclamada),
    xpBonus: Math.max(0, Math.floor(asNumber(row.xp_bonus ?? row.xpBonus))),
  };
}

function normalizePlayer(row: unknown): PlayerRecord | null {
  if (!isRecord(row)) return null;
  const xpTotal = asNumber(row.xp_total ?? row.xpTotal);
  const progress = getLevelProgress(xpTotal);
  return {
    nombre: nullableString(row.nombre ?? row.name),
    xpTotal,
    nivel: Math.max(1, Math.floor(asNumber(row.nivel ?? progress.level))),
    rango: isRank(row.rango) ? row.rango : progress.rank,
    rachaMisiones: Math.max(0, Math.floor(asNumber(row.racha_misiones ?? row.rachaMisiones))),
    atributosXp: normalizeAttributeXp(row.atributos_xp ?? row.atributosXp ?? row.attributeXp),
    actualizadoEn: asString((row.actualizado_en ?? row.actualizadoEn) || toIsoTimestamp()),
  };
}

function normalizePlayerName(name: string) {
  const trimmed = name.trim().slice(0, 24);
  if (trimmed.length < 2) {
    throw new Error('Invalid player name');
  }
  return trimmed;
}

function normalizeProgressState(value: unknown): ProgressState {
  if (value === 'completado' || value === 'fallado') return value;
  return 'pendiente';
}

function clampImportance(value: number): HabitImportance {
  if (value <= 1) return 1;
  if (value >= 5) return 5;
  return Math.round(value) as HabitImportance;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asString(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error('Invalid backup field');
  return value;
}

function nullableString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

function asNumber(value: unknown): number {
  const number = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(number)) throw new Error('Invalid backup number');
  return number;
}

function asBoolean(value: unknown): boolean {
  return value === true || value === 1;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isRank(value: unknown): value is Rank {
  return value === 'E' || value === 'D' || value === 'C' || value === 'B' || value === 'A' || value === 'S';
}
