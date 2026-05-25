import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, Share } from 'react-native';
import { create } from 'zustand';

import { createBackupPayload, parseBackupPayload } from '@/lib/backup';
import type { Language } from '@/i18n';
import {
  archiveHabit,
  claimDailyMission,
  claimPerfectWeekMission as claimPerfectWeekMissionRepo,
  closeDay,
  createHabit,
  exportAllData,
  getDailyMission,
  getHabit,
  getPlayer,
  getRecentEvents,
  incrementHabitProgress,
  initializeDatabase,
  importAllData,
  listHabits,
  listTodayHabits,
  markHabitFailed,
  undoTodayHabit,
  updateHabit,
  updatePlayerName,
  type DailyMissionRecord,
  type EventRecord,
  type HabitInput,
  type HabitRecord,
  type PlayerRecord,
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
  boot: () => Promise<void>;
  refresh: () => Promise<void>;
  saveHabit: (input: HabitInput, id?: string) => Promise<void>;
  getHabitById: (id: string) => Promise<HabitRecord | null>;
  archiveHabitById: (id: string) => Promise<void>;
  incrementHabit: (id: string) => Promise<void>;
  failHabit: (id: string) => Promise<void>;
  undoHabit: (id: string) => Promise<void>;
  claimMission: () => Promise<void>;
  claimPerfectWeekMission: () => Promise<void>;
  closeToday: () => Promise<void>;
  setLanguage: (language: Language) => Promise<void>;
  setPlayerName: (name: string) => Promise<void>;
  exportBackup: () => Promise<void>;
  importBackup: (rawBackup: string) => Promise<void>;
};

const LANGUAGE_KEY = 'levelarc.language';

export const useAppStore = create<AppState>((set, get) => ({
  isReady: false,
  isBusy: false,
  language: 'es',
  habits: [],
  todayHabits: [],
  player: null,
  dailyMission: null,
  events: [],
  boot: async () => {
    set({ isBusy: true });
    await initializeDatabase();
    const storedLanguage = await AsyncStorage.getItem(LANGUAGE_KEY);
    if (storedLanguage === 'es' || storedLanguage === 'en') {
      set({ language: storedLanguage });
    }
    await get().refresh();
    set({ isReady: true, isBusy: false });
  },
  refresh: async () => {
    const [habits, todayHabits, player, dailyMission, events] = await Promise.all([
      listHabits(true),
      listTodayHabits(),
      getPlayer(),
      getDailyMission(),
      getRecentEvents(250),
    ]);
    set({ habits, todayHabits, player, dailyMission, events });
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
  archiveHabitById: async (id) => {
    set({ isBusy: true });
    await archiveHabit(id);
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
}));
