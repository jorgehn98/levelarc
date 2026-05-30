import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, Share } from 'react-native';
import { create } from 'zustand';

import { attributeIds, getAttributeLevelProgress } from '@/core/attributes';
import { compareRanks } from '@/core/ranks';
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
    await incrementHabitProgress(id);
    await get().refresh();
    appendCelebrations(set, queueProgressCelebrations(prev, get().player));
    flagRankUp(set, prev, get().player);
    await get().runAchievementCheck(true);
  },
  failHabit: async (id) => {
    await markHabitFailed(id);
    await get().refresh();
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
    await get().runAchievementCheck(true);
  },
  claimPerfectWeekMission: async () => {
    const prev = get().player;
    await claimPerfectWeekMissionRepo();
    await get().refresh();
    appendCelebrations(set, queueProgressCelebrations(prev, get().player));
    flagRankUp(set, prev, get().player);
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

    await AsyncStorage.setItem(LAST_ACTIVE_DATE_KEY, today);
  },
  closeToday: async () => {
    await closeDay();
    await get().refresh();
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
