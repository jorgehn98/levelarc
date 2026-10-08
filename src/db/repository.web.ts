import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  DAILY_MISSION_BONUS_XP,
  PERFECT_WEEK_BONUS_XP,
  canClaimPerfectWeek,
  getClaimedDailyMissionStreak,
  getDailyMissionBonus,
  getPerfectDayStreak,
} from '@/core/missions';
import {
  getCompletionEssence,
  getLevelUpEssenceBetween,
  getMissionEssence,
  getPerfectWeekEssence,
} from '@/core/economy';
import { getLevelFromXp, getLevelProgress } from '@/core/ranks';
import type { SystemContext } from '@/core/aiContext';
import { DEFAULT_AURA_ID, getShopItem, meetsRequirement } from '@/core/shop';
import { getScheduledCompletionStreak } from '@/core/streaks';
import { applyXpDelta, getCompletionXp, getFailureXp } from '@/core/xp';
import {
  applyAttributeDeltas,
  attributeIds,
  createEmptyAttributeXp,
  getAttributeDeltas,
  getAttributeLevelProgress,
  normalizeAttributeXp,
  serializeHabitAttributes,
} from '@/core/attributes';
import { evaluateUnlocked, getAchievement, type AchievementContext } from '@/core/achievements';
import { isAiRole, keepNewestAiMessages, normalizeBackupData } from '@/lib/backupValidation';
import { shiftDateKey, toDateKey, toIsoTimestamp, toLocalEndOfDay } from '@/lib/date';
import { normalizeHabitIcon } from '@/lib/habitIcons';
import { createId } from '@/lib/id';

import type {
  AchievementUnlockedRecord,
  AiEngine,
  AiMessage,
  AiModelStatus,
  AiProfile,
  AiRole,
  DailyMissionRecord,
  DailyProgressRecord,
  EquipResult,
  EventRecord,
  EventType,
  HabitInput,
  HabitInsightDay,
  HabitInsightRecord,
  HabitRecord,
  PlayerRecord,
  PurchaseResult,
  RewardRecord,
  TodayHabit,
} from './types';

export type * from './types';

type WebDb = {
  habits: HabitRecord[];
  events: EventRecord[];
  progress: DailyProgressRecord[];
  player: PlayerRecord;
  missions: DailyMissionRecord[];
  rewards: RewardRecord[];
  achievements: AchievementUnlockedRecord[];
  aiProfile: AiProfile;
  aiMessages: AiMessage[];
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
    const esenciaOtorgada = getCompletionEssence(habit.importancia);
    db.player.xpTotal = applyXpDelta(db.player.xpTotal, xpDelta);
    db.player.atributosXp = applyAttributeDeltas(db.player.atributosXp, attributeDelta);
    syncPlayer(db);
    grantEssence(db, esenciaOtorgada);
    progress.estado = 'completado';
    db.events.push(createEvent(habit, dateKey, 'completado', xpDelta, attributeDelta, esenciaOtorgada));
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
  // Persistimos la penalización NOMINAL (no el delta ya recortado por el suelo de nivel). El suelo
  // se aplica solo al proyectar el total (applyXpDelta), aquí y en recalculatePlayerFromLedger, así
  // reconstruir desde el ledger es idempotente y reproduce el mismo total que el jugador ve en vivo.
  db.events.push(createEvent(habit, dateKey, 'fallado', xpDelta));
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
  // Paridad con el nativo: sincronizamos la misión al cerrar el día. Aquí vive la revocación de
  // esencia de misión, así que debe correr también en web.
  const db = await loadDb();
  if (syncMission(db, dateKey)) {
    recalculatePlayerFromLedger(db);
  }
  await saveDb(db);
}

export async function undoTodayHabit(habitId: string, dateKey = toDateKey()) {
  const db = await loadDb();
  // Revertimos exactamente la esencia que se concedió al registrar los eventos (persistida en
  // esenciaOtorgada), no la recomputada desde la importancia actual: si la importancia cambió
  // entre completar y deshacer, recomputar descuadraría el saldo. El nivel no baja, así que la
  // esencia de nivel no se toca.
  const esenciaRevertida = db.events
    .filter((event) => event.habitId === habitId && event.fecha === dateKey)
    .reduce((total, event) => total + (event.esenciaOtorgada ?? 0), 0);
  if (esenciaRevertida !== 0) grantEssence(db, -esenciaRevertida);
  db.events = db.events.filter((event) => !(event.habitId === habitId && event.fecha === dateKey));
  db.progress = db.progress.filter((progress) => !(progress.habitId === habitId && progress.fecha === dateKey));
  syncMission(db, dateKey);
  recalculatePlayerFromLedger(db);
  await saveDb(db);
}

// Proyecta XP, atributos y racha de misiones desde el ledger (eventos + bonus reclamados) en el
// orden real en que ocurrieron. La esencia es gastable, no derivada: no se toca aquí.
function projectLedger(db: WebDb) {
  const ledger = [
    ...db.events.map((event) => ({ attributeDelta: event.attributeDelta, instante: event.registradoEn, xpDelta: event.xpDelta })),
    ...db.missions.flatMap((mission) => [
      ...(mission.reclamada
        ? [{ attributeDelta: createEmptyAttributeXp(), instante: mission.reclamadaEn ?? mission.fecha, xpDelta: mission.xpBonus }]
        : []),
      ...(mission.streakBonusClaimed
        ? [{ attributeDelta: createEmptyAttributeXp(), instante: mission.streakBonusReclamadoEn ?? mission.fecha, xpDelta: mission.streakBonusXp }]
        : []),
    ]),
  ].sort((a, b) => (a.instante < b.instante ? -1 : a.instante > b.instante ? 1 : 0));

  db.player.xpTotal = 0;
  db.player.atributosXp = createEmptyAttributeXp();
  for (const entry of ledger) {
    db.player.xpTotal = applyXpDelta(db.player.xpTotal, entry.xpDelta);
    db.player.atributosXp = applyAttributeDeltas(db.player.atributosXp, entry.attributeDelta);
  }
  db.player.rachaMisiones = getLatestClaimedMissionStreak(db);
}

function recalculatePlayerFromLedger(db: WebDb) {
  projectLedger(db);
  // syncPlayer llama a syncLevelUpEssence, que es idempotente y nunca resta.
  syncPlayer(db);
}

export async function getPlayer(): Promise<PlayerRecord> {
  const db = await loadDb();
  // Suelo en cero solo al exponerlo: el saldo guardado puede ser negativo (gastar y deshacer).
  return { ...db.player, esencia: Math.max(0, db.player.esencia) };
}

export async function updatePlayerName(name: string) {
  const db = await loadDb();
  db.player.nombre = normalizePlayerName(name);
  db.player.actualizadoEn = toIsoTimestamp();
  await saveDb(db);
}

// IDs de cosméticos poseídos. La aura cian (default) siempre está incluida aunque no tenga fila,
// porque es gratis y todo jugador la posee de inicio.
export async function listOwnedRewardIds(): Promise<string[]> {
  const db = await loadDb();
  const owned = new Set(db.rewards.map((reward) => reward.rewardId));
  owned.add(DEFAULT_AURA_ID);
  return [...owned];
}

export async function purchaseReward(rewardId: string): Promise<PurchaseResult> {
  const item = getShopItem(rewardId);
  if (!item) return { ok: false, reason: 'unknown' };
  if (rewardId === DEFAULT_AURA_ID) return { ok: false, reason: 'owned' };

  const db = await loadDb();
  if (db.rewards.some((reward) => reward.rewardId === rewardId)) return { ok: false, reason: 'owned' };
  if (!meetsRequirement(item, db.player.nivel, db.player.rango)) return { ok: false, reason: 'locked' };
  if (Math.max(0, db.player.esencia) < item.cost) return { ok: false, reason: 'insufficient' };

  grantEssence(db, -item.cost);
  db.rewards.push({ id: createId(), rewardId, kind: item.kind, adquiridoEn: toIsoTimestamp() });
  await saveDb(db);
  return { ok: true };
}

export async function equipReward(rewardId: string): Promise<EquipResult> {
  const item = getShopItem(rewardId);
  if (!item) return { ok: false, reason: 'unknown' };

  const db = await loadDb();
  const owned = rewardId === DEFAULT_AURA_ID || db.rewards.some((reward) => reward.rewardId === rewardId);
  if (!owned) return { ok: false, reason: 'notOwned' };

  if (item.kind === 'title') {
    db.player.tituloEquipado = rewardId;
  } else {
    db.player.auraEquipada = rewardId;
  }
  db.player.actualizadoEn = toIsoTimestamp();
  await saveDb(db);
  return { ok: true };
}

export async function unequipTitle(): Promise<void> {
  const db = await loadDb();
  db.player.tituloEquipado = null;
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
  if (!mission.reclamada && mission.objetivo > 0 && mission.completados >= mission.objetivo) {
    // Persistimos la esencia concedida en el claim para revertir ese valor exacto si la misión
    // deja de estar completa, en vez de recomputarla desde un objetivo que pudo cambiar.
    const esenciaOtorgada = getMissionEssence(mission.objetivo);
    mission.reclamada = true;
    mission.reclamadaEn = toIsoTimestamp();
    mission.esenciaOtorgada = esenciaOtorgada;
    db.player.xpTotal = applyXpDelta(db.player.xpTotal, mission.xpBonus);
    db.player.rachaMisiones = getClaimedDailyMissionStreak(db.missions, shiftDateKey(dateKey, -1)) + 1;
    syncPlayer(db);
    grantEssence(db, esenciaOtorgada);
  }
  // Se guarda siempre: la sincronización previa ya pudo cambiar la misión o revocar un bonus.
  await saveDb(db);
}

export async function claimPerfectWeekMission(dateKey = toDateKey()) {
  const db = await loadDb();
  const mission = ensureMission(db, dateKey);
  if (syncMission(db, dateKey)) {
    recalculatePlayerFromLedger(db);
  }
  if (canClaimPerfectWeek(mission)) {
    mission.streakBonusClaimed = true;
    mission.streakBonusReclamadoEn = toIsoTimestamp();
    db.player.xpTotal = applyXpDelta(db.player.xpTotal, mission.streakBonusXp);
    syncPlayer(db);
    grantEssence(db, getPerfectWeekEssence());
  }
  await saveDb(db);
}

export async function getRecentEvents(limit = 25) {
  const db = await loadDb();
  return db.events.slice().sort((a, b) => b.registradoEn.localeCompare(a.registradoEn)).slice(0, limit);
}

// --- Chat con el Sistema (IA local) ---

export async function getAiProfile(): Promise<AiProfile> {
  const db = await loadDb();
  return db.aiProfile;
}

export async function setAiEnabled(enabled: boolean): Promise<void> {
  const db = await loadDb();
  db.aiProfile.enabled = enabled;
  db.aiProfile.actualizadoEn = toIsoTimestamp();
  await saveDb(db);
}

export async function setAiEngine(engine: AiEngine): Promise<void> {
  const db = await loadDb();
  db.aiProfile.engine = engine;
  db.aiProfile.actualizadoEn = toIsoTimestamp();
  await saveDb(db);
}

export async function setAiModelStatus(status: AiModelStatus, modelPath?: string | null): Promise<void> {
  const db = await loadDb();
  db.aiProfile.modelStatus = status;
  db.aiProfile.modelPath = modelPath ?? null;
  db.aiProfile.actualizadoEn = toIsoTimestamp();
  await saveDb(db);
}

export async function listAiMessages(limit?: number): Promise<AiMessage[]> {
  const db = await loadDb();
  const ordered = db.aiMessages.slice().sort((a, b) => a.creadoEn.localeCompare(b.creadoEn));
  // Con `limit` devolvemos los N más recientes, manteniendo el orden ascendente.
  return limit && limit > 0 ? ordered.slice(-limit) : ordered;
}

export async function addAiMessage(rol: AiRole, contenido: string, dateKey = toDateKey()): Promise<AiMessage> {
  const db = await loadDb();
  const message: AiMessage = { id: createId(), rol, contenido, fecha: dateKey, creadoEn: toIsoTimestamp() };
  db.aiMessages.push(message);
  // Poda: se conservan solo los mensajes más recientes, los mismos que caben en un backup.
  db.aiMessages = keepNewestAiMessages(db.aiMessages);
  await saveDb(db);
  return message;
}

export async function clearAiMessages(): Promise<void> {
  const db = await loadDb();
  db.aiMessages = [];
  await saveDb(db);
}

// Arma el SystemContext desde el estado actual (paridad con el nativo). Reutiliza getLevelProgress y
// getAttributeLevelProgress; no duplica la lógica de nivel/atributos/racha.
// Proxy normalizada 0..1 de la racha programada, usada como `ratio` del eslabón débil cuando no hay
// consistencia 30d barata a mano: 0 con racha 0, satura a 1 a la semana. Misma lógica en nativo.
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
  const db = await loadDb();
  const player = db.player;
  const todayHabits = await listTodayHabits(dateKey);
  const mission = ensureMission(db, dateKey);
  syncMission(db, dateKey);

  const progress = getLevelProgress(player.xpTotal);

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

  let mejorRachaHabito = 0;
  // Eslabón débil del día: de los hábitos AÚN pendientes, el de peor racha programada (la señal más
  // barata, ya calculada aquí para mejorRachaHabito; no añade trabajo). Empate -> mayor importancia.
  // El ratio es una proxy normalizada de la racha (satura a la semana), sin consistencia 30d. null
  // si no hay pendientes; el briefing degrada solo. MISMA lógica que el nativo (paridad).
  let eslabonDebil: { habit: TodayHabit; streak: number } | null = null;
  for (const habit of todayHabits) {
    const priorStreak = getHabitCompletionStreak(db, habit.id, dateKey, habit.diasSemana);
    const streak = habit.estado === 'completado' ? priorStreak + 1 : priorStreak;
    if (streak > mejorRachaHabito) mejorRachaHabito = streak;
    if (habit.estado === 'pendiente' && isWeakerLink(eslabonDebil, habit, priorStreak)) {
      eslabonDebil = { habit, streak: priorStreak };
    }
  }

  const maxPerfect = db.missions.reduce((max, m) => Math.max(max, m.perfectStreakDays), 0);

  return {
    nombre: player.nombre,
    nivel: player.nivel,
    rango: player.rango,
    esencia: Math.max(0, player.esencia),
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
    rachaPerfecta: Math.max(mission.perfectStreakDays, maxPerfect),
    eslabonDebil: eslabonDebil
      ? { nombre: eslabonDebil.habit.nombre, ratio: streakToRatio(eslabonDebil.streak) }
      : null,
  };
}

// Arma el contexto de stats agregadas que consume el evaluador de logros. Reutiliza la lógica de
// racha (getHabitCompletionStreak) y los niveles de atributo (getAttributeLevelProgress) ya
// existentes en vez de duplicarlas.
async function buildAchievementContext(): Promise<AchievementContext> {
  const db = await loadDb();
  const dateKey = toDateKey();

  let maxRachaHabitoActual = 0;
  for (const habit of db.habits.filter((item) => !item.archivado)) {
    const priorStreak = getHabitCompletionStreak(db, habit.id, dateKey, habit.diasSemana);
    const todayCompleted = db.progress.some(
      (item) => item.habitId === habit.id && item.fecha === dateKey && item.estado === 'completado',
    );
    const currentStreak = todayCompleted ? priorStreak + 1 : priorStreak;
    if (currentStreak > maxRachaHabitoActual) maxRachaHabitoActual = currentStreak;
  }

  const maxNivelAtributo = attributeIds.reduce(
    (max, id) => Math.max(max, getAttributeLevelProgress(db.player.atributosXp[id]).level),
    0,
  );

  return {
    nivel: db.player.nivel,
    rango: db.player.rango,
    habitosCreados: db.habits.length,
    totalCompletados: db.events.filter((event) => event.tipoEvento === 'completado').length,
    maxRachaHabitoActual,
    misionesReclamadas: db.missions.filter((mission) => mission.reclamada).length,
    rachaMisionesActual: db.player.rachaMisiones,
    rachaPerfectaMax: db.missions.reduce((max, mission) => Math.max(max, mission.perfectStreakDays), 0),
    maxNivelAtributo,
    cosmeticosComprados: db.rewards.length,
  };
}

export async function listUnlockedAchievementIds(): Promise<string[]> {
  const db = await loadDb();
  return db.achievements.map((entry) => entry.achievementId);
}

// Evalúa el catálogo contra el estado actual, persiste los nuevos logros y otorga su Esencia.
// Idempotente: antes de insertar cada logro comprobamos que no exista ya en db.achievements (la
// misma semántica que el INSERT OR IGNORE del nativo), así un check solapado no duplica Esencia ni
// celebración. Si no hay nuevos devuelve [].
export async function evaluateAndUnlockAchievements(): Promise<{ id: string; essenceReward: number }[]> {
  const context = await buildAchievementContext();
  const unlockedIds = evaluateUnlocked(context);
  const db = await loadDb();
  const already = new Set(db.achievements.map((entry) => entry.achievementId));

  const candidates = unlockedIds
    .filter((id) => !already.has(id))
    .map((id) => ({ id, essenceReward: getAchievement(id)?.essenceReward ?? 0 }));

  if (candidates.length === 0) return [];

  const newlyUnlocked: { id: string; essenceReward: number }[] = [];

  for (const { id, essenceReward } of candidates) {
    // Re-check sobre el estado recién cargado: si otra llamada ya lo añadió, lo saltamos (ni
    // Esencia ni celebración). Solo los que de verdad insertamos otorgan y se devuelven.
    if (db.achievements.some((entry) => entry.achievementId === id)) continue;
    db.achievements.push({ id: createId(), achievementId: id, desbloqueadoEn: toIsoTimestamp() });
    if (essenceReward > 0) grantEssence(db, essenceReward);
    newlyUnlocked.push({ id, essenceReward });
  }
  await saveDb(db);

  return newlyUnlocked;
}

export async function exportAllData() {
  const db = await loadDb();
  return { ...db, aiMessages: keepNewestAiMessages(db.aiMessages) };
}

export async function importAllData(data: unknown) {
  const backup = normalizeBackupData(data);
  const db = createEmptyDb();
  db.habits = backup.habits;
  db.events = backup.events;
  db.progress = backup.habitDailyProgress;
  db.missions = backup.dailyMissions;
  db.rewards = backup.playerRewards;
  db.achievements = backup.achievementsUnlocked;
  db.aiMessages = backup.aiMessages;
  // La caché del jugador no se copia del fichero: sale del ledger importado. El marcador de esencia
  // de nivel nunca queda por debajo del nivel resultante, así que importar no vuelve a pagar niveles
  // que el saldo del backup ya incluye. La IA vuelve a plantilla: la ruta del modelo no es portable.
  projectLedger(db);
  const progress = getLevelProgress(db.player.xpTotal);
  db.player = {
    ...db.player,
    ...backup.player,
    nivel: progress.level,
    rango: progress.rank,
    nivelEsenciaOtorgado: Math.max(backup.player.nivelEsenciaOtorgado, progress.level),
  };
  ensureMission(db, toDateKey());
  if (syncMission(db, toDateKey())) recalculatePlayerFromLedger(db);
  await saveDb(db);
}

async function ensureDailyMission(dateKey: string) {
  const db = await loadDb();
  ensureMission(db, dateKey);
  // Si la sincronización revoca una misión reclamada, el XP del bonus sale también de la caché.
  if (syncMission(db, dateKey)) recalculatePlayerFromLedger(db);
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
      esenciaOtorgada: 0,
      reclamadaEn: null,
      streakBonusReclamadoEn: null,
    };
    db.missions.push(mission);
  }
  return mission;
}

function syncMission(db: WebDb, dateKey: string) {
  const mission = ensureMission(db, dateKey);
  const wasClaimed = mission.reclamada;
  const wasStreakBonusClaimed = mission.streakBonusClaimed;
  const claimedEssence = mission.esenciaOtorgada;
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
  const previousPerfectStreak = getPerfectDayStreak(db.missions, shiftDateKey(dateKey, -1));
  const isPerfectToday = mission.objetivo > 0 && mission.completados >= mission.objetivo;
  mission.perfectStreakDays = isPerfectToday ? previousPerfectStreak + 1 : previousPerfectStreak;
  if (!isPerfectToday) {
    mission.reclamada = false;
    mission.reclamadaEn = null;
    mission.streakBonusClaimed = false;
    mission.streakBonusReclamadoEn = null;
  }
  // Lo ya reclamado no se reescribe: archivar, desarchivar o editar hábitos después no cambia el XP
  // que ese claim aportó al ledger.
  if (!mission.reclamada) mission.xpBonus = getDailyMissionBonus(mission.objetivo);
  if (!mission.streakBonusClaimed) mission.streakBonusXp = PERFECT_WEEK_BONUS_XP;

  const missionRevoked = wasClaimed && !mission.reclamada;
  const streakBonusRevoked = wasStreakBonusClaimed && !mission.streakBonusClaimed;
  // El XP se reconstruye desde el ledger en el llamador; la esencia es gastable, así que la
  // revertimos aquí a mano para mantener coherencia con la concesión. Devolvemos exactamente lo
  // concedido en el claim (persistido), no lo recomputado desde el objetivo actual, que pudo
  // cambiar si el set de hábitos del día cambió; tras revocar lo ponemos a 0.
  if (missionRevoked) {
    grantEssence(db, -claimedEssence);
    mission.esenciaOtorgada = 0;
  }
  // La racha perfecta usa una constante (PERFECT_WEEK_ESSENCE), así que conceder y revertir
  // siempre cuadra; no necesita persistirse. Si algún día se hace variable, habría que persistir
  // su esencia igual que la misión diaria.
  if (streakBonusRevoked) grantEssence(db, -getPerfectWeekEssence());

  return missionRevoked || streakBonusRevoked;
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
  syncLevelUpEssence(db);
}

// Suma (o resta, con delta negativo) esencia gastable. Sin suelo: tras gastar y deshacer el saldo
// guardado queda negativo, y eso impide fabricar esencia repitiendo completar-gastar-deshacer.
function grantEssence(db: WebDb, deltaEsencia: number) {
  db.player.esencia += deltaEsencia;
}

// Otorga esencia por las subidas de nivel pendientes. Idempotente y monotónico: el nivel
// tiene suelo y nunca baja, así que recalcular XP nunca resta esencia de nivel.
function syncLevelUpEssence(db: WebDb) {
  const nivelActual = getLevelFromXp(db.player.xpTotal);
  if (nivelActual <= db.player.nivelEsenciaOtorgado) return;
  grantEssence(db, getLevelUpEssenceBetween(db.player.nivelEsenciaOtorgado, nivelActual));
  db.player.nivelEsenciaOtorgado = nivelActual;
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
  esenciaOtorgada = 0,
): EventRecord {
  return {
    id: createId(),
    habitId: habit.id,
    habitName: habit.nombre,
    fecha: dateKey,
    tipoEvento,
    xpDelta,
    attributeDelta,
    esenciaOtorgada,
    registradoEn: toIsoTimestamp(),
  };
}

async function loadDb(): Promise<WebDb> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return createEmptyDb();
  const empty = createEmptyDb();
  const parsed = JSON.parse(raw) as Partial<WebDb>;
  const db = { ...empty, ...parsed, player: { ...empty.player, ...parsed.player } };
  // Player antiguo sin esencia: anclamos el marcador de nivel al nivel actual para que la
  // economía empiece a contar desde ahora y no regale esencia retroactiva por niveles ya
  // alcanzados. Si ya trae el campo, lo respetamos.
  if (parsed.player && parsed.player.nivelEsenciaOtorgado == null) {
    db.player.nivelEsenciaOtorgado = db.player.nivel;
  }
  db.habits = db.habits.map((habit) => ({
    ...habit,
    icono: normalizeHabitIcon(habit.icono),
    atributos: serializeHabitAttributes(habit.atributos),
  }));
  db.events = db.events.map((event) => ({
    ...event,
    attributeDelta: normalizeAttributeXp(event.attributeDelta),
    esenciaOtorgada: Math.max(0, Math.floor(Number(event.esenciaOtorgada ?? 0))),
  }));
  db.player.atributosXp = normalizeAttributeXp(db.player.atributosXp);
  // Player antiguo sin cosméticos: defaults seguros (aura cian, sin título).
  db.player.auraEquipada = db.player.auraEquipada ?? DEFAULT_AURA_ID;
  db.player.tituloEquipado = db.player.tituloEquipado ?? null;
  db.rewards = Array.isArray(db.rewards) ? db.rewards : [];
  db.achievements = Array.isArray(db.achievements) ? db.achievements : [];
  // Blob antiguo sin IA → defaults / []. La tabla no existía, no hay nada que restaurar.
  db.aiProfile = normalizeAiProfile(parsed.aiProfile) ?? createDefaultAiProfile();
  db.aiMessages = Array.isArray(db.aiMessages)
    ? db.aiMessages.map((message) => ({ ...message, rol: isAiRole(message.rol) ? message.rol : 'system' }))
    : [];
  db.missions = db.missions.map((mission) => ({
    ...mission,
    perfectStreakDays: Math.max(0, Math.floor(Number(mission.perfectStreakDays ?? 0))),
    streakBonusClaimed: Boolean(mission.streakBonusClaimed),
    streakBonusXp: Math.max(0, Math.floor(Number(mission.streakBonusXp ?? PERFECT_WEEK_BONUS_XP))),
    esenciaOtorgada: Math.max(0, Math.floor(Number(mission.esenciaOtorgada ?? 0))),
    // Blob anterior a la hora de claim: final del día local de su fecha.
    reclamadaEn: mission.reclamada ? mission.reclamadaEn ?? toLocalEndOfDay(mission.fecha) : null,
    streakBonusReclamadoEn: mission.streakBonusClaimed ? mission.streakBonusReclamadoEn ?? toLocalEndOfDay(mission.fecha) : null,
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
      esencia: 0,
      nivelEsenciaOtorgado: 1,
      tituloEquipado: null,
      auraEquipada: DEFAULT_AURA_ID,
      actualizadoEn: toIsoTimestamp(),
    },
    missions: [],
    rewards: [],
    achievements: [],
    aiProfile: createDefaultAiProfile(),
    aiMessages: [],
  };
}

function createDefaultAiProfile(): AiProfile {
  return {
    enabled: false,
    engine: 'template',
    modelStatus: 'none',
    modelPath: null,
    actualizadoEn: toIsoTimestamp(),
  };
}

function normalizeAiProfile(row: unknown): AiProfile | null {
  if (!isRecord(row)) return null;
  const status = row.modelStatus;
  return {
    enabled: row.enabled === true,
    engine: row.engine === 'llama' ? 'llama' : 'template',
    modelStatus: isAiModelStatus(status) ? status : 'none',
    modelPath: typeof row.modelPath === 'string' && row.modelPath ? row.modelPath : null,
    actualizadoEn: typeof row.actualizadoEn === 'string' ? row.actualizadoEn : toIsoTimestamp(),
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
