import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, Share } from 'react-native';
import { create } from 'zustand';

import { attributeIds, getAttributeLevelProgress } from '@/core/attributes';
import { compareRanks, getLevelProgress } from '@/core/ranks';
import { createBackupPayload, parseBackupPayload } from '@/lib/backup';
import type { Language } from '@/i18n';
import type { Rank } from '@/theme/colors';
import { getDateKeysBetween, getYesterdayDateKey, toDateKey } from '@/lib/date';
import {
  archiveHabit,
  claimDailyMission,
  claimPerfectWeekMission as claimPerfectWeekMissionRepo,
  closeDay,
  createHabit,
  equipReward,
  evaluateAndUnlockAchievements,
  exportAllData,
  getDailyMission,
  getHabit,
  getHabitInsight,
  getPlayer,
  getRecentEvents,
  incrementHabitProgress,
  initializeDatabase,
  importAllData,
  listHabits,
  listOwnedRewardIds,
  listTodayHabits,
  listUnlockedAchievementIds,
  markHabitFailed,
  purchaseReward,
  resetAllData,
  undoTodayHabit,
  unarchiveHabit,
  unequipTitle,
  updateHabit,
  updatePlayerName,
  type DailyMissionRecord,
  type EquipResult,
  type EventRecord,
  type HabitInput,
  type HabitInsightRecord,
  type HabitRecord,
  type PlayerRecord,
  type PurchaseResult,
  type TodayHabit,
} from '@/db/repository';

// Canal único de celebraciones que el overlay global consume en secuencia. Cada tipo de progreso
// se traduce a una de estas variantes y renderiza su propia tarjeta reutilizando la misma animación.
export type Celebration =
  | { kind: 'achievement'; id: string; essenceReward: number }
  | { kind: 'level'; level: number }
  | { kind: 'attribute'; attribute: string; level: number };

type AppState = {
  isReady: boolean;
  isBusy: boolean;
  language: Language;
  habits: HabitRecord[];
  todayHabits: TodayHabit[];
  player: PlayerRecord | null;
  dailyMission: DailyMissionRecord | null;
  events: EventRecord[];
  ownedRewards: string[];
  unlockedAchievements: string[];
  celebrations: Celebration[];
  pendingRankUp: { from: Rank; to: Rank } | null;
  boot: () => Promise<void>;
  refresh: () => Promise<void>;
  runAchievementCheck: (celebrate: boolean) => Promise<void>;
  consumeCelebrations: () => void;
  consumeRankUp: () => void;
  saveHabit: (input: HabitInput, id?: string) => Promise<void>;
  getHabitById: (id: string) => Promise<HabitRecord | null>;
  getHabitInsightById: (id: string) => Promise<HabitInsightRecord | null>;
  archiveHabitById: (id: string) => Promise<void>;
  unarchiveHabitById: (id: string) => Promise<void>;
  incrementHabit: (id: string) => Promise<void>;
  failHabit: (id: string) => Promise<void>;
  undoHabit: (id: string) => Promise<void>;
  claimMission: () => Promise<void>;
  claimPerfectWeekMission: () => Promise<void>;
  closeMissedDays: () => Promise<void>;
  closeToday: () => Promise<void>;
  setLanguage: (language: Language) => Promise<void>;
  setPlayerName: (name: string) => Promise<void>;
  purchaseReward: (id: string) => Promise<PurchaseResult>;
  equipReward: (id: string) => Promise<EquipResult>;
  unequipTitle: () => Promise<void>;
  exportBackup: () => Promise<void>;
  importBackup: (rawBackup: string) => Promise<void>;
  resetAll: () => Promise<void>;
};

const LANGUAGE_KEY = 'levelarc.language';
const LAST_ACTIVE_DATE_KEY = 'levelarc.lastActiveDate';

// Umbral de ausencia: nº mínimo de días COMPLETOS sin actividad que dispara la aparición de
// "vuelta" del Sistema. 2 = el Sistema saluda tras al menos dos días enteros de ausencia real.
const COMEBACK_MIN_DAYS = 2;

// ¿Una misión diaria está completa? (objetivo>0 y completados alcanzan el objetivo). Helper local
// para detectar la transición pendiente→completada que dispara la aparición del Sistema.
function isMissionComplete(mission: DailyMissionRecord | null): boolean {
  return !!mission && mission.objetivo > 0 && mission.completados >= mission.objetivo;
}

// ¿La misión diaria cerró INCOMPLETA? (tenía objetivo>0 y los completados no lo alcanzaron). Helper
// para disparar 'mission_failed' al cerrar el día, simétrico a isMissionComplete.
function isMissionIncomplete(mission: DailyMissionRecord | null): boolean {
  return !!mission && mission.objetivo > 0 && mission.completados < mission.objetivo;
}

// Hitos de racha de hábito que disparan la aparición 'streak_milestone'. El trigger salta solo cuando
// la racha ALCANZA EXACTAMENTE uno de estos valores (no en cada día por encima), evitando spam.
const STREAK_MILESTONES = [7, 30];

// Racha mínima de un hábito cuya RUPTURA merece una reacción de NYX (aparición 'streak_broken'). Por
// debajo de esto, romperla es poco significativo y no salta. El cap de 1/sesión limita igualmente la
// frecuencia de apariciones, así que esto solo filtra qué fallos son dignos de comentario.
const STREAK_BROKEN_MIN = 3;

// Ratio de progreso de nivel (0..1) a partir del cual el Sistema avisa de que estás "cerca de subir".
// Coincide con el umbral de sys_near_level en la voz del Sistema (systemVoice.ts).
const NEAR_LEVEL_RATIO = 0.8;

// ¿El progreso de nivel CRUZA el umbral de "cerca de subir" con esta acción, SIN subir de nivel?
// Compara el ratio antes/después: dispara solo en la transición <0.8 → >=0.8 (no si ya estaba por
// encima), y nunca si la acción subió de nivel (ese momento ya lo cubre la celebración de nivel).
function crossedNearLevel(prevPlayer: PlayerRecord | null, nextPlayer: PlayerRecord | null): boolean {
  if (!prevPlayer || !nextPlayer) return false;
  if (nextPlayer.nivel !== prevPlayer.nivel) return false;
  const prevRatio = getLevelProgress(prevPlayer.xpTotal).ratio;
  const nextRatio = getLevelProgress(nextPlayer.xpTotal).ratio;
  return prevRatio < NEAR_LEVEL_RATIO && nextRatio >= NEAR_LEVEL_RATIO;
}

// Dispara una aparición del Sistema sin bloquear ni romper la acción de juego. Import dinámico del
// aiStore para evitar un ciclo de import en carga (appStore ↔ aiStore); el catch traga cualquier
// fallo (aiStore aún sin cargar, AsyncStorage, etc.) para que el juego nunca se rompa por esto.
function fireInterjection(trigger: import('@/core/systemVoice').InterjectionTrigger): void {
  import('./aiStore')
    .then(({ useAiStore }) => useAiStore.getState().triggerInterjection(trigger))
    .catch(() => undefined);
}

// Guard de reentrada: si ya hay un check de logros en curso, una segunda llamada concurrente
// retorna sin hacer nada. El check en curso ve el estado más reciente, así que captura cualquier
// logro pendiente; relanzarlo en paralelo solo duplicaría trabajo (la correctitud ya la garantiza
// el INSERT OR IGNORE del repo).
let achievementCheckInFlight = false;

// Compara el jugador antes/después de una acción con XP positivo y devuelve las celebraciones de
// progreso a encolar: subida de nivel del jugador y subidas de nivel de atributo.
//
// Coordinación con rank-up: cuando un nivel cruza un umbral de rango (nextPlayer.rango distinto),
// la cinemática de ascenso ya cubre ese momento, así que NO encolamos toast de nivel para no
// duplicar la celebración. Si solo cambia el nivel (mismo rango), encolamos un único toast con el
// nivel final aunque hayan subido varios, para no spamear.
function queueProgressCelebrations(
  prevPlayer: PlayerRecord | null,
  nextPlayer: PlayerRecord | null,
): Celebration[] {
  if (!prevPlayer || !nextPlayer) return [];

  const celebrations: Celebration[] = [];

  const rankChanged = nextPlayer.rango !== prevPlayer.rango;
  if (nextPlayer.nivel > prevPlayer.nivel && !rankChanged) {
    celebrations.push({ kind: 'level', level: nextPlayer.nivel });
  }

  for (const attribute of attributeIds) {
    const prevLevel = getAttributeLevelProgress(prevPlayer.atributosXp[attribute]).level;
    const nextLevel = getAttributeLevelProgress(nextPlayer.atributosXp[attribute]).level;
    if (nextLevel > prevLevel) {
      celebrations.push({ kind: 'attribute', attribute, level: nextLevel });
    }
  }

  return celebrations;
}

// Encola celebraciones de progreso en el canal único, sin pisar las que ya estén pendientes.
function appendCelebrations(set: (partial: (state: AppState) => Partial<AppState>) => void, celebrations: Celebration[]) {
  if (celebrations.length === 0) return;
  set((state) => ({ celebrations: [...state.celebrations, ...celebrations] }));
}

// Tras una acción con XP positivo, si el rango subió de verdad marca pendingRankUp para que el
// layout dispare la cinemática de ascenso. Se llama solo desde acciones de juego (nunca boot/refresh),
// así que el pending solo pasa de null a valor por una acción real del jugador.
function flagRankUp(
  set: (partial: (state: AppState) => Partial<AppState>) => void,
  prevPlayer: PlayerRecord | null,
  nextPlayer: PlayerRecord | null,
) {
  if (!prevPlayer || !nextPlayer) return;
  if (compareRanks(nextPlayer.rango, prevPlayer.rango) > 0) {
    set(() => ({ pendingRankUp: { from: prevPlayer.rango, to: nextPlayer.rango } }));
  }
}

// Dispara 'level_up' si la acción subió de nivel al jugador SIN cambiar de rango. El ascenso de rango
// tiene su propia cinemática y no queremos pisarla; el salto de nivel "normal" sí es un buen momento
// para que NYX asome. Mismo criterio que el toast de nivel de queueProgressCelebrations, pero como
// aparición de NYX. El cap de 1/sesión evita que coincida con avalanchas.
function fireLevelUp(prevPlayer: PlayerRecord | null, nextPlayer: PlayerRecord | null): void {
  if (!prevPlayer || !nextPlayer) return;
  if (nextPlayer.rango !== prevPlayer.rango) return;
  if (nextPlayer.nivel > prevPlayer.nivel) fireInterjection('level_up');
}

export const useAppStore = create<AppState>((set, get) => ({
  isReady: false,
  isBusy: false,
  language: 'es',
  habits: [],
  todayHabits: [],
  player: null,
  dailyMission: null,
  events: [],
  ownedRewards: [],
  unlockedAchievements: [],
  celebrations: [],
  pendingRankUp: null,
  boot: async () => {
    set({ isBusy: true });
    await initializeDatabase();
    const storedLanguage = await AsyncStorage.getItem(LANGUAGE_KEY);
    if (storedLanguage === 'es' || storedLanguage === 'en') {
      set({ language: storedLanguage });
    }
    await get().closeMissedDays();
    // Desbloqueo silencioso al arrancar: otorga la Esencia de logros ya cumplidos por el estado
    // actual sin celebrar (evita una avalancha de toasts al actualizar la app). El regalo inicial
    // por logros ya conseguidos es intencional.
    await get().runAchievementCheck(false);
    await get().refresh();
    set({ isReady: true, isBusy: false });
  },
  refresh: async () => {
    const [habits, todayHabits, player, dailyMission, events, ownedRewards, unlockedAchievements] = await Promise.all([
      listHabits(true),
      listTodayHabits(),
      getPlayer(),
      getDailyMission(),
      getRecentEvents(250),
      listOwnedRewardIds(),
      listUnlockedAchievementIds(),
    ]);
    set({ habits, todayHabits, player, dailyMission, events, ownedRewards, unlockedAchievements });
  },
  // Evalúa y desbloquea logros tras una mutación del jugador. Si hay nuevos y celebrate es true,
  // los encola como celebraciones para que la UI los muestre. Siempre refresca el estado para
  // reflejar la Esencia otorgada y la lista de logros desbloqueados.
  runAchievementCheck: async (celebrate) => {
    if (achievementCheckInFlight) return;
    achievementCheckInFlight = true;
    try {
      const newlyUnlocked = await evaluateAndUnlockAchievements();
      if (newlyUnlocked.length > 0) {
        if (celebrate) {
          const queued: Celebration[] = newlyUnlocked.map((entry) => ({ kind: 'achievement', ...entry }));
          set((state) => ({ celebrations: [...state.celebrations, ...queued] }));
        }
        await get().refresh();
      }
    } finally {
      achievementCheckInFlight = false;
    }
  },
  consumeCelebrations: () => {
    set({ celebrations: [] });
  },
  consumeRankUp: () => {
    set({ pendingRankUp: null });
  },
  saveHabit: async (input, id) => {
    set({ isBusy: true });
    if (id) {
      await updateHabit(id, input);
    } else {
      await createHabit(input);
    }
    await get().refresh();
    await get().runAchievementCheck(true);
    set({ isBusy: false });
  },
  getHabitById: (id) => getHabit(id),
  getHabitInsightById: (id) => getHabitInsight(id),
  archiveHabitById: async (id) => {
    set({ isBusy: true });
    await archiveHabit(id);
    await get().refresh();
    set({ isBusy: false });
  },
  unarchiveHabitById: async (id) => {
    set({ isBusy: true });
    await unarchiveHabit(id);
    await get().refresh();
    set({ isBusy: false });
  },
  incrementHabit: async (id) => {
    const prev = get().player;
    const prevMissionComplete = isMissionComplete(get().dailyMission);
    // Estado del hábito ANTES del incremento: solo nos interesa la transición a 'completado' para
    // evaluar su hito de racha (un hábito que ya estaba completado no vuelve a saltar).
    const prevHabitState = get().todayHabits.find((habit) => habit.id === id)?.estado;
    await incrementHabitProgress(id);
    await get().refresh();
    appendCelebrations(set, queueProgressCelebrations(prev, get().player));
    flagRankUp(set, prev, get().player);
    // Subió de nivel (mismo rango) con este incremento → aparición de NYX.
    fireLevelUp(prev, get().player);
    // La misión diaria acaba de pasar a completada con este incremento → aparición del Sistema.
    if (!prevMissionComplete && isMissionComplete(get().dailyMission)) {
      fireInterjection('mission_complete');
    }
    // Cerca de subir de nivel: el progreso cruzó el umbral con este incremento sin subir de nivel.
    if (crossedNearLevel(prev, get().player)) {
      fireInterjection('near_level');
    }
    // Hito de racha: si el hábito acaba de pasar a 'completado', leemos su racha actual y, si alcanza
    // exactamente un hito (7/30), el Sistema lo celebra. Lectura puntual solo en la transición (no en
    // cada +1), con el getter existente; no añadimos datos al refresh por algo tan acotado.
    const nextHabitState = get().todayHabits.find((habit) => habit.id === id)?.estado;
    if (prevHabitState !== 'completado' && nextHabitState === 'completado') {
      const insight = await getHabitInsight(id);
      if (insight && STREAK_MILESTONES.includes(insight.currentStreak)) {
        fireInterjection('streak_milestone');
      }
    }
    await get().runAchievementCheck(true);
  },
  failHabit: async (id) => {
    // Racha del hábito ANTES de fallar: si era una racha que merecía la pena (>= STREAK_BROKEN_MIN),
    // NYX reacciona a su ruptura en el acto (feedback inmediato del fallo, no solo al cerrar el día).
    // Lectura puntual con el getter existente, solo en esta transición.
    const insightBefore = await getHabitInsight(id);
    const brokenStreak = insightBefore?.currentStreak ?? 0;
    await markHabitFailed(id);
    await get().refresh();
    if (brokenStreak >= STREAK_BROKEN_MIN) {
      fireInterjection('streak_broken');
    }
    await get().runAchievementCheck(true);
  },
  undoHabit: async (id) => {
    await undoTodayHabit(id);
    await get().refresh();
    await get().runAchievementCheck(true);
  },
  claimMission: async () => {
    const prev = get().player;
    await claimDailyMission();
    await get().refresh();
    appendCelebrations(set, queueProgressCelebrations(prev, get().player));
    flagRankUp(set, prev, get().player);
    fireLevelUp(prev, get().player);
    await get().runAchievementCheck(true);
  },
  claimPerfectWeekMission: async () => {
    const prev = get().player;
    await claimPerfectWeekMissionRepo();
    await get().refresh();
    appendCelebrations(set, queueProgressCelebrations(prev, get().player));
    flagRankUp(set, prev, get().player);
    fireLevelUp(prev, get().player);
    await get().runAchievementCheck(true);
  },
  closeMissedDays: async () => {
    const today = toDateKey();
    const yesterday = getYesterdayDateKey();
    const lastActiveDate = await AsyncStorage.getItem(LAST_ACTIVE_DATE_KEY);

    if (lastActiveDate && lastActiveDate <= yesterday) {
      for (const dateKey of getDateKeysBetween(lastActiveDate, yesterday)) {
        await closeDay(dateKey);
      }
      // closeMissedDays corre dentro de boot(), antes del refresh: el desbloqueo silencioso de
      // boot ya cubre la Esencia de logros derivada del cierre, así que no celebramos aquí.
    }

    // Aparición de "vuelta": si el usuario lleva >= COMEBACK_MIN_DAYS días COMPLETOS sin actividad,
    // el Sistema saluda el regreso. Usamos lastActiveDate ANTES de sobrescribirlo. getDateKeysBetween
    // da el tramo inclusivo [last..ayer], que incluye el propio último día activo; restamos 1 para
    // contar solo los días enteros de ausencia (los que van entre el último activo y ayer, ambos sin
    // contar el último día activo). Ej.: activo ayer → 0 días de ausencia; activo anteayer → 1; etc.
    if (lastActiveDate && lastActiveDate < today) {
      const daysAway = getDateKeysBetween(lastActiveDate, yesterday).length - 1;
      if (daysAway >= COMEBACK_MIN_DAYS) {
        fireInterjection('comeback');
      }
    }

    await AsyncStorage.setItem(LAST_ACTIVE_DATE_KEY, today);
  },
  closeToday: async () => {
    await closeDay();
    await get().refresh();
    // El día se cerró con la misión diaria INCOMPLETA (tenía objetivo>0 y no se alcanzó) → aparición
    // del Sistema. Simétrico a 'mission_complete'; si el día no tenía objetivo o la misión se
    // completó, no salta.
    if (isMissionIncomplete(get().dailyMission)) {
      fireInterjection('mission_failed');
    }
    await get().runAchievementCheck(true);
  },
  setLanguage: async (language) => {
    await AsyncStorage.setItem(LANGUAGE_KEY, language);
    set({ language });
  },
  setPlayerName: async (name) => {
    set({ isBusy: true });
    try {
      await updatePlayerName(name);
      await get().refresh();
    } finally {
      set({ isBusy: false });
    }
  },
  purchaseReward: async (id) => {
    set({ isBusy: true });
    try {
      const result = await purchaseReward(id);
      await get().refresh();
      await get().runAchievementCheck(true);
      return result;
    } finally {
      set({ isBusy: false });
    }
  },
  equipReward: async (id) => {
    set({ isBusy: true });
    try {
      const result = await equipReward(id);
      await get().refresh();
      return result;
    } finally {
      set({ isBusy: false });
    }
  },
  unequipTitle: async () => {
    set({ isBusy: true });
    try {
      await unequipTitle();
      await get().refresh();
    } finally {
      set({ isBusy: false });
    }
  },
  exportBackup: async () => {
    const data = await exportAllData();
    const payload = createBackupPayload(data);
    await Share.share({
      title: 'LevelArc backup',
      message: JSON.stringify(payload, null, 2),
    });
  },
  importBackup: async (rawBackup) => {
    set({ isBusy: true });
    try {
      const payload = parseBackupPayload(rawBackup);
      await importAllData(payload.data);
      await get().refresh();
    } catch (error) {
      Alert.alert('Backup inválido', error instanceof Error ? error.message : 'No se pudo importar el backup.');
      throw error;
    } finally {
      set({ isBusy: false });
    }
  },
  resetAll: async () => {
    set({ isBusy: true });
    try {
      await resetAllData();
      await get().refresh();
    } finally {
      set({ isBusy: false });
    }
  },
}));
