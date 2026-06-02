import { sqlite } from './client';
import { migrateDb } from './migrate';
import { applyXpDelta, getCompletionXp, getFailureXp, type HabitImportance } from '@/core/xp';
import {
  getCompletionEssence,
  getLevelUpEssenceBetween,
  getMissionEssence,
  getPerfectWeekEssence,
} from '@/core/economy';
import { getLevelFromXp, getLevelProgress } from '@/core/ranks';
import type { SystemContext } from '@/core/aiContext';
import { DEFAULT_AURA_ID, getShopItem, meetsRequirement } from '@/core/shop';
import {
  DAILY_MISSION_BONUS_XP,
  PERFECT_WEEK_BONUS_XP,
  getClaimedDailyMissionStreak,
  getDailyMissionBonus,
} from '@/core/missions';
import { getScheduledCompletionStreak } from '@/core/streaks';
import {
  applyAttributeDeltas,
  attributeIds,
  createEmptyAttributeXp,
  getAttributeDeltas,
  getAttributeLevelProgress,
  normalizeAttributeXp,
  serializeAttributeXp,
  serializeHabitAttributes,
  type AttributeXp,
} from '@/core/attributes';
import { evaluateUnlocked, getAchievement, type AchievementContext } from '@/core/achievements';
import { getTodayWeekday, toDateKey, toIsoTimestamp } from '@/lib/date';
import { BACKUP_LIMITS, asLimitedBackupArray, boundedBackupString } from '@/lib/backupValidation';
import { normalizeHabitIcon } from '@/lib/habitIcons';
import { createId } from '@/lib/id';
import { cancelHabitReminder, scheduleHabitReminder } from '@/lib/notifications';
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

type HabitRow = {
  id: string;
  nombre: string;
  icono: string | null;
  atributos: string | null;
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
  atributos_xp: string | null;
  esencia: number;
  nivel_esencia_otorgado: number;
  titulo_equipado: string | null;
  aura_equipada: string | null;
  actualizado_en: string;
};

type DailyMissionRow = {
  fecha: string;
  objetivo: number;
  completados: number;
  reclamada: number;
  xp_bonus: number;
  perfect_streak_days: number;
  streak_bonus_claimed: number;
  streak_bonus_xp: number;
  esencia_otorgada: number;
};

type EventRow = {
  id: string;
  habit_id: string;
  fecha: string;
  tipo_evento: EventType;
  xp_delta: number;
  attribute_delta: string | null;
  esencia_otorgada: number;
  registrado_en: string;
  nombre?: string;
};

type AiProfileRow = {
  enabled: number;
  engine: AiEngine;
  model_status: AiModelStatus;
  model_path: string | null;
  actualizado_en: string;
};

type AiMessageRow = {
  id: string;
  rol: AiRole;
  contenido: string;
  fecha: string;
  creado_en: string;
};

export async function initializeDatabase() {
  await migrateDb(sqlite);
  await ensurePlayer();
  await ensureAiProfile();
  await ensureDailyMission(toDateKey());
}

export async function resetAllData() {
  const existingHabits = await listHabits(true);
  await Promise.all(existingHabits.map((habit) => cancelHabitReminder(habit.notificationId)));
  await sqlite.execAsync(`
    DELETE FROM events;
    DELETE FROM habit_daily_progress;
    DELETE FROM daily_missions;
    DELETE FROM player_rewards;
    DELETE FROM achievements_unlocked;
    DELETE FROM habits;
    DELETE FROM player;
    DELETE FROM ai_messages;
    DELETE FROM ai_profile;
  `);
  await ensurePlayer();
  await ensureAiProfile();
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

export async function getHabitInsight(id: string, dateKey = toDateKey()): Promise<HabitInsightRecord | null> {
  const habit = await getHabit(id);
  if (!habit) return null;

  const days30 = getDateWindow(dateKey, 30);
  const progressRows = await sqlite.getAllAsync<{
    fecha: string;
    cantidad: number;
    estado: ProgressState;
  }>(
    `
      SELECT fecha, cantidad, estado
      FROM habit_daily_progress
      WHERE habit_id = ? AND fecha BETWEEN ? AND ?
    `,
    [id, days30[0], dateKey],
  );
  const progressByDate = new Map(progressRows.map((row) => [row.fecha, row]));
  const days = days30.map((day) => getHabitInsightDay(habit, day, progressByDate.get(day)));
  const scheduledDays = days.filter((day) => day.status !== 'no_programado');
  const completed = scheduledDays.filter((day) => day.status === 'completado').length;
  const failed = scheduledDays.filter((day) => day.status === 'fallado').length;
  const today = days[days.length - 1];
  const currentStreak = await getCurrentHabitStreak(habit, today);
  const recentEvents = await getHabitEvents(id, 10);

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

export async function createHabit(input: HabitInput): Promise<string> {
  const id = createId();
  const notificationId = await scheduleHabitReminder(input.nombre.trim(), input.horaRecordatorio, input.diasSemana);
  await sqlite.runAsync(
    `
      INSERT INTO habits (id, nombre, icono, atributos, importancia, tipo, meta, dias_semana, hora_recordatorio, notification_id, archivado, creado_en)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
    `,
    [
      id,
      input.nombre.trim(),
      normalizeHabitIcon(input.icono),
      serializeHabitAttributes(input.atributos),
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
      SET nombre = ?, icono = ?, atributos = ?, importancia = ?, tipo = ?, meta = ?, dias_semana = ?, hora_recordatorio = ?, notification_id = ?
      WHERE id = ?
    `,
    [
      input.nombre.trim(),
      normalizeHabitIcon(input.icono),
      serializeHabitAttributes(input.atributos),
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

export async function unarchiveHabit(id: string) {
  const habit = await getHabit(id);
  if (!habit) return;
  const notificationId = await scheduleHabitReminder(habit.nombre, habit.horaRecordatorio, habit.diasSemana);
  await sqlite.runAsync('UPDATE habits SET archivado = 0, notification_id = ? WHERE id = ?', [notificationId, id]);
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
  // Persistimos la penalización NOMINAL (no el delta ya recortado por el suelo de nivel). El suelo
  // se aplica solo al proyectar el total (applyXpDelta), aquí y en recalculatePlayerFromEvents, así
  // reconstruir desde el ledger es idempotente y reproduce el mismo total que el jugador ve en vivo.
  await createEvent(habit.id, dateKey, 'fallado', xpDelta);
  await setPlayerProgress(nextXp);
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

  // Revertimos exactamente la esencia que se concedió al registrar los eventos (persistida en
  // esencia_otorgada), no la recomputada desde la importancia actual: si la importancia cambió
  // entre completar y deshacer, recomputar descuadraría el saldo. El nivel no baja, así que la
  // esencia de nivel no se toca.
  const revertable = await sqlite.getFirstAsync<{ total: number }>(
    'SELECT COALESCE(SUM(esencia_otorgada), 0) as total FROM events WHERE habit_id = ? AND fecha = ?',
    [habitId, dateKey],
  );
  const esenciaRevertida = revertable?.total ?? 0;
  if (esenciaRevertida !== 0) {
    await grantEssence(-esenciaRevertida);
  }

  await sqlite.runAsync('DELETE FROM events WHERE habit_id = ? AND fecha = ?', [habitId, dateKey]);
  await sqlite.runAsync('DELETE FROM habit_daily_progress WHERE id = ?', [progress.id]);
  await syncDailyMission(dateKey);
  await recalculatePlayerFromEvents();
}

export async function getPlayer(): Promise<PlayerRecord> {
  return ensurePlayer();
}

export async function updatePlayerName(name: string) {
  const trimmed = normalizePlayerName(name);
  await ensurePlayer();
  await sqlite.runAsync('UPDATE player SET nombre = ?, actualizado_en = ? WHERE id = 1', [trimmed, toIsoTimestamp()]);
}

// IDs de cosméticos poseídos. La aura cian (default) siempre está incluida aunque no tenga fila,
// porque es gratis y todo jugador la posee de inicio.
export async function listOwnedRewardIds(): Promise<string[]> {
  const rows = await sqlite.getAllAsync<{ reward_id: string }>('SELECT reward_id FROM player_rewards');
  const owned = new Set(rows.map((row) => row.reward_id));
  owned.add(DEFAULT_AURA_ID);
  return [...owned];
}

export async function purchaseReward(rewardId: string): Promise<PurchaseResult> {
  const item = getShopItem(rewardId);
  if (!item) return { ok: false, reason: 'unknown' };

  if (rewardId === DEFAULT_AURA_ID) return { ok: false, reason: 'owned' };
  const existing = await sqlite.getFirstAsync<{ reward_id: string }>(
    'SELECT reward_id FROM player_rewards WHERE reward_id = ?',
    [rewardId],
  );
  if (existing) return { ok: false, reason: 'owned' };

  const player = await ensurePlayer();
  if (!meetsRequirement(item, player.nivel, player.rango)) return { ok: false, reason: 'locked' };
  if (player.esencia < item.cost) return { ok: false, reason: 'insufficient' };

  await sqlite.withExclusiveTransactionAsync(async (tx) => {
    await tx.runAsync('UPDATE player SET esencia = MAX(0, esencia + ?) WHERE id = 1', [-item.cost]);
    await tx.runAsync(
      'INSERT INTO player_rewards (id, reward_id, kind, adquirido_en) VALUES (?, ?, ?, ?)',
      [createId(), rewardId, item.kind, toIsoTimestamp()],
    );
  });

  return { ok: true };
}

export async function equipReward(rewardId: string): Promise<EquipResult> {
  const item = getShopItem(rewardId);
  if (!item) return { ok: false, reason: 'unknown' };

  if (rewardId !== DEFAULT_AURA_ID) {
    const owned = await sqlite.getFirstAsync<{ reward_id: string }>(
      'SELECT reward_id FROM player_rewards WHERE reward_id = ?',
      [rewardId],
    );
    if (!owned) return { ok: false, reason: 'notOwned' };
  }

  await ensurePlayer();
  if (item.kind === 'title') {
    await sqlite.runAsync('UPDATE player SET titulo_equipado = ?, actualizado_en = ? WHERE id = 1', [rewardId, toIsoTimestamp()]);
  } else {
    await sqlite.runAsync('UPDATE player SET aura_equipada = ?, actualizado_en = ? WHERE id = 1', [rewardId, toIsoTimestamp()]);
  }

  return { ok: true };
}

export async function unequipTitle(): Promise<void> {
  await ensurePlayer();
  await sqlite.runAsync('UPDATE player SET titulo_equipado = NULL, actualizado_en = ? WHERE id = 1', [toIsoTimestamp()]);
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
  const nextMissionStreak = await getPreviousClaimedMissionStreak(dateKey) + 1;
  // Persistimos la esencia concedida en el claim para revertir ese valor exacto si la misión
  // deja de estar completa, en vez de recomputarla desde un objetivo que pudo cambiar.
  const esenciaOtorgada = getMissionEssence(mission.objetivo);
  await sqlite.runAsync('UPDATE daily_missions SET reclamada = 1, esencia_otorgada = ? WHERE fecha = ?', [esenciaOtorgada, dateKey]);
  await setPlayerProgress(nextXp, nextMissionStreak);
  await grantEssence(esenciaOtorgada);
}

export async function claimPerfectWeekMission(dateKey = toDateKey()) {
  const mission = await getDailyMission(dateKey);
  if (mission.streakBonusClaimed || mission.perfectStreakDays < 7 || mission.completados < mission.objetivo) return;
  const player = await ensurePlayer();
  const nextXp = applyXpDelta(player.xpTotal, mission.streakBonusXp);
  await sqlite.runAsync('UPDATE daily_missions SET streak_bonus_claimed = 1 WHERE fecha = ?', [dateKey]);
  await setPlayerProgress(nextXp);
  await grantEssence(getPerfectWeekEssence());
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

// --- Chat con el Sistema (IA local) ---

export async function getAiProfile(): Promise<AiProfile> {
  return ensureAiProfile();
}

async function ensureAiProfile(): Promise<AiProfile> {
  const existing = await sqlite.getFirstAsync<AiProfileRow>('SELECT * FROM ai_profile WHERE id = 1');
  if (existing) return mapAiProfile(existing);

  const now = toIsoTimestamp();
  await sqlite.runAsync(
    "INSERT OR IGNORE INTO ai_profile (id, enabled, engine, model_status, model_path, actualizado_en) VALUES (1, 0, 'template', 'none', NULL, ?)",
    [now],
  );
  return { enabled: false, engine: 'template', modelStatus: 'none', modelPath: null, actualizadoEn: now };
}

export async function setAiEnabled(enabled: boolean): Promise<void> {
  await ensureAiProfile();
  await sqlite.runAsync('UPDATE ai_profile SET enabled = ?, actualizado_en = ? WHERE id = 1', [
    enabled ? 1 : 0,
    toIsoTimestamp(),
  ]);
}

export async function setAiEngine(engine: AiEngine): Promise<void> {
  await ensureAiProfile();
  await sqlite.runAsync('UPDATE ai_profile SET engine = ?, actualizado_en = ? WHERE id = 1', [engine, toIsoTimestamp()]);
}

export async function setAiModelStatus(status: AiModelStatus, modelPath?: string | null): Promise<void> {
  await ensureAiProfile();
  await sqlite.runAsync('UPDATE ai_profile SET model_status = ?, model_path = ?, actualizado_en = ? WHERE id = 1', [
    status,
    modelPath ?? null,
    toIsoTimestamp(),
  ]);
}

export async function listAiMessages(limit?: number): Promise<AiMessage[]> {
  // Orden ascendente por creado_en para renderizar el historial cronológicamente. Con `limit`
  // tomamos los N más recientes pero los devolvemos igualmente en orden ascendente.
  if (limit && limit > 0) {
    const rows = await sqlite.getAllAsync<AiMessageRow>(
      'SELECT * FROM ai_messages ORDER BY creado_en DESC LIMIT ?',
      [limit],
    );
    return rows.reverse().map(mapAiMessage);
  }
  const rows = await sqlite.getAllAsync<AiMessageRow>('SELECT * FROM ai_messages ORDER BY creado_en ASC');
  return rows.map(mapAiMessage);
}

export async function addAiMessage(rol: AiRole, contenido: string, dateKey = toDateKey()): Promise<AiMessage> {
  const message: AiMessage = {
    id: createId(),
    rol,
    contenido,
    fecha: dateKey,
    creadoEn: toIsoTimestamp(),
  };
  await sqlite.runAsync(
    'INSERT INTO ai_messages (id, rol, contenido, fecha, creado_en) VALUES (?, ?, ?, ?, ?)',
    [message.id, message.rol, message.contenido, message.fecha, message.creadoEn],
  );
  return message;
}

export async function clearAiMessages(): Promise<void> {
  await sqlite.runAsync('DELETE FROM ai_messages');
}

// Arma el SystemContext leyendo el estado actual: jugador, hábitos de hoy, misión diaria y la mayor
// racha perfecta vista. Reutiliza helpers existentes (getLevelProgress, getAttributeLevelProgress)
// para no duplicar la lógica de nivel/atributos.
// Proxy normalizada 0..1 de la racha programada, usada como `ratio` del eslabón débil cuando no hay
// consistencia 30d barata a mano: 0 con racha 0, satura a 1 a la semana. Misma lógica en web.
function streakToRatio(streak: number): number {
  return Math.min(Math.max(streak, 0), 7) / 7;
}

// ¿Es `habit` (pendiente, racha `streak`) peor eslabón que el actual? Menor racha gana; en empate,
// mayor importancia. Determinista y compartido por nativo y web para paridad.
function isWeakerLink(
  current: { habit: TodayHabit; streak: number } | null,
  habit: TodayHabit,
  streak: number,
): boolean {
  if (!current) return true;
  if (streak !== current.streak) return streak < current.streak;
  return habit.importancia > current.habit.importancia;
}

export async function buildSystemContext(dateKey = toDateKey()): Promise<SystemContext> {
  const player = await ensurePlayer();
  const todayHabits = await listTodayHabits(dateKey);
  // READ-ONLY: leemos la fila de hoy con un SELECT directo en vez de getDailyMission(), que
  // sincroniza y escribe (puede revocar esencia/recalcular jugador). Un getter no debe tener
  // efectos laterales; esto da paridad con la versión web, que tampoco persiste aquí.
  const missionRow = await sqlite.getFirstAsync<{ perfect_streak_days: number }>(
    'SELECT perfect_streak_days FROM daily_missions WHERE fecha = ?',
    [dateKey],
  );
  const perfectStreakToday = missionRow?.perfect_streak_days ?? 0;

  const progress = getLevelProgress(player.xpTotal);

  // Atributo con mayor nivel; null si todos están a nivel base (sin XP de atributo).
  let atributoTop: { id: string; nivel: number } | null = null;
  for (const id of attributeIds) {
    const nivel = getAttributeLevelProgress(player.atributosXp[id]).level;
    if (player.atributosXp[id] > 0 && (!atributoTop || nivel > atributoTop.nivel)) {
      atributoTop = { id, nivel };
    }
  }

  const completadosHoy = todayHabits.filter((habit) => habit.estado === 'completado').length;
  const falladosHoy = todayHabits.filter((habit) => habit.estado === 'fallado').length;
  const pendientesHoy = todayHabits.filter((habit) => habit.estado === 'pendiente').length;
  const habitosHoyTotal = todayHabits.length;
  const diaPerfecto = habitosHoyTotal > 0 && completadosHoy === habitosHoyTotal;

  // Mejor racha actual entre los hábitos activos (incluye la de hoy si ya está completado).
  // Cargamos en UNA query todas las fechas de completados previos y calculamos las rachas en
  // memoria, evitando un query por hábito (N+1). El resultado es idéntico a getHabitCompletionStreak.
  const completedDatesByHabit = await getCompletedDatesByHabit(dateKey);
  let mejorRachaHabito = 0;
  // Eslabón débil del día: de los hábitos AÚN pendientes, el de peor racha programada (la señal más
  // barata, ya calculada aquí para mejorRachaHabito; no añade queries). Empate -> mayor importancia.
  // El ratio es una proxy normalizada de la racha (satura a la semana), sin consistencia 30d (que
  // sería N+1). null si no hay pendientes; el briefing degrada solo.
  let eslabonDebil: { habit: TodayHabit; streak: number } | null = null;
  for (const habit of todayHabits) {
    const priorStreak = getScheduledCompletionStreak(
      completedDatesByHabit.get(habit.id) ?? [],
      dateKey,
      habit.diasSemana,
    );
    const streak = habit.estado === 'completado' ? priorStreak + 1 : priorStreak;
    if (streak > mejorRachaHabito) mejorRachaHabito = streak;
    if (habit.estado === 'pendiente' && isWeakerLink(eslabonDebil, habit, priorStreak)) {
      eslabonDebil = { habit, streak: priorStreak };
    }
  }

  // Mayor racha perfecta vista (max de daily_missions.perfect_streak_days).
  const perfectRow = await sqlite.getFirstAsync<{ max: number | null }>(
    'SELECT MAX(perfect_streak_days) as max FROM daily_missions',
  );

  return {
    nombre: player.nombre,
    nivel: player.nivel,
    rango: player.rango,
    esencia: player.esencia,
    ratioNivel: progress.ratio,
    faltaParaNivel: Math.max(0, progress.neededForLevel - progress.gainedInLevel),
    rachaMisiones: player.rachaMisiones,
    atributoTop,
    habitosHoyTotal,
    completadosHoy,
    pendientesHoy,
    falladosHoy,
    diaPerfecto,
    mejorRachaHabito,
    rachaPerfecta: Math.max(perfectStreakToday, perfectRow?.max ?? 0),
    eslabonDebil: eslabonDebil
      ? { nombre: eslabonDebil.habit.nombre, ratio: streakToRatio(eslabonDebil.streak) }
      : null,
  };
}

async function getHabitEvents(habitId: string, limit = 10): Promise<EventRecord[]> {
  const rows = await sqlite.getAllAsync<EventRow>(
    `
      SELECT e.*, h.nombre
      FROM events e
      LEFT JOIN habits h ON h.id = e.habit_id
      WHERE e.habit_id = ?
      ORDER BY e.registrado_en DESC
      LIMIT ?
    `,
    [habitId, limit],
  );
  return rows.map(mapEvent);
}

// Arma el contexto de stats agregadas que consume el evaluador de logros. Reutiliza la lógica de
// racha (getHabitCompletionStreak) y los niveles de atributo (getAttributeLevelProgress) ya
// existentes en vez de duplicarlas.
async function buildAchievementContext(): Promise<AchievementContext> {
  const player = await ensurePlayer();
  const dateKey = toDateKey();

  const habitCount = await sqlite.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM habits');
  const completedCount = await sqlite.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) as count FROM events WHERE tipo_evento = 'completado'",
  );
  const claimedMissions = await sqlite.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM daily_missions WHERE reclamada = 1',
  );
  const perfectStreak = await sqlite.getFirstAsync<{ max: number | null }>(
    'SELECT MAX(perfect_streak_days) as max FROM daily_missions',
  );
  const rewardsCount = await sqlite.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM player_rewards');

  const activeHabits = await listHabits(false);
  // Cargamos en DOS queries todas las fechas de completados previos y los hábitos completados HOY,
  // y calculamos las rachas en memoria, evitando 2 queries por hábito (N+1). El resultado es
  // idéntico al cálculo original por hábito.
  const completedDatesByHabit = await getCompletedDatesByHabit(dateKey);
  const completedTodayRows = await sqlite.getAllAsync<{ habit_id: string }>(
    "SELECT habit_id FROM habit_daily_progress WHERE fecha = ? AND estado = 'completado'",
    [dateKey],
  );
  const completedTodayHabitIds = new Set(completedTodayRows.map((row) => row.habit_id));
  let maxRachaHabitoActual = 0;
  for (const habit of activeHabits) {
    const streak = getScheduledCompletionStreak(
      completedDatesByHabit.get(habit.id) ?? [],
      dateKey,
      habit.diasSemana,
    );
    const currentStreak = completedTodayHabitIds.has(habit.id) ? streak + 1 : streak;
    if (currentStreak > maxRachaHabitoActual) maxRachaHabitoActual = currentStreak;
  }

  const maxNivelAtributo = attributeIds.reduce(
    (max, id) => Math.max(max, getAttributeLevelProgress(player.atributosXp[id]).level),
    0,
  );

  return {
    nivel: player.nivel,
    rango: player.rango,
    habitosCreados: habitCount?.count ?? 0,
    totalCompletados: completedCount?.count ?? 0,
    maxRachaHabitoActual,
    misionesReclamadas: claimedMissions?.count ?? 0,
    rachaMisionesActual: player.rachaMisiones,
    rachaPerfectaMax: perfectStreak?.max ?? 0,
    maxNivelAtributo,
    cosmeticosComprados: rewardsCount?.count ?? 0,
  };
}

export async function listUnlockedAchievementIds(): Promise<string[]> {
  const rows = await sqlite.getAllAsync<{ achievement_id: string }>(
    'SELECT achievement_id FROM achievements_unlocked',
  );
  return rows.map((row) => row.achievement_id);
}

// Evalúa el catálogo contra el estado actual, persiste los nuevos logros y otorga su Esencia en una
// transacción. Idempotente incluso ante checks solapados: el INSERT OR IGNORE más el unique index
// sobre achievement_id garantizan que solo una de las llamadas concurrentes inserta cada logro, y
// solo esa otorga Esencia (changes > 0). Si no hay nuevos devuelve [].
export async function evaluateAndUnlockAchievements(): Promise<{ id: string; essenceReward: number }[]> {
  const context = await buildAchievementContext();
  const unlockedIds = evaluateUnlocked(context);
  const already = new Set(await listUnlockedAchievementIds());

  const candidates = unlockedIds
    .filter((id) => !already.has(id))
    .map((id) => ({ id, essenceReward: getAchievement(id)?.essenceReward ?? 0 }));

  if (candidates.length === 0) return [];

  const newlyUnlocked: { id: string; essenceReward: number }[] = [];

  await sqlite.withExclusiveTransactionAsync(async (tx) => {
    for (const { id, essenceReward } of candidates) {
      // OR IGNORE: si otro check ganó la carrera e insertó esta fila, changes === 0 y la saltamos
      // (ni Esencia ni celebración). Solo la inserción real (changes > 0) otorga y se devuelve.
      const result = await tx.runAsync(
        'INSERT OR IGNORE INTO achievements_unlocked (id, achievement_id, desbloqueado_en) VALUES (?, ?, ?)',
        [createId(), id, toIsoTimestamp()],
      );
      if (result.changes === 0) continue;
      if (essenceReward > 0) {
        await tx.runAsync('UPDATE player SET esencia = MAX(0, esencia + ?) WHERE id = 1', [essenceReward]);
      }
      newlyUnlocked.push({ id, essenceReward });
    }
  });

  return newlyUnlocked;
}

export async function exportAllData() {
  const [allHabits, allEvents, progress, playerRows, missions, rewards, achievements, aiProfileRows, aiMessages] =
    await Promise.all([
      sqlite.getAllAsync('SELECT * FROM habits ORDER BY creado_en ASC'),
      sqlite.getAllAsync('SELECT * FROM events ORDER BY registrado_en ASC'),
      sqlite.getAllAsync('SELECT * FROM habit_daily_progress ORDER BY fecha ASC'),
      sqlite.getAllAsync('SELECT * FROM player'),
      sqlite.getAllAsync('SELECT * FROM daily_missions ORDER BY fecha ASC'),
      sqlite.getAllAsync('SELECT * FROM player_rewards ORDER BY adquirido_en ASC'),
      sqlite.getAllAsync('SELECT * FROM achievements_unlocked ORDER BY desbloqueado_en ASC'),
      sqlite.getAllAsync('SELECT * FROM ai_profile WHERE id = 1'),
      sqlite.getAllAsync('SELECT * FROM ai_messages ORDER BY creado_en ASC'),
    ]);

  return {
    exportedAt: toIsoTimestamp(),
    habits: allHabits,
    events: allEvents,
    habitDailyProgress: progress,
    player: playerRows,
    dailyMissions: missions,
    playerRewards: rewards,
    achievementsUnlocked: achievements,
    aiProfile: aiProfileRows,
    aiMessages,
  };
}

export async function importAllData(data: unknown) {
  const backup = normalizeBackupData(data);
  const existingHabits = await listHabits(true);
  const restoredHabits: Array<HabitRecord & { notificationId: string | null }> = [];

  for (const habit of backup.habits) {
    const notificationId = habit.archivado
      ? null
      : await scheduleHabitReminder(habit.nombre, habit.horaRecordatorio, habit.diasSemana);
    restoredHabits.push({ ...habit, notificationId });
  }

  const player = backup.player ?? getLevelProgress(0);

  try {
    await sqlite.withExclusiveTransactionAsync(async (tx) => {
      await tx.runAsync('DELETE FROM habit_daily_progress');
      await tx.runAsync('DELETE FROM events');
      await tx.runAsync('DELETE FROM daily_missions');
      await tx.runAsync('DELETE FROM player_rewards');
      await tx.runAsync('DELETE FROM achievements_unlocked');
      await tx.runAsync('DELETE FROM habits');
      await tx.runAsync('DELETE FROM player');
      await tx.runAsync('DELETE FROM ai_messages');
      await tx.runAsync('DELETE FROM ai_profile');

      for (const habit of restoredHabits) {
        await tx.runAsync(
          `
            INSERT INTO habits (id, nombre, icono, atributos, importancia, tipo, meta, dias_semana, hora_recordatorio, notification_id, archivado, creado_en)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `,
          [
            habit.id,
            habit.nombre,
            normalizeHabitIcon(habit.icono),
            serializeHabitAttributes(habit.atributos),
            habit.importancia,
            habit.tipo,
            habit.meta,
            habit.diasSemana,
            habit.horaRecordatorio,
            habit.notificationId,
            habit.archivado ? 1 : 0,
            habit.creadoEn,
          ],
        );
      }

      for (const progress of backup.habitDailyProgress) {
        await tx.runAsync(
          `
            INSERT INTO habit_daily_progress (id, habit_id, fecha, cantidad, estado, actualizado_en)
            VALUES (?, ?, ?, ?, ?, ?)
          `,
          [progress.id, progress.habitId, progress.fecha, progress.cantidad, progress.estado, progress.actualizadoEn],
        );
      }

      for (const event of backup.events) {
        await tx.runAsync(
          `
            INSERT INTO events (id, habit_id, fecha, tipo_evento, xp_delta, attribute_delta, esencia_otorgada, registrado_en)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `,
          [event.id, event.habitId, event.fecha, event.tipoEvento, event.xpDelta, serializeAttributeXp(event.attributeDelta), event.esenciaOtorgada, event.registradoEn],
        );
      }

      for (const mission of backup.dailyMissions) {
        await tx.runAsync(
          `
            INSERT INTO daily_missions (fecha, objetivo, completados, reclamada, xp_bonus, perfect_streak_days, streak_bonus_claimed, streak_bonus_xp, esencia_otorgada)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `,
          [
            mission.fecha,
            mission.objetivo,
            mission.completados,
            mission.reclamada ? 1 : 0,
            mission.xpBonus,
            mission.perfectStreakDays,
            mission.streakBonusClaimed ? 1 : 0,
            mission.streakBonusXp,
            mission.esenciaOtorgada,
          ],
        );
      }

      await tx.runAsync(
        'INSERT INTO player (id, nombre, xp_total, nivel, rango, racha_misiones, atributos_xp, esencia, nivel_esencia_otorgado, titulo_equipado, aura_equipada, actualizado_en) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          'nombre' in player ? player.nombre : null,
          'xpTotal' in player ? player.xpTotal : 0,
          'nivel' in player ? player.nivel : 1,
          'rango' in player ? player.rango : 'E',
          'rachaMisiones' in player ? player.rachaMisiones : 0,
          'atributosXp' in player ? serializeAttributeXp(player.atributosXp) : '{}',
          'esencia' in player ? player.esencia : 0,
          'nivelEsenciaOtorgado' in player ? player.nivelEsenciaOtorgado : 1,
          'tituloEquipado' in player ? player.tituloEquipado : null,
          'auraEquipada' in player ? player.auraEquipada : DEFAULT_AURA_ID,
          'actualizadoEn' in player ? player.actualizadoEn : toIsoTimestamp(),
        ],
      );

      for (const reward of backup.playerRewards) {
        await tx.runAsync(
          'INSERT INTO player_rewards (id, reward_id, kind, adquirido_en) VALUES (?, ?, ?, ?)',
          [reward.id, reward.rewardId, reward.kind, reward.adquiridoEn],
        );
      }

      for (const achievement of backup.achievementsUnlocked) {
        await tx.runAsync(
          'INSERT INTO achievements_unlocked (id, achievement_id, desbloqueado_en) VALUES (?, ?, ?)',
          [achievement.id, achievement.achievementId, achievement.desbloqueadoEn],
        );
      }

      const aiProfile = backup.aiProfile;
      await tx.runAsync(
        'INSERT INTO ai_profile (id, enabled, engine, model_status, model_path, actualizado_en) VALUES (1, ?, ?, ?, ?, ?)',
        [
          aiProfile?.enabled ? 1 : 0,
          aiProfile?.engine ?? 'template',
          aiProfile?.modelStatus ?? 'none',
          aiProfile?.modelPath ?? null,
          aiProfile?.actualizadoEn ?? toIsoTimestamp(),
        ],
      );

      for (const message of backup.aiMessages) {
        await tx.runAsync(
          'INSERT INTO ai_messages (id, rol, contenido, fecha, creado_en) VALUES (?, ?, ?, ?, ?)',
          [message.id, message.rol, message.contenido, message.fecha, message.creadoEn],
        );
      }
    });
  } catch (error) {
    await Promise.all(restoredHabits.map((habit) => cancelHabitReminder(habit.notificationId)));
    throw error;
  }

  await Promise.all(existingHabits.map((habit) => cancelHabitReminder(habit.notificationId)));
  await ensureDailyMission(toDateKey());
}

async function markHabitComplete(habit: HabitRecord, dateKey: string, amount: number) {
  const progress = await getOrCreateProgress(habit.id, dateKey);
  if (progress.estado !== 'pendiente') return;

  const streakDays = await getHabitCompletionStreak(habit.id, dateKey, habit.diasSemana);
  const player = await ensurePlayer();
  const xpDelta = getCompletionXp(habit.importancia, streakDays + 1);
  const nextXp = applyXpDelta(player.xpTotal, xpDelta);
  const attributeDelta = getAttributeDeltas(xpDelta, habit.atributos);
  const nextAttributeXp = applyAttributeDeltas(player.atributosXp, attributeDelta);

  const esenciaOtorgada = getCompletionEssence(habit.importancia);

  await sqlite.runAsync(
    'UPDATE habit_daily_progress SET cantidad = ?, estado = ?, actualizado_en = ? WHERE id = ?',
    [amount, 'completado', toIsoTimestamp(), progress.id],
  );
  // Persistimos el delta NOMINAL (coherente con attributeDelta, que también se deriva del nominal).
  // El suelo de nivel se aplica solo al proyectar; para completados el suelo nunca recorta, así que
  // el valor observable no cambia, pero el ledger queda fiel para la reconstrucción.
  await createEvent(habit.id, dateKey, 'completado', xpDelta, attributeDelta, esenciaOtorgada);
  await setPlayerProgress(nextXp, undefined, nextAttributeXp);
  await grantEssence(esenciaOtorgada);
  await syncDailyMission(dateKey);
}

async function createEvent(
  habitId: string,
  dateKey: string,
  type: EventType,
  xpDelta: number,
  attributeDelta = createEmptyAttributeXp(),
  esenciaOtorgada = 0,
) {
  await sqlite.runAsync(
    `
      INSERT INTO events (id, habit_id, fecha, tipo_evento, xp_delta, attribute_delta, esencia_otorgada, registrado_en)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [createId(), habitId, dateKey, type, xpDelta, serializeAttributeXp(attributeDelta), esenciaOtorgada, toIsoTimestamp()],
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
    'INSERT INTO player (id, nombre, xp_total, nivel, rango, racha_misiones, atributos_xp, esencia, nivel_esencia_otorgado, titulo_equipado, aura_equipada, actualizado_en) VALUES (1, null, 0, 1, ?, 0, ?, 0, 1, null, ?, ?)',
    ['E', '{}', DEFAULT_AURA_ID, now],
  );
  return {
    nombre: null,
    xpTotal: 0,
    nivel: 1,
    rango: 'E',
    rachaMisiones: 0,
    atributosXp: createEmptyAttributeXp(),
    esencia: 0,
    nivelEsenciaOtorgado: 1,
    tituloEquipado: null,
    auraEquipada: DEFAULT_AURA_ID,
    actualizadoEn: now,
  };
}

async function ensureDailyMission(dateKey: string) {
  const existing = await sqlite.getFirstAsync<DailyMissionRow>('SELECT * FROM daily_missions WHERE fecha = ?', [dateKey]);
  if (existing) return;

  await sqlite.runAsync(
    `
      INSERT INTO daily_missions (fecha, objetivo, completados, reclamada, xp_bonus, perfect_streak_days, streak_bonus_claimed, streak_bonus_xp)
      VALUES (?, ?, 0, 0, ?, 0, 0, ?)
    `,
    [dateKey, 0, DAILY_MISSION_BONUS_XP, PERFECT_WEEK_BONUS_XP],
  );
}

async function syncDailyMission(dateKey: string) {
  await ensureDailyMission(dateKey);
  const weekday = getTodayWeekday(new Date(`${dateKey}T12:00:00`));
  const target = await sqlite.getFirstAsync<{ count: number }>(
    `
      SELECT COUNT(*) as count
      FROM habits
      WHERE archivado = 0
        AND (',' || dias_semana || ',') LIKE ?
    `,
    [`%,${weekday},%`],
  );
  const completed = await sqlite.getFirstAsync<{ count: number }>(
    `
      SELECT COUNT(*) as count
      FROM habits h
      INNER JOIN habit_daily_progress p ON p.habit_id = h.id AND p.fecha = ?
      WHERE h.archivado = 0
        AND (',' || h.dias_semana || ',') LIKE ?
        AND p.estado = 'completado'
    `,
    [dateKey, `%,${weekday},%`],
  );
  const objective = target?.count ?? 0;
  const done = completed?.count ?? 0;
  const bonus = getDailyMissionBonus(objective);
  const current = await sqlite.getFirstAsync<{ reclamada: number; streak_bonus_claimed: number; esencia_otorgada: number }>(
    'SELECT reclamada, streak_bonus_claimed, esencia_otorgada FROM daily_missions WHERE fecha = ?',
    [dateKey],
  );
  const claimed = objective > 0 ? current?.reclamada ?? 0 : 0;
  const previousPerfectStreak = await getPreviousPerfectDayStreak(dateKey);
  const isPerfectToday = objective > 0 && done >= objective;
  const perfectStreakDays = isPerfectToday ? previousPerfectStreak + 1 : previousPerfectStreak;
  const missionClaimed = isPerfectToday ? claimed : 0;
  const streakBonusClaimed = isPerfectToday ? current?.streak_bonus_claimed ?? 0 : 0;
  const missionRevoked = Boolean(claimed && !missionClaimed);
  const streakBonusRevoked = Boolean(current?.streak_bonus_claimed && !streakBonusClaimed);
  const shouldRecalculate = missionRevoked || streakBonusRevoked;
  // Si la misión se revoca, devolvemos exactamente lo concedido en el claim (persistido) y lo
  // ponemos a 0; recomputar desde el objetivo actual descuadraría si el set de hábitos cambió.
  const esenciaConcedida = current?.esencia_otorgada ?? 0;
  const nextEsenciaOtorgada = missionRevoked ? 0 : esenciaConcedida;

  await sqlite.runAsync(
    `
      UPDATE daily_missions
      SET objetivo = ?, completados = ?, xp_bonus = ?, reclamada = ?, perfect_streak_days = ?, streak_bonus_claimed = ?, streak_bonus_xp = ?, esencia_otorgada = ?
      WHERE fecha = ?
    `,
    [objective, done, bonus, missionClaimed, perfectStreakDays, streakBonusClaimed, PERFECT_WEEK_BONUS_XP, nextEsenciaOtorgada, dateKey],
  );

  if (shouldRecalculate) {
    // El XP se reconstruye desde el ledger; la esencia es gastable, así que la revertimos a mano.
    if (missionRevoked) await grantEssence(-esenciaConcedida);
    // La racha perfecta usa una constante (PERFECT_WEEK_ESSENCE), así que conceder y revertir
    // siempre cuadra; no necesita persistirse. Si algún día se hace variable, habría que
    // persistir su esencia igual que la misión diaria.
    if (streakBonusRevoked) await grantEssence(-getPerfectWeekEssence());
    await recalculatePlayerFromEvents();
  }
}

async function getPreviousPerfectDayStreak(dateKey: string) {
  const rows = await sqlite.getAllAsync<DailyMissionRow>(
    `
      SELECT *
      FROM daily_missions
      WHERE fecha < ?
      ORDER BY fecha DESC
      LIMIT 14
    `,
    [dateKey],
  );
  let streak = 0;
  const cursor = new Date(`${dateKey}T12:00:00`);
  const missionsByDate = new Map(rows.map((row) => [row.fecha, row]));

  while (true) {
    cursor.setDate(cursor.getDate() - 1);
    const key = toDateKey(cursor);
    const mission = missionsByDate.get(key);
    if (!mission || mission.objetivo <= 0 || mission.completados < mission.objetivo) break;
    streak += 1;
  }

  return streak;
}

async function getPreviousClaimedMissionStreak(dateKey: string) {
  const rows = await sqlite.getAllAsync<DailyMissionRow>(
    `
      SELECT *
      FROM daily_missions
      WHERE fecha < ?
      ORDER BY fecha DESC
      LIMIT 30
    `,
    [dateKey],
  );
  const previousDate = new Date(`${dateKey}T12:00:00`);
  previousDate.setDate(previousDate.getDate() - 1);
  return getClaimedDailyMissionStreak(
    rows.map(mapDailyMission),
    toDateKey(previousDate),
  );
}

async function setPlayerProgress(xpTotal: number, rachaMisiones?: number, atributosXp?: AttributeXp) {
  const progress = getLevelProgress(xpTotal);
  const current = await ensurePlayer();
  await sqlite.runAsync(
    `
      UPDATE player
      SET xp_total = ?, nivel = ?, rango = ?, racha_misiones = ?, atributos_xp = ?, actualizado_en = ?
      WHERE id = 1
    `,
    [
      xpTotal,
      progress.level,
      progress.rank,
      rachaMisiones ?? current.rachaMisiones,
      serializeAttributeXp(atributosXp ?? current.atributosXp),
      toIsoTimestamp(),
    ],
  );
  // Cualquier ganancia de XP puede subir de nivel, así que comprobamos aquí la esencia de nivel.
  await syncLevelUpEssence();
}

// Suma (o resta, con delta negativo) esencia gastable, con suelo en cero.
async function grantEssence(deltaEsencia: number) {
  if (deltaEsencia === 0) return;
  await sqlite.runAsync('UPDATE player SET esencia = MAX(0, esencia + ?) WHERE id = 1', [deltaEsencia]);
}

// Otorga esencia por las subidas de nivel pendientes. Idempotente y monotónico:
// el nivel tiene suelo y nunca baja, así que recalcular XP nunca resta esencia de nivel.
async function syncLevelUpEssence() {
  const player = await ensurePlayer();
  const nivelActual = getLevelFromXp(player.xpTotal);
  if (nivelActual <= player.nivelEsenciaOtorgado) return;

  const reward = getLevelUpEssenceBetween(player.nivelEsenciaOtorgado, nivelActual);
  await grantEssence(reward);
  await sqlite.runAsync('UPDATE player SET nivel_esencia_otorgado = ? WHERE id = 1', [nivelActual]);
}

async function recalculatePlayerFromEvents() {
  // Solo reconstruye XP y atributos desde el ledger. La esencia es gastable (no derivada de
  // eventos), así que NO se recalcula aquí; su reversión se gestiona en cada acción. El
  // setPlayerProgress final llama a syncLevelUpEssence, que es idempotente y nunca resta.
  const rows = await sqlite.getAllAsync<{ xp_delta: number; attribute_delta: string | null; registrado_en: string }>(
    'SELECT xp_delta, attribute_delta, registrado_en FROM events ORDER BY registrado_en ASC',
  );
  const missionRows = await sqlite.getAllAsync<{ fecha: string; xp_delta: number }>(
    `
      SELECT fecha, xp_bonus as xp_delta
      FROM daily_missions
      WHERE reclamada = 1
      UNION ALL
      SELECT fecha, streak_bonus_xp as xp_delta
      FROM daily_missions
      WHERE streak_bonus_claimed = 1
      ORDER BY fecha ASC
    `,
  );
  const ledger = [
    ...rows,
    ...missionRows.map((row) => ({
      attribute_delta: null,
      registrado_en: `${row.fecha}T23:59:59.000Z`,
      xp_delta: row.xp_delta,
    })),
  ].sort((a, b) => a.registrado_en.localeCompare(b.registrado_en));
  let xpTotal = 0;
  let atributosXp = createEmptyAttributeXp();
  for (const row of ledger) {
    xpTotal = applyXpDelta(xpTotal, row.xp_delta);
    atributosXp = applyAttributeDeltas(atributosXp, row.attribute_delta);
  }
  await setPlayerProgress(xpTotal, await getLatestClaimedMissionStreak(), atributosXp);
}

async function getLatestClaimedMissionStreak() {
  const latest = await sqlite.getFirstAsync<{ fecha: string }>(
    `
      SELECT fecha
      FROM daily_missions
      WHERE objetivo > 0 AND reclamada = 1
      ORDER BY fecha DESC
      LIMIT 1
    `,
  );
  if (!latest) return 0;

  const rows = await sqlite.getAllAsync<DailyMissionRow>(
    `
      SELECT *
      FROM daily_missions
      WHERE fecha <= ?
      ORDER BY fecha DESC
      LIMIT 30
    `,
    [latest.fecha],
  );
  return getClaimedDailyMissionStreak(rows.map(mapDailyMission), latest.fecha);
}

async function getHabitCompletionStreak(habitId: string, dateKey: string, weekdaysCsv: string) {
  const rows = await sqlite.getAllAsync<{ fecha: string }>(
    `
      SELECT fecha
      FROM events
      WHERE habit_id = ? AND tipo_evento = 'completado' AND fecha < ?
      ORDER BY fecha DESC
    `,
    [habitId, dateKey],
  );
  return getScheduledCompletionStreak(
    rows.map((row) => row.fecha),
    dateKey,
    weekdaysCsv,
  );
}

// Versión batch de la consulta de getHabitCompletionStreak: en UNA query trae las fechas de todos
// los eventos 'completado' anteriores a dateKey y las agrupa por hábito, para calcular rachas en
// memoria sin un query por hábito (N+1). Mismo filtro y misma fuente que getHabitCompletionStreak.
async function getCompletedDatesByHabit(dateKey: string): Promise<Map<string, string[]>> {
  const rows = await sqlite.getAllAsync<{ habit_id: string; fecha: string }>(
    `
      SELECT habit_id, fecha
      FROM events
      WHERE tipo_evento = 'completado' AND fecha < ?
      ORDER BY fecha DESC
    `,
    [dateKey],
  );
  const byHabit = new Map<string, string[]>();
  for (const row of rows) {
    const list = byHabit.get(row.habit_id);
    if (list) {
      list.push(row.fecha);
    } else {
      byHabit.set(row.habit_id, [row.fecha]);
    }
  }
  return byHabit;
}

async function getCurrentHabitStreak(habit: HabitRecord, today: HabitInsightDay) {
  const priorStreak = await getHabitCompletionStreak(habit.id, today.fecha, habit.diasSemana);
  return today.status === 'completado' ? priorStreak + 1 : priorStreak;
}

function getHabitInsightDay(
  habit: HabitRecord,
  dateKey: string,
  progress?: { cantidad: number; estado: ProgressState },
): HabitInsightDay {
  const date = new Date(`${dateKey}T12:00:00`);
  const weekday = getTodayWeekday(date);
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
  const start = new Date(end);
  start.setDate(start.getDate() - Math.max(0, days - 1));
  const keys: string[] = [];
  const cursor = start;

  while (cursor <= end) {
    keys.push(toDateKey(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  return keys;
}

function normalizeMeta(input: HabitInput) {
  return input.tipo === 'binario' ? 1 : Math.max(1, Math.floor(input.meta));
}

function mapHabit(row: HabitRow): HabitRecord {
  return {
    id: row.id,
    nombre: row.nombre,
    icono: normalizeHabitIcon(row.icono),
    atributos: serializeHabitAttributes(row.atributos),
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
    atributosXp: normalizeAttributeXp(row.atributos_xp),
    esencia: Math.max(0, Math.floor(row.esencia ?? 0)),
    nivelEsenciaOtorgado: Math.max(1, Math.floor(row.nivel_esencia_otorgado ?? 1)),
    tituloEquipado: row.titulo_equipado ?? null,
    auraEquipada: row.aura_equipada ?? DEFAULT_AURA_ID,
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
    perfectStreakDays: row.perfect_streak_days,
    streakBonusClaimed: Boolean(row.streak_bonus_claimed),
    streakBonusXp: row.streak_bonus_xp,
    esenciaOtorgada: Math.max(0, Math.floor(row.esencia_otorgada ?? 0)),
  };
}

function mapEvent(row: EventRow): EventRecord {
  return {
    id: row.id,
    habitId: row.habit_id,
    fecha: row.fecha,
    tipoEvento: row.tipo_evento,
    xpDelta: row.xp_delta,
    attributeDelta: normalizeAttributeXp(row.attribute_delta),
    esenciaOtorgada: Math.max(0, Math.floor(row.esencia_otorgada ?? 0)),
    registradoEn: row.registrado_en,
    habitName: row.nombre,
  };
}

function clampImportance(value: number): HabitImportance {
  if (value <= 1) return 1;
  if (value >= 5) return 5;
  return Math.round(value) as HabitImportance;
}

function mapAiProfile(row: AiProfileRow): AiProfile {
  return {
    enabled: Boolean(row.enabled),
    engine: row.engine === 'llama' ? 'llama' : 'template',
    modelStatus: isAiModelStatus(row.model_status) ? row.model_status : 'none',
    modelPath: row.model_path ?? null,
    actualizadoEn: row.actualizado_en,
  };
}

function mapAiMessage(row: AiMessageRow): AiMessage {
  return {
    id: row.id,
    rol: isAiRole(row.rol) ? row.rol : 'system',
    contenido: row.contenido,
    fecha: row.fecha,
    creadoEn: row.creado_en,
  };
}

function isAiRole(value: unknown): value is AiRole {
  return value === 'system' || value === 'user' || value === 'assistant';
}

function isAiModelStatus(value: unknown): value is AiModelStatus {
  return value === 'none' || value === 'downloading' || value === 'ready' || value === 'error';
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
  playerRewards: Array<{ id: string; rewardId: string; kind: string; adquiridoEn: string }>;
  achievementsUnlocked: Array<{ id: string; achievementId: string; desbloqueadoEn: string }>;
  aiProfile: AiProfile | null;
  aiMessages: AiMessage[];
};

function normalizeBackupData(data: unknown): NormalizedBackupData {
  if (!isRecord(data)) throw new Error('Invalid backup data');

  return {
    habits: asArray(data.habits, 'habits', BACKUP_LIMITS.habits).map(normalizeHabit),
    events: asArray(data.events, 'events', BACKUP_LIMITS.events).map(normalizeEvent),
    habitDailyProgress: asArray(data.habitDailyProgress ?? data.progress, 'habitDailyProgress', BACKUP_LIMITS.habitDailyProgress).map(normalizeProgress),
    player: normalizePlayer(asArray(data.player)[0] ?? data.player),
    dailyMissions: asArray(data.dailyMissions ?? data.missions, 'dailyMissions', BACKUP_LIMITS.dailyMissions).map(normalizeMission),
    playerRewards: asArray(data.playerRewards ?? data.rewards, 'playerRewards', BACKUP_LIMITS.playerRewards).map(normalizeReward),
    // Backups antiguos sin la tabla → []. La tabla no existía, así que no hay nada que restaurar.
    achievementsUnlocked: asArray(data.achievementsUnlocked ?? data.achievements, 'achievementsUnlocked', BACKUP_LIMITS.achievementsUnlocked).map(normalizeAchievement),
    // No restauramos engine/model_status/model_path desde JSON: el fichero GGUF vive en este
    // dispositivo y su ruta local no es portable. Tras importar, la IA vuelve a plantilla segura.
    aiProfile: null,
    aiMessages: asArray(data.aiMessages, 'aiMessages', BACKUP_LIMITS.aiMessages).map(normalizeAiMessage),
  };
}

function normalizeAiMessage(row: unknown): AiMessage {
  if (!isRecord(row)) throw new Error('Invalid ai message row');
  const rol = isAiRole(row.rol) ? row.rol : 'system';
  return {
    id: asString(row.id),
    rol,
    contenido: typeof row.contenido === 'string' ? boundedString(row.contenido, BACKUP_LIMITS.aiMessageLength) : '',
    fecha: asString((row.fecha as string) || toDateKey()),
    creadoEn: asString((row.creado_en ?? row.creadoEn) || toIsoTimestamp()),
  };
}

function normalizeAchievement(row: unknown) {
  if (!isRecord(row)) throw new Error('Invalid achievement row');
  return {
    id: asString(row.id),
    achievementId: asString(row.achievement_id ?? row.achievementId),
    desbloqueadoEn: asString((row.desbloqueado_en ?? row.desbloqueadoEn) || toIsoTimestamp()),
  };
}

function normalizeReward(row: unknown) {
  if (!isRecord(row)) throw new Error('Invalid reward row');
  return {
    id: asString(row.id),
    rewardId: asString(row.reward_id ?? row.rewardId),
    kind: asString(row.kind),
    adquiridoEn: asString((row.adquirido_en ?? row.adquiridoEn) || toIsoTimestamp()),
  };
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
    attributeDelta: normalizeAttributeXp(row.attribute_delta ?? row.attributeDelta),
    esenciaOtorgada: Math.max(0, Math.floor(asNumber(row.esencia_otorgada ?? row.esenciaOtorgada ?? 0))),
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
    esenciaOtorgada: Math.max(0, Math.floor(asNumber(row.esencia_otorgada ?? row.esenciaOtorgada ?? 0))),
  };
}

function normalizePlayer(row: unknown): PlayerRecord | null {
  if (!isRecord(row)) return null;
  const progress = getLevelProgress(asNumber(row.xp_total ?? row.xpTotal));
  const nivel = Math.max(1, Math.floor(asNumber(row.nivel ?? progress.level)));
  return {
    nombre: nullableString(row.nombre ?? row.name),
    xpTotal: asNumber(row.xp_total ?? row.xpTotal),
    nivel,
    rango: isRank(row.rango) ? row.rango : progress.rank,
    rachaMisiones: Math.max(0, Math.floor(asNumber(row.racha_misiones ?? row.rachaMisiones))),
    atributosXp: normalizeAttributeXp(row.atributos_xp ?? row.atributosXp ?? row.attributeXp),
    esencia: Math.max(0, Math.floor(asNumber(row.esencia ?? 0))),
    nivelEsenciaOtorgado: Math.max(1, Math.floor(asNumber(row.nivel_esencia_otorgado ?? row.nivelEsenciaOtorgado ?? nivel))),
    tituloEquipado: nullableString(row.titulo_equipado ?? row.tituloEquipado),
    auraEquipada: nullableString(row.aura_equipada ?? row.auraEquipada) ?? DEFAULT_AURA_ID,
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

function asArray(value: unknown, label = 'array', maxItems = Number.POSITIVE_INFINITY): unknown[] {
  return asLimitedBackupArray(value, label, maxItems);
}

function asString(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error('Invalid backup field');
  return boundedBackupString(value, BACKUP_LIMITS.stringLength);
}

function boundedString(value: string, maxLength: number): string {
  return boundedBackupString(value, maxLength);
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
