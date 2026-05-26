import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  DAILY_MISSION_BONUS_XP,
  PERFECT_WEEK_BONUS_XP,
  getClaimedDailyMissionStreak,
  getDailyMissionBonus,
} from '@/core/missions';
import { getLevelProgress } from '@/core/ranks';
import { getScheduledCompletionStreak } from '@/core/streaks';
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
  perfectStreakDays: number;
  streakBonusClaimed: boolean;
  streakBonusXp: number;
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

export async function resetAllData() {
  const db = createEmptyDb();
  ensureMission(db, toDateKey());
  syncMission(db, toDateKey());
  await saveDb(db);
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

export async function getHabitInsight(id: string, dateKey = toDateKey()): Promise<HabitInsightRecord | null> {
  const db = await loadDb();
  const habit = db.habits.find((item) => item.id === id);
  if (!habit) return null;

  const days = getDateWindow(dateKey, 30).map((day) => {
    const progress = db.progress.find((item) => item.habitId === id && item.fecha === day);
    return getHabitInsightDay(habit, day, progress);
  });
  const scheduledDays = days.filter((day) => day.status !== 'no_programado');
  const completed = scheduledDays.filter((day) => day.status === 'completado').length;
  const failed = scheduledDays.filter((day) => day.status === 'fallado').length;
  const today = days[days.length - 1];
  const currentStreak = getCurrentHabitStreak(db, habit, today);
  const recentEvents = db.events
    .filter((event) => event.habitId === id)
    .sort((a, b) => b.registradoEn.localeCompare(a.registradoEn))
    .slice(0, 10);

  return {
    today,
    currentStreak,
    consistency30: {
      completed,
      scheduled: scheduledDays.length,
      failed,
      ratio: scheduledDays.length > 0 ? completed / scheduledDays.length : 0,
    },
    last7: days.slice(-8, -1).reverse(),
    recentEvents,
  };
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

export async function unarchiveHabit(id: string) {
  const db = await loadDb();
  db.habits = db.habits.map((habit) => (habit.id === id ? { ...habit, archivado: false } : habit));
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
    const streakDays = getHabitCompletionStreak(db, habit.id, dateKey, habit.diasSemana);
    const xpDelta = getCompletionXp(habit.importancia, streakDays + 1);
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
  syncMission(db, dateKey);
  recalculatePlayerFromLedger(db);
  await saveDb(db);
}

function recalculatePlayerFromLedger(db: WebDb) {
  db.player.xpTotal = 0;
  db.player.atributosXp = createEmptyAttributeXp();
  const ledger = [
    ...db.events.map((event) => ({
      attributeDelta: event.attributeDelta,
      registradoEn: event.registradoEn,
      xpDelta: event.xpDelta,
    })),
    ...db.missions.flatMap((mission) => [
      ...(mission.reclamada
        ? [{ attributeDelta: createEmptyAttributeXp(), registradoEn: `${mission.fecha}T23:59:59.000Z`, xpDelta: mission.xpBonus }]
        : []),
      ...(mission.streakBonusClaimed
        ? [{ attributeDelta: createEmptyAttributeXp(), registradoEn: `${mission.fecha}T23:59:59.000Z`, xpDelta: mission.streakBonusXp }]
        : []),
    ]),
  ].sort((a, b) => a.registradoEn.localeCompare(b.registradoEn));

  for (const entry of ledger) {
    db.player.xpTotal = applyXpDelta(db.player.xpTotal, entry.xpDelta);
    db.player.atributosXp = applyAttributeDeltas(db.player.atributosXp, entry.attributeDelta);
  }
  db.player.rachaMisiones = getLatestClaimedMissionStreak(db);
  syncPlayer(db);
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
  if (syncMission(db, dateKey)) {
    recalculatePlayerFromLedger(db);
  }
  await saveDb(db);
  return mission;
}

export async function claimDailyMission(dateKey = toDateKey()) {
  const db = await loadDb();
  const mission = ensureMission(db, dateKey);
  if (syncMission(db, dateKey)) {
    recalculatePlayerFromLedger(db);
  }
  if (mission.reclamada || mission.completados < mission.objetivo) return;
  mission.reclamada = true;
  db.player.xpTotal = applyXpDelta(db.player.xpTotal, mission.xpBonus);
  db.player.rachaMisiones = getPreviousClaimedMissionStreak(db, dateKey) + 1;
  syncPlayer(db);
  await saveDb(db);
}

export async function claimPerfectWeekMission(dateKey = toDateKey()) {
  const db = await loadDb();
  const mission = ensureMission(db, dateKey);
  if (syncMission(db, dateKey)) {
    recalculatePlayerFromLedger(db);
  }
  if (mission.streakBonusClaimed || mission.perfectStreakDays < 7 || mission.completados < mission.objetivo) return;
  mission.streakBonusClaimed = true;
  db.player.xpTotal = applyXpDelta(db.player.xpTotal, mission.streakBonusXp);
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
    mission = {
      fecha: dateKey,
      objetivo: 0,
      completados: 0,
      reclamada: false,
      xpBonus: DAILY_MISSION_BONUS_XP,
      perfectStreakDays: 0,
      streakBonusClaimed: false,
      streakBonusXp: PERFECT_WEEK_BONUS_XP,
    };
    db.missions.push(mission);
  }
  return mission;
}

function syncMission(db: WebDb, dateKey: string) {
  const mission = ensureMission(db, dateKey);
  const wasClaimed = mission.reclamada;
  const wasStreakBonusClaimed = mission.streakBonusClaimed;
  const weekday = new Date(`${dateKey}T12:00:00`).getDay();
  const levelArcWeekday = weekday === 0 ? 7 : weekday;
  const scheduledHabitIds = new Set(
    db.habits
      .filter((habit) => !habit.archivado && habit.diasSemana.split(',').map(Number).includes(levelArcWeekday))
      .map((habit) => habit.id),
  );

  mission.objetivo = scheduledHabitIds.size;
  mission.completados = db.progress.filter(
    (item) => item.fecha === dateKey && item.estado === 'completado' && scheduledHabitIds.has(item.habitId),
  ).length;
  mission.xpBonus = getDailyMissionBonus(mission.objetivo);
  const previousPerfectStreak = getPreviousPerfectDayStreak(db, dateKey);
  const isPerfectToday = mission.objetivo > 0 && mission.completados >= mission.objetivo;
  mission.perfectStreakDays = isPerfectToday ? previousPerfectStreak + 1 : previousPerfectStreak;
  mission.streakBonusXp = PERFECT_WEEK_BONUS_XP;
  if (!isPerfectToday) {
    mission.reclamada = false;
    mission.streakBonusClaimed = false;
  }
  if (mission.objetivo === 0) {
    mission.reclamada = false;
  }

  return (wasClaimed && !mission.reclamada) || (wasStreakBonusClaimed && !mission.streakBonusClaimed);
}

function getPreviousPerfectDayStreak(db: WebDb, dateKey: string) {
  let streak = 0;
  const cursor = new Date(`${dateKey}T12:00:00`);

  while (true) {
    cursor.setDate(cursor.getDate() - 1);
    const key = toDateKey(cursor);
    const mission = db.missions.find((item) => item.fecha === key);
    if (!mission || mission.objetivo <= 0 || mission.completados < mission.objetivo) break;
    streak += 1;
  }

  return streak;
}

function getPreviousClaimedMissionStreak(db: WebDb, dateKey: string) {
  const previousDate = new Date(`${dateKey}T12:00:00`);
  previousDate.setDate(previousDate.getDate() - 1);
  return getClaimedDailyMissionStreak(db.missions, toDateKey(previousDate));
}

function getLatestClaimedMissionStreak(db: WebDb) {
  const latest = db.missions
    .filter((mission) => mission.objetivo > 0 && mission.reclamada)
    .sort((a, b) => b.fecha.localeCompare(a.fecha))[0];
  return latest ? getClaimedDailyMissionStreak(db.missions, latest.fecha) : 0;
}

function syncPlayer(db: WebDb) {
  const progress = getLevelProgress(db.player.xpTotal);
  db.player.nivel = progress.level;
  db.player.rango = progress.rank;
  db.player.actualizadoEn = toIsoTimestamp();
}

function getHabitCompletionStreak(db: WebDb, habitId: string, dateKey: string, weekdaysCsv: string) {
  return getScheduledCompletionStreak(
    db.events
      .filter((event) => event.habitId === habitId && event.tipoEvento === 'completado' && event.fecha < dateKey)
      .map((event) => event.fecha),
    dateKey,
    weekdaysCsv,
  );
}

function getCurrentHabitStreak(db: WebDb, habit: HabitRecord, today: HabitInsightDay) {
  const priorStreak = getHabitCompletionStreak(db, habit.id, today.fecha, habit.diasSemana);
  return today.status === 'completado' ? priorStreak + 1 : priorStreak;
}

function getHabitInsightDay(habit: HabitRecord, dateKey: string, progress?: DailyProgressRecord): HabitInsightDay {
  const date = new Date(`${dateKey}T12:00:00`);
  const weekday = getLevelArcWeekday(date);
  const isScheduled = habit.diasSemana.split(',').map(Number).includes(weekday);

  if (!isScheduled) {
    return {
      fecha: dateKey,
      weekday,
      status: 'no_programado',
      cantidad: 0,
      meta: habit.meta,
    };
  }

  return {
    fecha: dateKey,
    weekday,
    status: progress?.estado ?? 'pendiente',
    cantidad: progress?.cantidad ?? 0,
    meta: habit.meta,
  };
}

function getDateWindow(endDateKey: string, days: number) {
  const end = new Date(`${endDateKey}T12:00:00`);
  const cursor = new Date(end);
  cursor.setDate(cursor.getDate() - Math.max(0, days - 1));
  const keys: string[] = [];

  while (cursor <= end) {
    keys.push(toDateKey(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  return keys;
}

function getLevelArcWeekday(date: Date) {
  const day = date.getDay();
  return day === 0 ? 7 : day;
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
  db.missions = db.missions.map((mission) => ({
    ...mission,
    perfectStreakDays: Math.max(0, Math.floor(Number(mission.perfectStreakDays ?? 0))),
    streakBonusClaimed: Boolean(mission.streakBonusClaimed),
    streakBonusXp: Math.max(0, Math.floor(Number(mission.streakBonusXp ?? PERFECT_WEEK_BONUS_XP))),
  }));
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
    perfectStreakDays: Math.max(0, Math.floor(asNumber(row.perfect_streak_days ?? row.perfectStreakDays ?? 0))),
    streakBonusClaimed: asBoolean(row.streak_bonus_claimed ?? row.streakBonusClaimed),
    streakBonusXp: Math.max(0, Math.floor(asNumber(row.streak_bonus_xp ?? row.streakBonusXp ?? PERFECT_WEEK_BONUS_XP))),
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
