import { getAchievement } from '@/core/achievements';
import { normalizeAttributeXp, serializeHabitAttributes, type AttributeXp } from '@/core/attributes';
import { PERFECT_WEEK_BONUS_XP } from '@/core/missions';
import { DEFAULT_AURA_ID, getShopItem } from '@/core/shop';
import type { HabitImportance } from '@/core/xp';
import type {
  AchievementUnlockedRecord,
  AiMessage,
  AiRole,
  DailyMissionRecord,
  DailyProgressRecord,
  EventRecord,
  HabitRecord,
  ProgressState,
  RewardRecord,
} from '@/db/types';
import { toDateKey, toIsoTimestamp, toLocalEndOfDay } from '@/lib/date';
import { normalizeHabitIcon } from '@/lib/habitIcons';
import { parseClockTime } from '@/lib/time';

// Validación de backups, compartida por el repositorio nativo y el fallback web. Función pura: recibe
// el JSON ya parseado (formato nativo en snake_case o web en camelCase) y devuelve datos saneados o
// lanza. No toca la base ni las notificaciones.

export const BACKUP_LIMITS = {
  habits: 500,
  events: 50_000,
  habitDailyProgress: 100_000,
  dailyMissions: 5_000,
  playerRewards: 1_000,
  achievementsUnlocked: 1_000,
  // Historial de chat que se conserva: la tabla se poda a este tamaño y el backup exporta e importa
  // solo los más recientes.
  aiMessages: 1_000,
  stringLength: 8_000,
  aiMessageLength: 4_000,
};

// Cotas de los números de un backup. Holgadas frente a lo que genera la app (un completado da como
// mucho 38 XP y una misión 20), pero suficientes para que un fichero manipulado no produzca totales
// absurdos.
const BOUNDS = {
  idLength: 200,
  playerNameLength: 24,
  habitMeta: 100_000,
  eventXp: 1_000,
  attributeXp: 1_500,
  grantedEssence: 1_000,
  missionBonusXp: 1_000,
  essenceBalance: 1_000_000,
  level: 100_000,
};

// Lo que un backup aporta del jugador. XP, nivel, rango, atributos y racha no se leen del fichero:
// se recalculan desde el ledger importado.
export type BackupPlayer = {
  nombre: string | null;
  esencia: number;
  nivelEsenciaOtorgado: number;
  tituloEquipado: string | null;
  auraEquipada: string;
};

export type NormalizedBackup = {
  habits: HabitRecord[];
  events: EventRecord[];
  habitDailyProgress: DailyProgressRecord[];
  player: BackupPlayer;
  dailyMissions: DailyMissionRecord[];
  playerRewards: RewardRecord[];
  achievementsUnlocked: AchievementUnlockedRecord[];
  aiMessages: AiMessage[];
};

type Row = Record<string, unknown>;

export function normalizeBackupData(data: unknown): NormalizedBackup {
  if (!isRecord(data)) throw new Error('Invalid backup data');

  const habits = rows(data.habits, 'habits', BACKUP_LIMITS.habits).map(normalizeHabit);
  assertUnique(habits.map((habit) => habit.id), 'habit id');
  const habitIds = new Set(habits.map((habit) => habit.id));

  // Filas que apuntan a un hábito que no viene en el backup: se descartan en vez de romper la clave
  // foránea o dejar XP huérfano.
  const events = rows(data.events, 'events', BACKUP_LIMITS.events)
    .map(normalizeEvent)
    .filter((event) => habitIds.has(event.habitId));
  assertUnique(events.map((event) => event.id), 'event id');

  const habitDailyProgress = rows(data.habitDailyProgress ?? data.progress, 'habitDailyProgress', BACKUP_LIMITS.habitDailyProgress)
    .map(normalizeProgress)
    .filter((progress) => habitIds.has(progress.habitId));
  assertUnique(habitDailyProgress.map((progress) => progress.id), 'progress id');
  assertUnique(habitDailyProgress.map((progress) => `${progress.habitId}|${progress.fecha}`), 'progress day');

  const dailyMissions = rows(data.dailyMissions ?? data.missions, 'dailyMissions', BACKUP_LIMITS.dailyMissions).map(normalizeMission);
  assertUnique(dailyMissions.map((mission) => mission.fecha), 'mission date');

  const playerRewards = uniqueBy(
    rows(data.playerRewards ?? data.rewards, 'playerRewards', BACKUP_LIMITS.playerRewards).flatMap(normalizeReward),
    (reward) => reward.rewardId,
  );
  const achievementsUnlocked = uniqueBy(
    rows(data.achievementsUnlocked ?? data.achievements, 'achievementsUnlocked', BACKUP_LIMITS.achievementsUnlocked).flatMap(normalizeAchievement),
    (achievement) => achievement.achievementId,
  );
  assertUnique(playerRewards.map((reward) => reward.id), 'reward id');
  assertUnique(achievementsUnlocked.map((achievement) => achievement.id), 'achievement id');

  return {
    habits,
    events,
    habitDailyProgress,
    player: normalizePlayer(Array.isArray(data.player) ? data.player[0] : data.player, playerRewards),
    dailyMissions,
    playerRewards,
    achievementsUnlocked,
    aiMessages: normalizeAiMessages(data.aiMessages),
  };
}

function normalizeHabit(row: unknown): HabitRecord {
  if (!isRecord(row)) throw new Error('Invalid habit row');
  const tipo = row.tipo === 'contable' ? 'contable' : 'binario';
  return {
    id: asId(row.id),
    nombre: asString(row.nombre).trim(),
    icono: normalizeHabitIcon(row.icono ?? row.icon),
    atributos: serializeHabitAttributes(row.atributos ?? row.attributes),
    importancia: clampInt(row.importancia, 1, 5, 'importancia') as HabitImportance,
    tipo,
    meta: tipo === 'binario' ? 1 : clampInt(row.meta, 1, BOUNDS.habitMeta, 'meta'),
    diasSemana: asWeekdays(pick(row, 'dias_semana', 'diasSemana')),
    horaRecordatorio: asClockTime(pick(row, 'hora_recordatorio', 'horaRecordatorio')),
    notificationId: null,
    archivado: asBoolean(row.archivado),
    creadoEn: asTimestamp(pick(row, 'creado_en', 'creadoEn')),
  };
}

function normalizeProgress(row: unknown): DailyProgressRecord {
  if (!isRecord(row)) throw new Error('Invalid progress row');
  return {
    id: asId(row.id),
    habitId: asId(pick(row, 'habit_id', 'habitId')),
    fecha: asDateKey(row.fecha),
    cantidad: clampInt(row.cantidad ?? 0, 0, BOUNDS.habitMeta, 'cantidad'),
    estado: normalizeProgressState(row.estado),
    actualizadoEn: asTimestamp(pick(row, 'actualizado_en', 'actualizadoEn')),
  };
}

function normalizeEvent(row: unknown): EventRecord {
  if (!isRecord(row)) throw new Error('Invalid event row');
  const tipoEvento = pick(row, 'tipo_evento', 'tipoEvento') === 'fallado' ? 'fallado' : 'completado';
  // El ledger se rechaza, no se recorta: un delta fuera de rango o con el signo cambiado no es un
  // dato que la app haya podido escribir.
  const xpDelta = intInRange(pick(row, 'xp_delta', 'xpDelta'), -BOUNDS.eventXp, BOUNDS.eventXp, 'xp_delta');
  if (tipoEvento === 'completado' ? xpDelta < 0 : xpDelta > 0) throw new Error('Invalid backup number: xp_delta');
  const habitName = row.nombre ?? row.habitName;
  return {
    id: asId(row.id),
    habitId: asId(pick(row, 'habit_id', 'habitId')),
    fecha: asDateKey(row.fecha),
    tipoEvento,
    xpDelta,
    attributeDelta: boundedAttributeXp(pick(row, 'attribute_delta', 'attributeDelta')),
    esenciaOtorgada: intInRange(pick(row, 'esencia_otorgada', 'esenciaOtorgada') ?? 0, 0, BOUNDS.grantedEssence, 'esencia_otorgada'),
    registradoEn: asTimestamp(pick(row, 'registrado_en', 'registradoEn')),
    ...(typeof habitName === 'string' ? { habitName } : {}),
  };
}

function normalizeMission(row: unknown): DailyMissionRecord {
  if (!isRecord(row)) throw new Error('Invalid mission row');
  const fecha = asDateKey(row.fecha);
  // 0 es un valor válido: día de descanso, sin hábitos programados.
  const objetivo = clampInt(row.objetivo ?? 0, 0, BACKUP_LIMITS.habits, 'objetivo');
  const completados = clampInt(row.completados ?? 0, 0, BACKUP_LIMITS.habits, 'completados');
  // Un bonus solo cuenta en el ledger si el día realmente quedó completo.
  const isPerfect = objetivo > 0 && completados >= objetivo;
  const reclamada = isPerfect && asBoolean(row.reclamada);
  const streakBonusClaimed = isPerfect && asBoolean(pick(row, 'streak_bonus_claimed', 'streakBonusClaimed'));
  return {
    fecha,
    objetivo,
    completados,
    reclamada,
    xpBonus: intInRange(pick(row, 'xp_bonus', 'xpBonus') ?? 0, 0, BOUNDS.missionBonusXp, 'xp_bonus'),
    perfectStreakDays: clampInt(pick(row, 'perfect_streak_days', 'perfectStreakDays') ?? 0, 0, BACKUP_LIMITS.dailyMissions, 'perfect_streak_days'),
    streakBonusClaimed,
    streakBonusXp: intInRange(pick(row, 'streak_bonus_xp', 'streakBonusXp') ?? PERFECT_WEEK_BONUS_XP, 0, BOUNDS.missionBonusXp, 'streak_bonus_xp'),
    esenciaOtorgada: reclamada
      ? intInRange(pick(row, 'esencia_otorgada', 'esenciaOtorgada') ?? 0, 0, BOUNDS.grantedEssence, 'esencia_otorgada')
      : 0,
    // Backups v1 no guardaban la hora del claim: final del día local de su fecha.
    reclamadaEn: reclamada ? asClaimTimestamp(pick(row, 'reclamada_en', 'reclamadaEn'), fecha) : null,
    streakBonusReclamadoEn: streakBonusClaimed
      ? asClaimTimestamp(pick(row, 'streak_bonus_reclamado_en', 'streakBonusReclamadoEn'), fecha)
      : null,
  };
}

function normalizePlayer(row: unknown, ownedRewards: RewardRecord[]): BackupPlayer {
  const player: Row = isRecord(row) ? row : {};
  const owned = new Set(ownedRewards.map((reward) => reward.rewardId));
  const title = pick(player, 'titulo_equipado', 'tituloEquipado');
  const aura = pick(player, 'aura_equipada', 'auraEquipada');
  const name = player.nombre ?? player.name;
  const trimmedName = typeof name === 'string' ? name.trim().slice(0, BOUNDS.playerNameLength) : '';
  return {
    nombre: trimmedName.length >= 2 ? trimmedName : null,
    esencia: clampInt(player.esencia ?? 0, -BOUNDS.essenceBalance, BOUNDS.essenceBalance, 'esencia'),
    nivelEsenciaOtorgado: clampInt(pick(player, 'nivel_esencia_otorgado', 'nivelEsenciaOtorgado') ?? 1, 1, BOUNDS.level, 'nivel_esencia_otorgado'),
    // Solo se equipa lo que el propio backup dice poseer.
    tituloEquipado: typeof title === 'string' && owned.has(title) && getShopItem(title)?.kind === 'title' ? title : null,
    auraEquipada: typeof aura === 'string' && owned.has(aura) && getShopItem(aura)?.kind === 'aura' ? aura : DEFAULT_AURA_ID,
  };
}

// Recompensas y logros fuera de catálogo se descartan: no hay nada que mostrar ni que equipar.
function normalizeReward(row: unknown): RewardRecord[] {
  if (!isRecord(row)) throw new Error('Invalid reward row');
  const rewardId = pick(row, 'reward_id', 'rewardId');
  const item = typeof rewardId === 'string' ? getShopItem(rewardId) : undefined;
  if (!item || item.id === DEFAULT_AURA_ID) return [];
  return [{ id: asId(row.id), rewardId: item.id, kind: item.kind, adquiridoEn: asTimestamp(pick(row, 'adquirido_en', 'adquiridoEn')) }];
}

function normalizeAchievement(row: unknown): AchievementUnlockedRecord[] {
  if (!isRecord(row)) throw new Error('Invalid achievement row');
  const achievementId = pick(row, 'achievement_id', 'achievementId');
  if (typeof achievementId !== 'string' || !getAchievement(achievementId)) return [];
  return [{ id: asId(row.id), achievementId, desbloqueadoEn: asTimestamp(pick(row, 'desbloqueado_en', 'desbloqueadoEn')) }];
}

// El historial de chat nunca hace fallar una importación: las filas inválidas se descartan, el
// contenido demasiado largo se corta y solo sobreviven los mensajes más recientes.
function normalizeAiMessages(value: unknown): AiMessage[] {
  if (!Array.isArray(value)) return [];
  const messages: AiMessage[] = [];
  for (const row of value) {
    if (!isRecord(row) || typeof row.id !== 'string' || !row.id || row.id.length > BOUNDS.idLength) continue;
    const creadoEn = Date.parse(String(pick(row, 'creado_en', 'creadoEn')));
    if (Number.isNaN(creadoEn)) continue;
    messages.push({
      id: row.id,
      rol: isAiRole(row.rol) ? row.rol : 'system',
      contenido: typeof row.contenido === 'string' ? row.contenido.slice(0, BACKUP_LIMITS.aiMessageLength) : '',
      fecha: typeof row.fecha === 'string' && isDateKey(row.fecha) ? row.fecha : toDateKey(new Date(creadoEn)),
      creadoEn: new Date(creadoEn).toISOString(),
    });
  }
  return keepNewestAiMessages(uniqueBy(messages, (message) => message.id));
}

// Los `aiMessages` más recientes, en orden cronológico. Lo usa también el export.
export function keepNewestAiMessages<T extends { creadoEn: string }>(messages: T[]): T[] {
  return messages
    .slice()
    .sort((a, b) => a.creadoEn.localeCompare(b.creadoEn))
    .slice(-BACKUP_LIMITS.aiMessages);
}

export function isAiRole(value: unknown): value is AiRole {
  return value === 'system' || value === 'user' || value === 'assistant';
}

function normalizeProgressState(value: unknown): ProgressState {
  if (value === 'completado' || value === 'fallado') return value;
  return 'pendiente';
}

function boundedAttributeXp(value: unknown): AttributeXp {
  const xp = normalizeAttributeXp(value);
  for (const id of Object.keys(xp) as (keyof AttributeXp)[]) {
    xp[id] = Math.min(BOUNDS.attributeXp, xp[id]);
  }
  return xp;
}

function rows(value: unknown, label: string, maxItems: number): unknown[] {
  if (!Array.isArray(value)) return [];
  if (value.length > maxItems) throw new Error(`Backup ${label} limit exceeded`);
  return value;
}

function assertUnique(keys: string[], label: string) {
  if (new Set(keys).size !== keys.length) throw new Error(`Duplicate backup ${label}`);
}

function uniqueBy<T>(items: T[], key: (item: T) => string): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(key(item))) return false;
    seen.add(key(item));
    return true;
  });
}

function pick(row: Row, snakeKey: string, camelKey: string): unknown {
  return row[snakeKey] ?? row[camelKey];
}

function asString(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error('Invalid backup field');
  if (value.length > BACKUP_LIMITS.stringLength) throw new Error('Backup field too large');
  return value;
}

function asId(value: unknown): string {
  const id = asString(value);
  if (id.length > BOUNDS.idLength) throw new Error('Backup field too large');
  return id;
}

function isDateKey(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && toDateKey(new Date(`${value}T12:00:00`)) === value;
}

function asDateKey(value: unknown): string {
  if (typeof value !== 'string' || !isDateKey(value)) throw new Error('Invalid backup date');
  return value;
}

// Instante ISO en UTC. Se reescribe en forma canónica porque el ledger se ordena comparando estas
// cadenas. Un campo ausente toma la hora actual, como en backups antiguos.
function asTimestamp(value: unknown): string {
  if (value === undefined || value === null || value === '') return toIsoTimestamp();
  const time = typeof value === 'string' ? Date.parse(value) : Number.NaN;
  if (Number.isNaN(time)) throw new Error('Invalid backup timestamp');
  return new Date(time).toISOString();
}

function asClaimTimestamp(value: unknown, fecha: string): string {
  return value === undefined || value === null || value === '' ? toLocalEndOfDay(fecha) : asTimestamp(value);
}

// CSV de días 1..7 (lunes = 1) sin repetir. Ausente = todos los días, como en backups antiguos.
function asWeekdays(value: unknown): string {
  if (value === undefined || value === null || value === '') return '1,2,3,4,5,6,7';
  if (typeof value !== 'string' || !/^[1-7](,[1-7])*$/.test(value)) throw new Error('Invalid backup weekdays');
  assertUnique(value.split(','), 'weekday');
  return value;
}

function asClockTime(value: unknown): string | null {
  return typeof value === 'string' && parseClockTime(value) ? value : null;
}

function toFiniteNumber(value: unknown, label: string): number {
  const number = typeof value === 'number' ? value : typeof value === 'string' && value.trim() ? Number(value) : Number.NaN;
  if (!Number.isFinite(number)) throw new Error(`Invalid backup number: ${label}`);
  return number;
}

function intInRange(value: unknown, min: number, max: number, label: string): number {
  const number = toFiniteNumber(value, label);
  if (!Number.isInteger(number) || number < min || number > max) throw new Error(`Invalid backup number: ${label}`);
  return number;
}

function clampInt(value: unknown, min: number, max: number, label: string): number {
  return Math.min(max, Math.max(min, Math.round(toFiniteNumber(value, label))));
}

function asBoolean(value: unknown): boolean {
  return value === true || value === 1;
}

function isRecord(value: unknown): value is Row {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
