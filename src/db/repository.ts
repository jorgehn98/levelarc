import { sqlite } from './client';
import { migrateDb } from './migrate';
import { applyXpDelta, getCompletionXp, getFailureXp, type HabitImportance } from '@/core/xp';
import {
  getCompletionEssence,
  getLevelUpEssenceBetween,
  getMissionEssence,
  getPerfectWeekEssence,
} from '@/core/economy';
import { getLevelProgress } from '@/core/ranks';
import type { SystemContext } from '@/core/aiContext';
import { DEFAULT_AURA_ID, getShopItem, meetsRequirement } from '@/core/shop';
import {
  DAILY_MISSION_BONUS_XP,
  MISSION_STREAK_LOOKBACK_DAYS,
  PERFECT_WEEK_BONUS_XP,
  canClaimPerfectWeek,
  getClaimedDailyMissionStreak,
  getDailyMissionBonus,
  getPerfectDayStreak,
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
import { BACKUP_LIMITS, isAiRole, normalizeBackupData, type NormalizedBackup } from '@/lib/backupValidation';
import { getTodayWeekday, shiftDateKey, toDateKey, toIsoTimestamp } from '@/lib/date';
import { normalizeHabitIcon } from '@/lib/habitIcons';
import { createId } from '@/lib/id';
import type { Language } from '@/i18n';
import { cancelHabitReminder, scheduleHabitReminder } from '@/lib/notifications';
import type { ReminderResult, ReminderStatus } from '@/lib/reminderPlan';
import type { Rank } from '@/theme/colors';

import type {
  AiEngine,
  AiMessage,
  AiModelStatus,
  AiProfile,
  AiRole,
  DailyMissionRecord,
  EquipResult,
  EventRecord,
  EventType,
  HabitInput,
  HabitInsightDay,
  HabitInsightRecord,
  HabitRecord,
  HabitType,
  PlayerRecord,
  ProgressState,
  PurchaseResult,
  TodayHabit,
} from './types';

export type * from './types';

// --- Cola de mutaciones y transacciones ---
//
// Todo lo que escribe pasa por `mutate`: una única cola a nivel de módulo, y cada tarea dentro de
// una transacción. La cola impide que dos llamadas intercalen su "leer y luego escribir" (doble toque
// = un solo evento); la transacción impide que un fallo a mitad deje `events` y la caché `player`
// en desacuerdo.
//
// Se usa `withTransactionAsync` sobre la conexión principal, no `withExclusiveTransactionAsync`: en
// expo-sqlite 56 esta última abre OTRA conexión por llamada, donde `PRAGMA foreign_keys` vuelve a
// estar apagado y los helpers de este módulo (que usan `sqlite`) escribirían fuera de la transacción.
// `withTransactionAsync` no admite anidarse ni aísla lo que corra a la vez por la misma conexión;
// la cola lo resuelve, con dos reglas:
//
// - Dentro de una tarea no se llama a funciones exportadas que muten (esperarían a la cola que
//   ocupa la propia tarea: bloqueo). Se usan los helpers internos.
// - Dentro de una tarea no se espera nada externo (notificaciones, permisos): solo SQL.
//
// Las lecturas no pasan por la cola. Una lectura lanzada durante una mutación puede ver su estado
// intermedio; los llamadores refrescan al terminar la mutación, que es cuando el dato es firme.
let queue: Promise<unknown> = Promise.resolve();

function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const run = queue.then(task);
  queue = run.catch(() => undefined);
  return run;
}

function mutate<T>(task: () => Promise<T>): Promise<T> {
  return enqueue(async () => {
    let result!: T;
    await sqlite.withTransactionAsync(async () => {
      result = await task();
    });
    return result;
  });
}

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
  reclamada_en: string | null;
  streak_bonus_reclamado_en: string | null;
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

export function initializeDatabase() {
  // En la cola, pero sin transacción envolvente: cada migración abre la suya.
  return enqueue(async () => {
    await migrateDb(sqlite);
    await sqlite.withTransactionAsync(ensureBaseRows);
  });
}

export async function resetAllData() {
  const notificationIds = await mutate(async () => {
    const habits = await listHabits(true);
    await sqlite.execAsync(DELETE_ALL_SQL);
    await ensureBaseRows();
    return habits.map((habit) => habit.notificationId);
  });
  await cancelReminders(notificationIds);
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

// Los recordatorios se programan y cancelan FUERA de la cola: programar puede abrir el diálogo de
// permisos y no debe retener una transacción. Si la escritura falla, se cancela lo recién creado.
// El hábito se guarda aunque el recordatorio no se pueda programar; el estado devuelto lo cuenta.
export async function createHabit(input: HabitInput, language: Language): Promise<{ id: string; reminder: ReminderStatus }> {
  const id = createId();
  const nombre = input.nombre.trim();
  const reminder = await scheduleHabitReminder(nombre, input.horaRecordatorio, input.diasSemana, language);
  try {
    await mutate(() =>
      sqlite.runAsync(
        `
          INSERT INTO habits (id, nombre, icono, atributos, importancia, tipo, meta, dias_semana, hora_recordatorio, notification_id, archivado, creado_en)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
        `,
        [
          id,
          nombre,
          normalizeHabitIcon(input.icono),
          serializeHabitAttributes(input.atributos),
          input.importancia,
          input.tipo,
          normalizeMeta(input),
          input.diasSemana,
          input.horaRecordatorio,
          reminder.notificationId,
          toIsoTimestamp(),
        ],
      ),
    );
  } catch (error) {
    await cancelHabitReminder(reminder.notificationId);
    throw error;
  }
  return { id, reminder: reminder.status };
}

export async function updateHabit(id: string, input: HabitInput, language: Language): Promise<ReminderStatus> {
  const nombre = input.nombre.trim();
  // Un hábito archivado guarda su hora, pero no tiene recordatorio hasta que se desarchiva.
  const current = await getHabit(id);
  if (!current) return 'none';
  const reminder: ReminderResult = current.archivado
    ? { status: 'none', notificationId: null }
    : await scheduleHabitReminder(nombre, input.horaRecordatorio, input.diasSemana, language);
  let previous: HabitRecord | null;
  try {
    previous = await mutate(async () => {
      const existing = await getHabit(id);
      if (!existing) return null;
      await sqlite.runAsync(
        `
          UPDATE habits
          SET nombre = ?, icono = ?, atributos = ?, importancia = ?, tipo = ?, meta = ?, dias_semana = ?, hora_recordatorio = ?, notification_id = ?
          WHERE id = ?
        `,
        [
          nombre,
          normalizeHabitIcon(input.icono),
          serializeHabitAttributes(input.atributos),
          input.importancia,
          input.tipo,
          normalizeMeta(input),
          input.diasSemana,
          input.horaRecordatorio,
          existing.archivado ? null : reminder.notificationId,
          id,
        ],
      );
      return existing;
    });
  } catch (error) {
    await cancelHabitReminder(reminder.notificationId);
    throw error;
  }
  // Se cancela el recordatorio que este update sustituyó. Si el hábito desapareció o se archivó
  // mientras se programaba, sobra también el recién creado.
  await cancelHabitReminder(previous?.notificationId ?? null);
  if (!previous || previous.archivado) {
    await cancelHabitReminder(reminder.notificationId);
    return 'none';
  }
  return reminder.status;
}

export async function archiveHabit(id: string) {
  const notificationId = await mutate(async () => {
    const habit = await getHabit(id);
    await sqlite.runAsync('UPDATE habits SET archivado = 1, notification_id = NULL WHERE id = ?', [id]);
    return habit?.notificationId ?? null;
  });
  await cancelHabitReminder(notificationId);
}

export async function unarchiveHabit(id: string, language: Language): Promise<ReminderStatus> {
  const habit = await getHabit(id);
  if (!habit?.archivado) return 'none';
  // Un archivado no debería guardar ids; si quedó alguno, se cancela para no duplicar el aviso.
  await cancelHabitReminder(habit.notificationId);
  const reminder = await scheduleHabitReminder(habit.nombre, habit.horaRecordatorio, habit.diasSemana, language);
  let restored: boolean;
  try {
    restored = await mutate(async () => {
      const result = await sqlite.runAsync(
        'UPDATE habits SET archivado = 0, notification_id = ? WHERE id = ? AND archivado = 1',
        [reminder.notificationId, id],
      );
      return result.changes > 0;
    });
  } catch (error) {
    await cancelHabitReminder(reminder.notificationId);
    throw error;
  }
  // Otra llamada lo desarchivó antes: su recordatorio es el válido.
  if (!restored) {
    await cancelHabitReminder(reminder.notificationId);
    return 'none';
  }
  return reminder.status;
}

// Guarda los ids que dejó una sincronización de recordatorios (src/lib/reminders.ts). Cada fila se
// actualiza solo si el hábito sigue como la sincronización lo leyó; devuelve los ids que ya no
// corresponden a nada, para que el llamador los cancele fuera de la cola.
export function saveHabitNotificationIds(
  entries: { habit: HabitRecord; notificationId: string | null }[],
): Promise<string[]> {
  return mutate(async () => {
    const orphaned: string[] = [];
    for (const { habit, notificationId } of entries) {
      const result = await sqlite.runAsync(
        `
          UPDATE habits SET notification_id = ?
          WHERE id = ? AND archivado = ? AND nombre = ? AND dias_semana = ? AND hora_recordatorio IS ? AND notification_id IS ?
        `,
        [
          notificationId,
          habit.id,
          habit.archivado ? 1 : 0,
          habit.nombre,
          habit.diasSemana,
          habit.horaRecordatorio,
          habit.notificationId,
        ],
      );
      if (result.changes === 0 && notificationId) orphaned.push(notificationId);
    }
    return orphaned;
  });
}

export function incrementHabitProgress(habitId: string, dateKey = toDateKey()) {
  return mutate(() => incrementProgress(habitId, dateKey));
}

export function markHabitFailed(habitId: string, dateKey = toDateKey()) {
  return mutate(() => failHabit(habitId, dateKey));
}

export function closeDay(dateKey = toDateKey()) {
  return mutate(async () => {
    const habits = await listTodayHabits(dateKey);
    for (const habit of habits) {
      if (habit.estado === 'pendiente' && habit.cantidad === 0) {
        await failHabit(habit.id, dateKey);
      }
    }
    await syncDailyMission(dateKey);
  });
}

export function undoTodayHabit(habitId: string, dateKey = toDateKey()) {
  return mutate(async () => {
    const progress = await sqlite.getFirstAsync<{ id: string }>(
      'SELECT id FROM habit_daily_progress WHERE habit_id = ? AND fecha = ?',
      [habitId, dateKey],
    );
    if (!progress) return;

    // Revertimos exactamente la esencia que se concedió al registrar los eventos (persistida en
    // esencia_otorgada), no la recomputada desde la importancia actual: si la importancia cambió
    // entre completar y deshacer, recomputar descuadraría el saldo. La esencia de nivel no se toca:
    // su marcador es monotónico y no se vuelve a pagar al recuperar el nivel.
    const revertable = await sqlite.getFirstAsync<{ total: number }>(
      'SELECT COALESCE(SUM(esencia_otorgada), 0) as total FROM events WHERE habit_id = ? AND fecha = ?',
      [habitId, dateKey],
    );
    await grantEssence(-(revertable?.total ?? 0));

    await sqlite.runAsync('DELETE FROM events WHERE habit_id = ? AND fecha = ?', [habitId, dateKey]);
    await sqlite.runAsync('DELETE FROM habit_daily_progress WHERE id = ?', [progress.id]);
    await syncDailyMission(dateKey);
    await recalculatePlayerFromLedger();
  });
}

export async function getPlayer(): Promise<PlayerRecord> {
  return (await readPlayer()) ?? mutate(ensurePlayer);
}

export async function updatePlayerName(name: string) {
  const trimmed = normalizePlayerName(name);
  await mutate(async () => {
    await ensurePlayer();
    await sqlite.runAsync('UPDATE player SET nombre = ?, actualizado_en = ? WHERE id = 1', [trimmed, toIsoTimestamp()]);
  });
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

  return mutate<PurchaseResult>(async () => {
    if (await ownsReward(rewardId)) return { ok: false, reason: 'owned' };

    const player = await ensurePlayer();
    if (!meetsRequirement(item, player.nivel, player.rango)) return { ok: false, reason: 'locked' };
    // player.esencia ya viene con suelo en cero: un saldo guardado negativo no compra nada.
    if (player.esencia < item.cost) return { ok: false, reason: 'insufficient' };

    await grantEssence(-item.cost);
    await sqlite.runAsync(
      'INSERT INTO player_rewards (id, reward_id, kind, adquirido_en) VALUES (?, ?, ?, ?)',
      [createId(), rewardId, item.kind, toIsoTimestamp()],
    );
    return { ok: true };
  });
}

export async function equipReward(rewardId: string): Promise<EquipResult> {
  const item = getShopItem(rewardId);
  if (!item) return { ok: false, reason: 'unknown' };

  return mutate<EquipResult>(async () => {
    if (rewardId !== DEFAULT_AURA_ID && !(await ownsReward(rewardId))) return { ok: false, reason: 'notOwned' };

    await ensurePlayer();
    const column = item.kind === 'title' ? 'titulo_equipado' : 'aura_equipada';
    await sqlite.runAsync(`UPDATE player SET ${column} = ?, actualizado_en = ? WHERE id = 1`, [rewardId, toIsoTimestamp()]);
    return { ok: true };
  });
}

export async function unequipTitle(): Promise<void> {
  await mutate(async () => {
    await ensurePlayer();
    await sqlite.runAsync('UPDATE player SET titulo_equipado = NULL, actualizado_en = ? WHERE id = 1', [toIsoTimestamp()]);
  });
}

// Sincroniza la misión del día con los hábitos actuales antes de devolverla, así que escribe: va
// por la cola como cualquier otra mutación.
export function getDailyMission(dateKey = toDateKey()): Promise<DailyMissionRecord> {
  return mutate(() => syncDailyMission(dateKey));
}

export function claimDailyMission(dateKey = toDateKey()) {
  return mutate(async () => {
    const mission = await syncDailyMission(dateKey);
    if (mission.reclamada || mission.objetivo <= 0 || mission.completados < mission.objetivo) return;
    const player = await ensurePlayer();
    const nextXp = applyXpDelta(player.xpTotal, mission.xpBonus);
    const previousStreak = getClaimedDailyMissionStreak(await getMissionStreakRows(dateKey), shiftDateKey(dateKey, -1));
    // Persistimos la esencia concedida en el claim para revertir ese valor exacto si la misión
    // deja de estar completa, en vez de recomputarla desde un objetivo que pudo cambiar.
    const esenciaOtorgada = getMissionEssence(mission.objetivo);
    await sqlite.runAsync(
      'UPDATE daily_missions SET reclamada = 1, esencia_otorgada = ?, reclamada_en = ? WHERE fecha = ?',
      [esenciaOtorgada, toIsoTimestamp(), dateKey],
    );
    await setPlayerProgress(nextXp, previousStreak + 1);
    await grantEssence(esenciaOtorgada);
  });
}

export function claimPerfectWeekMission(dateKey = toDateKey()) {
  return mutate(async () => {
    const mission = await syncDailyMission(dateKey);
    if (!canClaimPerfectWeek(mission)) return;
    const player = await ensurePlayer();
    const nextXp = applyXpDelta(player.xpTotal, mission.streakBonusXp);
    await sqlite.runAsync(
      'UPDATE daily_missions SET streak_bonus_claimed = 1, streak_bonus_reclamado_en = ? WHERE fecha = ?',
      [toIsoTimestamp(), dateKey],
    );
    await setPlayerProgress(nextXp);
    await grantEssence(getPerfectWeekEssence());
  });
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
  return (await readAiProfile()) ?? mutate(ensureAiProfile);
}

async function readAiProfile(): Promise<AiProfile | null> {
  const row = await sqlite.getFirstAsync<AiProfileRow>('SELECT * FROM ai_profile WHERE id = 1');
  return row ? mapAiProfile(row) : null;
}

// Garantiza la fila singleton (id = 1) de ai_profile con los defaults, igual que ensurePlayer hace
// con el jugador. Idempotente: INSERT OR IGNORE no toca la fila si ya existe.
async function ensureAiProfile(): Promise<AiProfile> {
  const now = toIsoTimestamp();
  await sqlite.runAsync(
    "INSERT OR IGNORE INTO ai_profile (id, enabled, engine, model_status, model_path, actualizado_en) VALUES (1, 0, 'template', 'none', NULL, ?)",
    [now],
  );
  return (await readAiProfile()) ?? { enabled: false, engine: 'template', modelStatus: 'none', modelPath: null, actualizadoEn: now };
}

async function updateAiProfile(assignments: string, params: (string | number | null)[]) {
  await mutate(async () => {
    await ensureAiProfile();
    await sqlite.runAsync(`UPDATE ai_profile SET ${assignments}, actualizado_en = ? WHERE id = 1`, [...params, toIsoTimestamp()]);
  });
}

export function setAiEnabled(enabled: boolean): Promise<void> {
  return updateAiProfile('enabled = ?', [enabled ? 1 : 0]);
}

export function setAiEngine(engine: AiEngine): Promise<void> {
  return updateAiProfile('engine = ?', [engine]);
}

export function setAiModelStatus(status: AiModelStatus, modelPath?: string | null): Promise<void> {
  return updateAiProfile('model_status = ?, model_path = ?', [status, modelPath ?? null]);
}

export async function listAiMessages(limit?: number): Promise<AiMessage[]> {
  // Orden ascendente por creado_en para renderizar el historial cronológicamente. Con `limit`
  // tomamos los N más recientes pero los devolvemos igualmente en orden ascendente.
  if (limit && limit > 0) {
    const rows = await sqlite.getAllAsync<AiMessageRow>(
      'SELECT * FROM ai_messages ORDER BY creado_en DESC, rowid DESC LIMIT ?',
      [limit],
    );
    return rows.reverse().map(mapAiMessage);
  }
  const rows = await sqlite.getAllAsync<AiMessageRow>('SELECT * FROM ai_messages ORDER BY creado_en ASC, rowid ASC');
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
  await mutate(async () => {
    await sqlite.runAsync(
      'INSERT INTO ai_messages (id, rol, contenido, fecha, creado_en) VALUES (?, ?, ?, ?, ?)',
      [message.id, message.rol, message.contenido, message.fecha, message.creadoEn],
    );
    // Poda: la tabla conserva solo los mensajes más recientes, los mismos que caben en un backup.
    await sqlite.runAsync(
      'DELETE FROM ai_messages WHERE rowid NOT IN (SELECT rowid FROM ai_messages ORDER BY creado_en DESC, rowid DESC LIMIT ?)',
      [BACKUP_LIMITS.aiMessages],
    );
  });
  return message;
}

export async function clearAiMessages(): Promise<void> {
  await mutate(() => sqlite.runAsync('DELETE FROM ai_messages'));
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
  const player = await getPlayer();
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
    habitosActivos: (await listHabits()).length,
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

// Evalúa el catálogo contra el estado actual, persiste los nuevos logros y otorga su Esencia, todo
// en una mutación. El INSERT OR IGNORE sobre el unique index de achievement_id es la segunda
// barrera: solo la inserción real (changes > 0) otorga y se devuelve. Si no hay nuevos devuelve [].
export function evaluateAndUnlockAchievements(): Promise<{ id: string; essenceReward: number }[]> {
  return mutate(async () => {
    const unlockedIds = evaluateUnlocked(await buildAchievementContext());
    const newlyUnlocked: { id: string; essenceReward: number }[] = [];

    for (const id of unlockedIds) {
      const result = await sqlite.runAsync(
        'INSERT OR IGNORE INTO achievements_unlocked (id, achievement_id, desbloqueado_en) VALUES (?, ?, ?)',
        [createId(), id, toIsoTimestamp()],
      );
      if (result.changes === 0) continue;
      const essenceReward = getAchievement(id)?.essenceReward ?? 0;
      await grantEssence(essenceReward);
      newlyUnlocked.push({ id, essenceReward });
    }

    return newlyUnlocked;
  });
}

// Filas tal cual están en la base (snake_case). Va por la cola para leer un estado consistente, no
// el intermedio de una mutación en curso.
export function exportAllData() {
  return enqueue(async () => ({
    exportedAt: toIsoTimestamp(),
    habits: await sqlite.getAllAsync('SELECT * FROM habits ORDER BY creado_en ASC'),
    events: await sqlite.getAllAsync('SELECT * FROM events ORDER BY registrado_en ASC, rowid ASC'),
    habitDailyProgress: await sqlite.getAllAsync('SELECT * FROM habit_daily_progress ORDER BY fecha ASC'),
    player: await sqlite.getAllAsync('SELECT * FROM player'),
    dailyMissions: await sqlite.getAllAsync('SELECT * FROM daily_missions ORDER BY fecha ASC'),
    playerRewards: await sqlite.getAllAsync('SELECT * FROM player_rewards ORDER BY adquirido_en ASC'),
    achievementsUnlocked: await sqlite.getAllAsync('SELECT * FROM achievements_unlocked ORDER BY desbloqueado_en ASC'),
    aiProfile: await sqlite.getAllAsync('SELECT * FROM ai_profile WHERE id = 1'),
    // Solo el historial reciente, el mismo que la importación conserva.
    aiMessages: await listAiMessages(BACKUP_LIMITS.aiMessages),
  }));
}

// No programa recordatorios: los hábitos importados entran sin id y el llamador sincroniza después
// (syncReminders). Los de los hábitos sustituidos se cancelan solo si la importación entró.
export async function importAllData(data: unknown) {
  const backup = normalizeBackupData(data);
  const previousIds = await mutate(async () => {
    const previous = await listHabits(true);
    await replaceAllData({ ...backup, habits: backup.habits.map((habit) => ({ ...habit, notificationId: null })) });
    return previous.map((habit) => habit.notificationId);
  });
  await cancelReminders(previousIds);
}

async function cancelReminders(notificationIds: (string | null)[]) {
  await Promise.all(notificationIds.map((notificationId) => cancelHabitReminder(notificationId)));
}

// Orden compatible con las claves foráneas (events y progreso antes que habits).
const DELETE_ALL_SQL = `
  DELETE FROM events;
  DELETE FROM habit_daily_progress;
  DELETE FROM daily_missions;
  DELETE FROM player_rewards;
  DELETE FROM achievements_unlocked;
  DELETE FROM habits;
  DELETE FROM player;
  DELETE FROM ai_messages;
  DELETE FROM ai_profile;
`;

// Sustituye toda la base por el backup. Corre dentro de una mutación: o entra entero o no entra.
async function replaceAllData(backup: NormalizedBackup) {
  await sqlite.execAsync(DELETE_ALL_SQL);

  for (const habit of backup.habits) {
    await sqlite.runAsync(
      `
        INSERT INTO habits (id, nombre, icono, atributos, importancia, tipo, meta, dias_semana, hora_recordatorio, notification_id, archivado, creado_en)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        habit.id,
        habit.nombre,
        habit.icono,
        habit.atributos,
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
        INSERT INTO events (id, habit_id, fecha, tipo_evento, xp_delta, attribute_delta, esencia_otorgada, registrado_en)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [event.id, event.habitId, event.fecha, event.tipoEvento, event.xpDelta, serializeAttributeXp(event.attributeDelta), event.esenciaOtorgada, event.registradoEn],
    );
  }

  for (const mission of backup.dailyMissions) {
    await sqlite.runAsync(
      `
        INSERT INTO daily_missions (fecha, objetivo, completados, reclamada, xp_bonus, perfect_streak_days, streak_bonus_claimed, streak_bonus_xp, esencia_otorgada, reclamada_en, streak_bonus_reclamado_en)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        mission.reclamadaEn,
        mission.streakBonusReclamadoEn,
      ],
    );
  }

  for (const reward of backup.playerRewards) {
    await sqlite.runAsync(
      'INSERT INTO player_rewards (id, reward_id, kind, adquirido_en) VALUES (?, ?, ?, ?)',
      [reward.id, reward.rewardId, reward.kind, reward.adquiridoEn],
    );
  }

  for (const achievement of backup.achievementsUnlocked) {
    await sqlite.runAsync(
      'INSERT INTO achievements_unlocked (id, achievement_id, desbloqueado_en) VALUES (?, ?, ?)',
      [achievement.id, achievement.achievementId, achievement.desbloqueadoEn],
    );
  }

  for (const message of backup.aiMessages) {
    await sqlite.runAsync(
      'INSERT INTO ai_messages (id, rol, contenido, fecha, creado_en) VALUES (?, ?, ?, ?, ?)',
      [message.id, message.rol, message.contenido, message.fecha, message.creadoEn],
    );
  }

  // La caché del jugador no se copia del fichero: XP, nivel, rango, atributos y racha salen del
  // ledger recién importado. El marcador de esencia de nivel nunca queda por debajo del nivel
  // resultante, así que importar no vuelve a pagar niveles que el saldo del backup ya incluye.
  const ledger = await projectLedger();
  const progress = getLevelProgress(ledger.xpTotal);
  await sqlite.runAsync(
    'INSERT INTO player (id, nombre, xp_total, nivel, rango, racha_misiones, atributos_xp, esencia, nivel_esencia_otorgado, titulo_equipado, aura_equipada, actualizado_en) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [
      backup.player.nombre,
      ledger.xpTotal,
      progress.level,
      progress.rank,
      await getLatestClaimedMissionStreak(),
      serializeAttributeXp(ledger.atributosXp),
      backup.player.esencia,
      Math.max(backup.player.nivelEsenciaOtorgado, progress.level),
      backup.player.tituloEquipado,
      backup.player.auraEquipada,
      toIsoTimestamp(),
    ],
  );

  // No se restaura engine/model_status/model_path: el fichero GGUF vive en este dispositivo y su
  // ruta local no es portable. Tras importar, la IA vuelve a plantilla segura.
  await ensureAiProfile();
  await ensureDailyMission(toDateKey());
}

// --- Helpers internos. Escriben por la conexión principal dando por hecho que ya están dentro de
// una mutación (`mutate`); ninguno entra en la cola por su cuenta. ---

async function ensureBaseRows() {
  await ensurePlayer();
  await ensureAiProfile();
  await ensureDailyMission(toDateKey());
}

async function incrementProgress(habitId: string, dateKey: string) {
  const habit = await getHabit(habitId);
  if (!habit) return;
  const progress = await getOrCreateProgress(habitId, dateKey);
  if (progress.estado !== 'pendiente') return;

  const amount = Math.min(habit.meta, progress.cantidad + 1);
  if (amount < habit.meta) {
    await sqlite.runAsync(
      'UPDATE habit_daily_progress SET cantidad = ?, actualizado_en = ? WHERE id = ?',
      [amount, toIsoTimestamp(), progress.id],
    );
    return;
  }

  const streakDays = await getHabitCompletionStreak(habit.id, dateKey, habit.diasSemana);
  const player = await ensurePlayer();
  const xpDelta = getCompletionXp(habit.importancia, streakDays + 1);
  const attributeDelta = getAttributeDeltas(xpDelta, habit.atributos);
  const esenciaOtorgada = getCompletionEssence(habit.importancia);

  await sqlite.runAsync(
    'UPDATE habit_daily_progress SET cantidad = ?, estado = ?, actualizado_en = ? WHERE id = ?',
    [amount, 'completado', toIsoTimestamp(), progress.id],
  );
  // Persistimos el delta NOMINAL (coherente con attributeDelta, que también se deriva del nominal).
  // El suelo de nivel se aplica solo al proyectar; para completados el suelo nunca recorta, así que
  // el valor observable no cambia, pero el ledger queda fiel para la reconstrucción.
  await createEvent(habit.id, dateKey, 'completado', xpDelta, attributeDelta, esenciaOtorgada);
  await setPlayerProgress(
    applyXpDelta(player.xpTotal, xpDelta),
    undefined,
    applyAttributeDeltas(player.atributosXp, attributeDelta),
  );
  await grantEssence(esenciaOtorgada);
  await syncDailyMission(dateKey);
}

async function failHabit(habitId: string, dateKey: string) {
  const habit = await getHabit(habitId);
  if (!habit) return;
  const progress = await getOrCreateProgress(habitId, dateKey);
  if (progress.estado !== 'pendiente' || progress.cantidad > 0) return;

  const player = await ensurePlayer();
  const xpDelta = getFailureXp(habit.importancia);
  await sqlite.runAsync(
    'UPDATE habit_daily_progress SET estado = ?, actualizado_en = ? WHERE id = ?',
    ['fallado', toIsoTimestamp(), progress.id],
  );
  // Persistimos la penalización NOMINAL (no el delta ya recortado por el suelo de nivel). El suelo
  // se aplica solo al proyectar el total (applyXpDelta), aquí y en projectLedger, así reconstruir
  // desde el ledger es idempotente y reproduce el mismo total que el jugador ve en vivo.
  await createEvent(habit.id, dateKey, 'fallado', xpDelta);
  await setPlayerProgress(applyXpDelta(player.xpTotal, xpDelta));
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

async function ownsReward(rewardId: string) {
  const row = await sqlite.getFirstAsync<{ reward_id: string }>(
    'SELECT reward_id FROM player_rewards WHERE reward_id = ?',
    [rewardId],
  );
  return Boolean(row);
}

// INSERT OR IGNORE + relectura: el unique index (habit_id, fecha) decide, no una comprobación previa.
async function getOrCreateProgress(habitId: string, dateKey: string) {
  await sqlite.runAsync(
    `
      INSERT OR IGNORE INTO habit_daily_progress (id, habit_id, fecha, cantidad, estado, actualizado_en)
      VALUES (?, ?, ?, 0, 'pendiente', ?)
    `,
    [createId(), habitId, dateKey, toIsoTimestamp()],
  );
  const progress = await sqlite.getFirstAsync<{ id: string; cantidad: number; estado: ProgressState }>(
    'SELECT id, cantidad, estado FROM habit_daily_progress WHERE habit_id = ? AND fecha = ?',
    [habitId, dateKey],
  );
  if (!progress) throw new Error('Habit progress was not initialized');
  return progress;
}

async function readPlayer(): Promise<PlayerRecord | null> {
  const row = await sqlite.getFirstAsync<PlayerRow>('SELECT * FROM player WHERE id = 1');
  return row ? mapPlayer(row) : null;
}

async function ensurePlayer(): Promise<PlayerRecord> {
  const existing = await readPlayer();
  if (existing) return existing;

  await sqlite.runAsync(
    'INSERT OR IGNORE INTO player (id, nombre, xp_total, nivel, rango, racha_misiones, atributos_xp, esencia, nivel_esencia_otorgado, titulo_equipado, aura_equipada, actualizado_en) VALUES (1, null, 0, 1, ?, 0, ?, 0, 1, null, ?, ?)',
    ['E', '{}', DEFAULT_AURA_ID, toIsoTimestamp()],
  );
  const player = await readPlayer();
  if (!player) throw new Error('Player was not initialized');
  return player;
}

async function ensureDailyMission(dateKey: string) {
  await sqlite.runAsync(
    `
      INSERT OR IGNORE INTO daily_missions (fecha, objetivo, completados, reclamada, xp_bonus, perfect_streak_days, streak_bonus_claimed, streak_bonus_xp)
      VALUES (?, 0, 0, 0, ?, 0, 0, ?)
    `,
    [dateKey, DAILY_MISSION_BONUS_XP, PERFECT_WEEK_BONUS_XP],
  );
}

// Recalcula la misión del día desde los hábitos programados y la devuelve. Si el día deja de estar
// completo, revoca los bonus ya reclamados (esencia incluida) y reconstruye el jugador.
async function syncDailyMission(dateKey: string): Promise<DailyMissionRecord> {
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
  const current = await readDailyMission(dateKey);
  const objective = target?.count ?? 0;
  const done = completed?.count ?? 0;
  const isPerfectToday = objective > 0 && done >= objective;
  const missionClaimed = isPerfectToday && current.reclamada;
  const streakBonusClaimed = isPerfectToday && current.streakBonusClaimed;
  const previousPerfectStreak = getPerfectDayStreak(await getMissionStreakRows(dateKey), shiftDateKey(dateKey, -1));

  const next: DailyMissionRecord = {
    fecha: dateKey,
    objetivo: objective,
    completados: done,
    reclamada: missionClaimed,
    // Lo ya reclamado no se reescribe: archivar, desarchivar o editar hábitos después no cambia el
    // XP ni la esencia que ese claim aportó al ledger.
    xpBonus: missionClaimed ? current.xpBonus : getDailyMissionBonus(objective),
    esenciaOtorgada: missionClaimed ? current.esenciaOtorgada : 0,
    reclamadaEn: missionClaimed ? current.reclamadaEn : null,
    perfectStreakDays: isPerfectToday ? previousPerfectStreak + 1 : previousPerfectStreak,
    streakBonusClaimed,
    streakBonusXp: streakBonusClaimed ? current.streakBonusXp : PERFECT_WEEK_BONUS_XP,
    streakBonusReclamadoEn: streakBonusClaimed ? current.streakBonusReclamadoEn : null,
  };

  await sqlite.runAsync(
    `
      UPDATE daily_missions
      SET objetivo = ?, completados = ?, reclamada = ?, xp_bonus = ?, esencia_otorgada = ?, reclamada_en = ?,
          perfect_streak_days = ?, streak_bonus_claimed = ?, streak_bonus_xp = ?, streak_bonus_reclamado_en = ?
      WHERE fecha = ?
    `,
    [
      next.objetivo,
      next.completados,
      next.reclamada ? 1 : 0,
      next.xpBonus,
      next.esenciaOtorgada,
      next.reclamadaEn,
      next.perfectStreakDays,
      next.streakBonusClaimed ? 1 : 0,
      next.streakBonusXp,
      next.streakBonusReclamadoEn,
      dateKey,
    ],
  );

  const missionRevoked = current.reclamada && !missionClaimed;
  const streakBonusRevoked = current.streakBonusClaimed && !streakBonusClaimed;
  if (missionRevoked || streakBonusRevoked) {
    // El XP se reconstruye desde el ledger; la esencia es gastable, así que la revertimos a mano:
    // exactamente lo concedido en el claim (persistido), no lo recomputado desde el objetivo actual.
    if (missionRevoked) await grantEssence(-current.esenciaOtorgada);
    // La racha perfecta usa una constante (PERFECT_WEEK_ESSENCE), así que conceder y revertir
    // siempre cuadra; no necesita persistirse. Si algún día se hace variable, habría que
    // persistir su esencia igual que la misión diaria.
    if (streakBonusRevoked) await grantEssence(-getPerfectWeekEssence());
    await recalculatePlayerFromLedger();
  }

  return next;
}

async function readDailyMission(dateKey: string): Promise<DailyMissionRecord> {
  const row = await sqlite.getFirstAsync<DailyMissionRow>('SELECT * FROM daily_missions WHERE fecha = ?', [dateKey]);
  if (!row) throw new Error('Daily mission was not initialized');
  return mapDailyMission(row);
}

// Misiones anteriores a dateKey dentro de la ventana que recorren las rachas. Sin LIMIT de filas:
// una racha larga no se trunca.
async function getMissionStreakRows(dateKey: string) {
  return sqlite.getAllAsync<{ fecha: string; objetivo: number; completados: number; reclamada: number }>(
    'SELECT fecha, objetivo, completados, reclamada FROM daily_missions WHERE fecha < ? AND fecha >= ?',
    [dateKey, shiftDateKey(dateKey, -MISSION_STREAK_LOOKBACK_DAYS)],
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
  if (progress.level > current.nivelEsenciaOtorgado) {
    // Monotónico: el marcador solo sube, así que recalcular XP nunca resta ni repite esta esencia.
    await grantEssence(getLevelUpEssenceBetween(current.nivelEsenciaOtorgado, progress.level));
    await sqlite.runAsync('UPDATE player SET nivel_esencia_otorgado = ? WHERE id = 1', [progress.level]);
  }
}

// Suma (o resta, con delta negativo) esencia gastable. Sin suelo: tras gastar y deshacer el saldo
// guardado queda negativo, y eso es lo que impide fabricar esencia repitiendo completar-gastar-
// deshacer. El suelo en cero se aplica solo al exponer el saldo (mapPlayer).
async function grantEssence(deltaEsencia: number) {
  if (deltaEsencia === 0) return;
  await sqlite.runAsync('UPDATE player SET esencia = esencia + ? WHERE id = 1', [deltaEsencia]);
}

// Proyecta XP y atributos aplicando el ledger completo (eventos + bonus de misión reclamados) en el
// orden real en que ocurrieron. El orden importa: el suelo de nivel recorta penalizaciones según el
// total acumulado hasta ese instante.
async function projectLedger() {
  type LedgerRow = { xp_delta: number; attribute_delta: string | null; instante: string };
  const events = await sqlite.getAllAsync<LedgerRow>(
    'SELECT xp_delta, attribute_delta, registrado_en as instante FROM events ORDER BY registrado_en ASC, rowid ASC',
  );
  // COALESCE: un claim sin instante no debería existir (la migración v2 los rellena); si lo hubiera,
  // se ordena al inicio de su fecha en vez de romper el recálculo.
  const bonuses = await sqlite.getAllAsync<LedgerRow>(
    `
      SELECT xp_bonus as xp_delta, NULL as attribute_delta, COALESCE(reclamada_en, fecha) as instante
      FROM daily_missions
      WHERE reclamada = 1
      UNION ALL
      SELECT streak_bonus_xp as xp_delta, NULL as attribute_delta, COALESCE(streak_bonus_reclamado_en, fecha) as instante
      FROM daily_missions
      WHERE streak_bonus_claimed = 1
    `,
  );
  // Todos los instantes son ISO en UTC, así que comparar las cadenas es comparar el tiempo. El sort
  // es estable: a igual instante, los eventos conservan su orden de inserción.
  const ledger = [...events, ...bonuses].sort((a, b) => (a.instante < b.instante ? -1 : a.instante > b.instante ? 1 : 0));

  let xpTotal = 0;
  let atributosXp = createEmptyAttributeXp();
  for (const row of ledger) {
    xpTotal = applyXpDelta(xpTotal, row.xp_delta);
    atributosXp = applyAttributeDeltas(atributosXp, row.attribute_delta);
  }
  return { xpTotal, atributosXp };
}

// Solo reconstruye XP, atributos y racha de misiones. La esencia es gastable (no derivada del
// ledger), así que NO se recalcula aquí; su reversión se gestiona en cada acción.
async function recalculatePlayerFromLedger() {
  const { xpTotal, atributosXp } = await projectLedger();
  await setPlayerProgress(xpTotal, await getLatestClaimedMissionStreak(), atributosXp);
}

async function getLatestClaimedMissionStreak() {
  const latest = await sqlite.getFirstAsync<{ fecha: string }>(
    'SELECT MAX(fecha) as fecha FROM daily_missions WHERE objetivo > 0 AND reclamada = 1',
  );
  if (!latest?.fecha) return 0;
  const nextDay = shiftDateKey(latest.fecha, 1);
  return getClaimedDailyMissionStreak(await getMissionStreakRows(nextDay), latest.fecha);
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
    // Suelo en cero solo al exponerlo: el saldo guardado puede ser negativo (gastar y deshacer).
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
    reclamadaEn: row.reclamada_en ?? null,
    streakBonusReclamadoEn: row.streak_bonus_reclamado_en ?? null,
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

function isAiModelStatus(value: unknown): value is AiModelStatus {
  return value === 'none' || value === 'downloading' || value === 'ready' || value === 'error';
}

function normalizePlayerName(name: string) {
  const trimmed = name.trim().slice(0, 24);
  if (trimmed.length < 2) {
    throw new Error('Invalid player name');
  }
  return trimmed;
}
