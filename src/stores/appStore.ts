import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, Share } from 'react-native';
import { create } from 'zustand';

import { createBackupPayload, parseBackupPayload } from '@/lib/backup';
import type { Language } from '@/i18n';
import { getDateKeysBetween, getYesterdayDateKey, toDateKey } from '@/lib/date';
import {
  archiveHabit,
  claimDailyMission,
  claimPerfectWeekMission as claimPerfectWeekMissionRepo,
  closeDay,
  createHabit,
  equipReward,
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
  boot: () => Promise<void>;
  refresh: () => Promise<void>;
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
  boot: async () => {
    set({ isBusy: true });
    await initializeDatabase();
    const storedLanguage = await AsyncStorage.getItem(LANGUAGE_KEY);
    if (storedLanguage === 'es' || storedLanguage === 'en') {
      set({ language: storedLanguage });
    }
    await get().closeMissedDays();
    await get().refresh();
    set({ isReady: true, isBusy: false });
  },
  refresh: async () => {
    const [habits, todayHabits, player, dailyMission, events, ownedRewards] = await Promise.all([
      listHabits(true),
      listTodayHabits(),
      getPlayer(),
      getDailyMission(),
      getRecentEvents(250),
      listOwnedRewardIds(),
    ]);
    set({ habits, todayHabits, player, dailyMission, events, ownedRewards });
  },
  saveHabit: async (input, id) => {
    set({ isBusy: true });
    if (id) {
      await updateHabit(id, input);
    } else {
      await createHabit(input);
    }
    await get().refresh();
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
    await incrementHabitProgress(id);
    await get().refresh();
  },
  failHabit: async (id) => {
    await markHabitFailed(id);
    await get().refresh();
  },
  undoHabit: async (id) => {
    await undoTodayHabit(id);
    await get().refresh();
  },
  claimMission: async () => {
    await claimDailyMission();
    await get().refresh();
  },
  claimPerfectWeekMission: async () => {
    await claimPerfectWeekMissionRepo();
    await get().refresh();
  },
  closeMissedDays: async () => {
    const today = toDateKey();
    const yesterday = getYesterdayDateKey();
    const lastActiveDate = await AsyncStorage.getItem(LAST_ACTIVE_DATE_KEY);

    if (lastActiveDate && lastActiveDate <= yesterday) {
      for (const dateKey of getDateKeysBetween(lastActiveDate, yesterday)) {
        await closeDay(dateKey);
      }
    }

    await AsyncStorage.setItem(LAST_ACTIVE_DATE_KEY, today);
  },
  closeToday: async () => {
    await closeDay();
    await get().refresh();
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
