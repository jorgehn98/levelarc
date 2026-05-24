import { sqlite } from './client';
import { migrateDb } from './migrate';
import { applyXpDelta, getCompletionXp, getFailureXp, type HabitImportance } from '@/core/xp';
import { getLevelProgress } from '@/core/ranks';
import { DAILY_MISSION_BONUS_XP, DAILY_MISSION_TARGET } from '@/core/missions';
import { getTodayWeekday, toDateKey, toIsoTimestamp } from '@/lib/date';
import { createId } from '@/lib/id';
import { cancelHabitReminder, scheduleHabitReminder } from '@/lib/notifications';
import type { Rank } from '@/theme/colors';

export type HabitType = 'binario' | 'contable';
export type ProgressState = 'pendiente' | 'completado' | 'fallado';
export type EventType = 'completado' | 'fallado';

export type HabitRecord = {
  id: string;
  nombre: string;
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
  registradoEn: string;
  habitName?: string;
};

type HabitRow = {
  id: string;
  nombre: string;
  importancia: number;
  tipo: HabitType;
  meta: number;
  dias_semana: string;
  hora_recordatorio: string | null;
  notification_id: string | null;
  archivado: number;
  creado_en: string;
};

type TodayHabitRow = HabitRow & {
  cantidad: number | null;
  estado: ProgressState | null;
};

type PlayerRow = {
  nombre: string | null;
  xp_total: number;
  nivel: number;
  rango: Rank;
  racha_misiones: number;
  actualizado_en: string;
};

type DailyMissionRow = {
  fecha: string;
  objetivo: number;
  completados: number;
  reclamada: number;
  xp_bonus: number;
};

type EventRow = {
  id: string;
  habit_id: string;
  fecha: string;
  tipo_evento: EventType;
  xp_delta: number;
  registrado_en: string;
  nombre?: string;
};

export async function initializeDatabase() {
  await migrateDb(sqlite);
  await ensurePlayer();
  await ensureDailyMission(toDateKey());
}

export async function listHabits(includeArchived = false): Promise<HabitRecord[]> {
  const rows = await sqlite.getAllAsync<HabitRow>(
    `SELECT * FROM habits ${includeArchived ? '' : 'WHERE archivado = 0'} ORDER BY creado_en DESC`,
  );
  return rows.map(mapHabit);
}

export async function listTodayHabits(dateKey = toDateKey()): Promise<TodayHabit[]> {
  const weekday = getTodayWeekday(new Date(`${dateKey}T12:00:00`));
  const rows = await sqlite.getAllAsync<TodayHabitRow>(
    `
      SELECT h.*, p.cantidad, p.estado
      FROM habits h
      LEFT JOIN habit_daily_progress p ON p.habit_id = h.id AND p.fecha = ?
      WHERE h.archivado = 0
        AND (',' || h.dias_semana || ',') LIKE ?
      ORDER BY h.creado_en DESC
    `,
    [dateKey, `%,${weekday},%`],
  );

  return rows.map((row) => ({
    ...mapHabit(row),
    cantidad: row.cantidad ?? 0,
    estado: row.estado ?? 'pendiente',
  }));
}

export async function getHabit(id: string): Promise<HabitRecord | null> {
  const row = await sqlite.getFirstAsync<HabitRow>('SELECT * FROM habits WHERE id = ?', [id]);
  return row ? mapHabit(row) : null;
}

export async function createHabit(input: HabitInput): Promise<string> {
  const id = createId();
  const notificationId = await scheduleHabitReminder(input.nombre.trim(), input.horaRecordatorio, input.diasSemana);
  await sqlite.runAsync(
    `
      INSERT INTO habits (id, nombre, importancia, tipo, meta, dias_semana, hora_recordatorio, notification_id, archivado, creado_en)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
    `,
    [
      id,
      input.nombre.trim(),
      input.importancia,
      input.tipo,
      normalizeMeta(input),
      input.diasSemana,
      input.horaRecordatorio,
      notificationId,
      toIsoTimestamp(),
    ],
  );
  return id;
}

export async function updateHabit(id: string, input: HabitInput) {
  const existing = await getHabit(id);
  if (existing?.notificationId) {
    await cancelHabitReminder(existing.notificationId);
  }
  const notificationId = await scheduleHabitReminder(input.nombre.trim(), input.horaRecordatorio, input.diasSemana);
  await sqlite.runAsync(
    `
      UPDATE habits
      SET nombre = ?, importancia = ?, tipo = ?, meta = ?, dias_semana = ?, hora_recordatorio = ?, notification_id = ?
      WHERE id = ?
    `,
    [
      input.nombre.trim(),
      input.importancia,
      input.tipo,
      normalizeMeta(input),
      input.diasSemana,
      input.horaRecordatorio,
      notificationId,
      id,
    ],
  );
}

export async function archiveHabit(id: string) {
  const habit = await getHabit(id);
  if (habit?.notificationId) {
    await cancelHabitReminder(habit.notificationId);
  }
  await sqlite.runAsync('UPDATE habits SET archivado = 1 WHERE id = ?', [id]);
}

export async function incrementHabitProgress(habitId: string, dateKey = toDateKey()) {
  const habit = await getHabit(habitId);
  if (!habit) return;
  const progress = await getOrCreateProgress(habitId, dateKey);
  if (progress.estado !== 'pendiente') return;

  const nextAmount = Math.min(habit.meta, progress.cantidad + 1);
  if (nextAmount >= habit.meta) {
    await markHabitComplete(habit, dateKey, nextAmount);
    return;
  }

  await sqlite.runAsync(
    'UPDATE habit_daily_progress SET cantidad = ?, actualizado_en = ? WHERE id = ?',
    [nextAmount, toIsoTimestamp(), progress.id],
  );
}

export async function markHabitFailed(habitId: string, dateKey = toDateKey()) {
  const habit = await getHabit(habitId);
  if (!habit) return;
  const progress = await getOrCreateProgress(habitId, dateKey);
  if (progress.estado !== 'pendiente' || progress.cantidad > 0) return;

  const player = await ensurePlayer();
  const xpDelta = getFailureXp(habit.importancia);
  const nextXp = applyXpDelta(player.xpTotal, xpDelta);
  await sqlite.runAsync(
    'UPDATE habit_daily_progress SET estado = ?, actualizado_en = ? WHERE id = ?',
    ['fallado', toIsoTimestamp(), progress.id],
  );
  await createEvent(habit.id, dateKey, 'fallado', nextXp - player.xpTotal);
  await setPlayerXp(nextXp);
}

export async function closeDay(dateKey = toDateKey()) {
  const habits = await listTodayHabits(dateKey);
  for (const habit of habits) {
    if (habit.estado === 'pendiente' && habit.cantidad === 0) {
      await markHabitFailed(habit.id, dateKey);
    }
  }
  await syncDailyMission(dateKey);
}

export async function undoTodayHabit(habitId: string, dateKey = toDateKey()) {
  const progress = await sqlite.getFirstAsync<{ id: string; estado: ProgressState }>(
    'SELECT id, estado FROM habit_daily_progress WHERE habit_id = ? AND fecha = ?',
    [habitId, dateKey],
  );
  if (!progress) return;

  await sqlite.runAsync('DELETE FROM events WHERE habit_id = ? AND fecha = ?', [habitId, dateKey]);
  await sqlite.runAsync('DELETE FROM habit_daily_progress WHERE id = ?', [progress.id]);
  await recalculatePlayerFromEvents();
  await syncDailyMission(dateKey);
}

export async function getPlayer(): Promise<PlayerRecord> {
  return ensurePlayer();
}

export async function updatePlayerName(name: string) {
  const trimmed = normalizePlayerName(name);
  await ensurePlayer();
  await sqlite.runAsync('UPDATE player SET nombre = ?, actualizado_en = ? WHERE id = 1', [trimmed, toIsoTimestamp()]);
}

export async function getDailyMission(dateKey = toDateKey()): Promise<DailyMissionRecord> {
  await ensureDailyMission(dateKey);
  await syncDailyMission(dateKey);
  const row = await sqlite.getFirstAsync<DailyMissionRow>('SELECT * FROM daily_missions WHERE fecha = ?', [dateKey]);
  if (!row) {
    throw new Error('Daily mission was not initialized');
  }
  return mapDailyMission(row);
}

export async function claimDailyMission(dateKey = toDateKey()) {
  const mission = await getDailyMission(dateKey);
  if (mission.reclamada || mission.completados < mission.objetivo) return;
  const player = await ensurePlayer();
  const nextXp = applyXpDelta(player.xpTotal, mission.xpBonus);
  await sqlite.runAsync('UPDATE daily_missions SET reclamada = 1 WHERE fecha = ?', [dateKey]);
  await setPlayerXp(nextXp, player.rachaMisiones + 1);
}

export async function getRecentEvents(limit = 25): Promise<EventRecord[]> {
  const rows = await sqlite.getAllAsync<EventRow>(
    `
      SELECT e.*, h.nombre
      FROM events e
      LEFT JOIN habits h ON h.id = e.habit_id
      ORDER BY e.registrado_en DESC
      LIMIT ?
    `,
    [limit],
  );
  return rows.map(mapEvent);
}

export async function exportAllData() {
  const [allHabits, allEvents, progress, playerRows, missions] = await Promise.all([
    sqlite.getAllAsync('SELECT * FROM habits ORDER BY creado_en ASC'),
    sqlite.getAllAsync('SELECT * FROM events ORDER BY registrado_en ASC'),
    sqlite.getAllAsync('SELECT * FROM habit_daily_progress ORDER BY fecha ASC'),
    sqlite.getAllAsync('SELECT * FROM player'),
    sqlite.getAllAsync('SELECT * FROM daily_missions ORDER BY fecha ASC'),
  ]);

  return {
    exportedAt: toIsoTimestamp(),
    habits: allHabits,
    events: allEvents,
    habitDailyProgress: progress,
    player: playerRows,
    dailyMissions: missions,
  };
}

export async function importAllData(data: unknown) {
  const backup = normalizeBackupData(data);
  const existingHabits = await listHabits(true);

  for (const habit of existingHabits) {
    if (habit.notificationId) {
      await cancelHabitReminder(habit.notificationId);
    }
  }

  await sqlite.runAsync('DELETE FROM habit_daily_progress');
  await sqlite.runAsync('DELETE FROM events');
  await sqlite.runAsync('DELETE FROM daily_missions');
  await sqlite.runAsync('DELETE FROM habits');
  await sqlite.runAsync('DELETE FROM player');

  for (const habit of backup.habits) {
    const notificationId = habit.archivado
      ? null
      : await scheduleHabitReminder(habit.nombre, habit.horaRecordatorio, habit.diasSemana);
    await sqlite.runAsync(
      `
        INSERT INTO habits (id, nombre, importancia, tipo, meta, dias_semana, hora_recordatorio, notification_id, archivado, creado_en)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        habit.id,
        habit.nombre,
        habit.importancia,
        habit.tipo,
        habit.meta,
        habit.diasSemana,
        habit.horaRecordatorio,
        notificationId,
        habit.archivado ? 1 : 0,
        habit.creadoEn,
      ],
    );
  }

  for (const progress of backup.habitDailyProgress) {
    await sqlite.runAsync(
      `
        INSERT INTO habit_daily_progress (id, habit_id, fecha, cantidad, estado, actualizado_en)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      [progress.id, progress.habitId, progress.fecha, progress.cantidad, progress.estado, progress.actualizadoEn],
    );
  }

  for (const event of backup.events) {
    await sqlite.runAsync(
      `
        INSERT INTO events (id, habit_id, fecha, tipo_evento, xp_delta, registrado_en)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      [event.id, event.habitId, event.fecha, event.tipoEvento, event.xpDelta, event.registradoEn],
    );
  }

  for (const mission of backup.dailyMissions) {
    await sqlite.runAsync(
      `
        INSERT INTO daily_missions (fecha, objetivo, completados, reclamada, xp_bonus)
        VALUES (?, ?, ?, ?, ?)
      `,
      [mission.fecha, mission.objetivo, mission.completados, mission.reclamada ? 1 : 0, mission.xpBonus],
    );
  }

  const player = backup.player ?? getLevelProgress(0);
  await sqlite.runAsync(
    'INSERT INTO player (id, nombre, xp_total, nivel, rango, racha_misiones, actualizado_en) VALUES (1, ?, ?, ?, ?, ?, ?)',
    [
      'nombre' in player ? player.nombre : null,
      'xpTotal' in player ? player.xpTotal : 0,
      'nivel' in player ? player.nivel : 1,
      'rango' in player ? player.rango : 'E',
      'rachaMisiones' in player ? player.rachaMisiones : 0,
      'actualizadoEn' in player ? player.actualizadoEn : toIsoTimestamp(),
    ],
  );

  await ensureDailyMission(toDateKey());
}

async function markHabitComplete(habit: HabitRecord, dateKey: string, amount: number) {
  const progress = await getOrCreateProgress(habit.id, dateKey);
  if (progress.estado !== 'pendiente') return;

  const streakDays = await getHabitCompletionStreak(habit.id, dateKey);
  const player = await ensurePlayer();
  const xpDelta = getCompletionXp(habit.importancia, streakDays + 1);
  const nextXp = applyXpDelta(player.xpTotal, xpDelta);

  await sqlite.runAsync(
    'UPDATE habit_daily_progress SET cantidad = ?, estado = ?, actualizado_en = ? WHERE id = ?',
    [amount, 'completado', toIsoTimestamp(), progress.id],
  );
  await createEvent(habit.id, dateKey, 'completado', nextXp - player.xpTotal);
  await setPlayerXp(nextXp);
  await syncDailyMission(dateKey);
}

async function createEvent(habitId: string, dateKey: string, type: EventType, xpDelta: number) {
  await sqlite.runAsync(
    `
      INSERT INTO events (id, habit_id, fecha, tipo_evento, xp_delta, registrado_en)
      VALUES (?, ?, ?, ?, ?, ?)
    `,
    [createId(), habitId, dateKey, type, xpDelta, toIsoTimestamp()],
  );
}

async function getOrCreateProgress(habitId: string, dateKey: string) {
  const existing = await sqlite.getFirstAsync<{
    id: string;
    cantidad: number;
    estado: ProgressState;
  }>('SELECT id, cantidad, estado FROM habit_daily_progress WHERE habit_id = ? AND fecha = ?', [habitId, dateKey]);

  if (existing) return existing;

  const id = createId();
  await sqlite.runAsync(
    `
      INSERT INTO habit_daily_progress (id, habit_id, fecha, cantidad, estado, actualizado_en)
      VALUES (?, ?, ?, 0, 'pendiente', ?)
    `,
    [id, habitId, dateKey, toIsoTimestamp()],
  );

  return { id, cantidad: 0, estado: 'pendiente' as ProgressState };
}

async function ensurePlayer(): Promise<PlayerRecord> {
  const existing = await sqlite.getFirstAsync<PlayerRow>('SELECT * FROM player WHERE id = 1');
  if (existing) return mapPlayer(existing);

  const now = toIsoTimestamp();
  await sqlite.runAsync(
    'INSERT INTO player (id, nombre, xp_total, nivel, rango, racha_misiones, actualizado_en) VALUES (1, null, 0, 1, ?, 0, ?)',
    ['E', now],
  );
  return { nombre: null, xpTotal: 0, nivel: 1, rango: 'E', rachaMisiones: 0, actualizadoEn: now };
}

async function ensureDailyMission(dateKey: string) {
  const existing = await sqlite.getFirstAsync<DailyMissionRow>('SELECT * FROM daily_missions WHERE fecha = ?', [dateKey]);
  if (existing) return;

  await sqlite.runAsync(
    'INSERT INTO daily_missions (fecha, objetivo, completados, reclamada, xp_bonus) VALUES (?, ?, 0, 0, ?)',
    [dateKey, DAILY_MISSION_TARGET, DAILY_MISSION_BONUS_XP],
  );
}

async function syncDailyMission(dateKey: string) {
  await ensureDailyMission(dateKey);
  const completed = await sqlite.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) as count FROM habit_daily_progress WHERE fecha = ? AND estado = 'completado'",
    [dateKey],
  );
  await sqlite.runAsync('UPDATE daily_missions SET completados = ? WHERE fecha = ?', [completed?.count ?? 0, dateKey]);
}

async function setPlayerXp(xpTotal: number, rachaMisiones?: number) {
  const progress = getLevelProgress(xpTotal);
  const current = await ensurePlayer();
  await sqlite.runAsync(
    `
      UPDATE player
      SET xp_total = ?, nivel = ?, rango = ?, racha_misiones = ?, actualizado_en = ?
      WHERE id = 1
    `,
    [xpTotal, progress.level, progress.rank, rachaMisiones ?? current.rachaMisiones, toIsoTimestamp()],
  );
}

async function recalculatePlayerFromEvents() {
  const rows = await sqlite.getAllAsync<{ xp_delta: number }>('SELECT xp_delta FROM events ORDER BY registrado_en ASC');
  let xpTotal = 0;
  for (const row of rows) {
    xpTotal = applyXpDelta(xpTotal, row.xp_delta);
  }
  await setPlayerXp(xpTotal);
}

async function getHabitCompletionStreak(habitId: string, dateKey: string) {
  const rows = await sqlite.getAllAsync<{ fecha: string }>(
    `
      SELECT fecha
      FROM events
      WHERE habit_id = ? AND tipo_evento = 'completado' AND fecha < ?
      ORDER BY fecha DESC
      LIMIT 60
    `,
    [habitId, dateKey],
  );
  const completedDates = new Set(rows.map((row) => row.fecha));
  let streak = 0;
  const cursor = new Date(`${dateKey}T12:00:00`);

  while (true) {
    cursor.setDate(cursor.getDate() - 1);
    const key = toDateKey(cursor);
    if (!completedDates.has(key)) break;
    streak += 1;
  }

  return streak;
}

function normalizeMeta(input: HabitInput) {
  return input.tipo === 'binario' ? 1 : Math.max(1, Math.floor(input.meta));
}

function mapHabit(row: HabitRow): HabitRecord {
  return {
    id: row.id,
    nombre: row.nombre,
    importancia: clampImportance(row.importancia),
    tipo: row.tipo,
    meta: row.meta,
    diasSemana: row.dias_semana,
    horaRecordatorio: row.hora_recordatorio,
    notificationId: row.notification_id,
    archivado: Boolean(row.archivado),
    creadoEn: row.creado_en,
  };
}

function mapPlayer(row: PlayerRow): PlayerRecord {
  return {
    nombre: row.nombre,
    xpTotal: row.xp_total,
    nivel: row.nivel,
    rango: row.rango,
    rachaMisiones: row.racha_misiones,
    actualizadoEn: row.actualizado_en,
  };
}

function mapDailyMission(row: DailyMissionRow): DailyMissionRecord {
  return {
    fecha: row.fecha,
    objetivo: row.objetivo,
    completados: row.completados,
    reclamada: Boolean(row.reclamada),
    xpBonus: row.xp_bonus,
  };
}

function mapEvent(row: EventRow): EventRecord {
  return {
    id: row.id,
    habitId: row.habit_id,
    fecha: row.fecha,
    tipoEvento: row.tipo_evento,
    xpDelta: row.xp_delta,
    registradoEn: row.registrado_en,
    habitName: row.nombre,
  };
}

function clampImportance(value: number): HabitImportance {
  if (value <= 1) return 1;
  if (value >= 5) return 5;
  return Math.round(value) as HabitImportance;
}

type NormalizedBackupData = {
  habits: HabitRecord[];
  events: EventRecord[];
  habitDailyProgress: Array<{
    id: string;
    habitId: string;
    fecha: string;
    cantidad: number;
    estado: ProgressState;
    actualizadoEn: string;
  }>;
  player: PlayerRecord | null;
  dailyMissions: DailyMissionRecord[];
};

function normalizeBackupData(data: unknown): NormalizedBackupData {
  if (!isRecord(data)) throw new Error('Invalid backup data');

  return {
    habits: asArray(data.habits).map(normalizeHabit),
    events: asArray(data.events).map(normalizeEvent),
    habitDailyProgress: asArray(data.habitDailyProgress ?? data.progress).map(normalizeProgress),
    player: normalizePlayer(asArray(data.player)[0] ?? data.player),
    dailyMissions: asArray(data.dailyMissions ?? data.missions).map(normalizeMission),
  };
}

function normalizeHabit(row: unknown): HabitRecord {
  if (!isRecord(row)) throw new Error('Invalid habit row');
  const tipo = row.tipo === 'contable' ? 'contable' : 'binario';
  return {
    id: asString(row.id),
    nombre: asString(row.nombre).trim(),
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

function normalizeProgress(row: unknown) {
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
    fecha: asString(row.fecha),
    tipoEvento: row.tipo_evento === 'fallado' || row.tipoEvento === 'fallado' ? 'fallado' : 'completado',
    xpDelta: asNumber(row.xp_delta ?? row.xpDelta),
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
  const progress = getLevelProgress(asNumber(row.xp_total ?? row.xpTotal));
  return {
    nombre: nullableString(row.nombre ?? row.name),
    xpTotal: asNumber(row.xp_total ?? row.xpTotal),
    nivel: Math.max(1, Math.floor(asNumber(row.nivel ?? progress.level))),
    rango: isRank(row.rango) ? row.rango : progress.rank,
    rachaMisiones: Math.max(0, Math.floor(asNumber(row.racha_misiones ?? row.rachaMisiones))),
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
