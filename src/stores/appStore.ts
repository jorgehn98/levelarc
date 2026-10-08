import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

import { attributeIds, getAttributeLevelProgress } from '@/core/attributes';
import { compareRanks, getLevelProgress } from '@/core/ranks';
import { t, type Language } from '@/i18n';
import { getDeviceLocale, resolveInitialLanguage } from '@/i18n/deviceLanguage';
import { getImportFailureReasonKey, parseBackupPayload, serializeBackupPayload } from '@/lib/backup';
import { ShareUnavailableError, pickBackupFile, shareBackupFile } from '@/lib/backupTransfer';
import { notify } from '@/lib/confirm';
import { configureNotifications } from '@/lib/notifications';
import { warnRemindersDisabled } from '@/lib/reminderNotice';
import { clearEndOfDayReminder, syncReminders } from '@/lib/reminders';
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
  // Mensaje del fallo de arranque; null si no falló. Con valor, el layout muestra la pantalla de
  // error con Reintentar en vez del spinner.
  bootError: string | null;
  // Hay una acción global en curso (reclamar, comprar, guardar, importar…). Mientras dura, las
  // demás acciones globales se descartan y sus botones se muestran deshabilitados.
  isBusy: boolean;
  // Hábitos con una acción en curso (completar, +1, fallar, deshacer): su tarjeta se deshabilita.
  pendingHabitIds: string[];
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
  // Las acciones pasan por runAction: nunca rechazan. Si fallan, avisan al usuario y devuelven
  // false (o null donde hay resultado), para que la pantalla no siga como si hubiera ido bien.
  saveHabit: (input: HabitInput, id?: string) => Promise<boolean>;
  getHabitById: (id: string) => Promise<HabitRecord | null>;
  getHabitInsightById: (id: string) => Promise<HabitInsightRecord | null>;
  archiveHabitById: (id: string) => Promise<boolean>;
  unarchiveHabitById: (id: string) => Promise<boolean>;
  incrementHabit: (id: string) => Promise<boolean>;
  failHabit: (id: string) => Promise<boolean>;
  undoHabit: (id: string) => Promise<boolean>;
  claimMission: () => Promise<boolean>;
  claimPerfectWeekMission: () => Promise<boolean>;
  // Cierre automático de días pasados (arranque y cambio de día). Sí puede rechazar: lo llaman
  // boot y el layout, que tratan el fallo.
  closeMissedDays: () => Promise<void>;
  closeToday: () => Promise<boolean>;
  setLanguage: (language: Language) => Promise<boolean>;
  setPlayerName: (name: string) => Promise<boolean>;
  purchaseReward: (id: string) => Promise<PurchaseResult | null>;
  equipReward: (id: string) => Promise<EquipResult | null>;
  unequipTitle: () => Promise<boolean>;
  exportBackup: () => Promise<boolean>;
  // Abre el selector de ficheros y devuelve el contenido elegido; null si se cancela o no se pudo
  // leer (en ese caso ya se avisó). No marca la app como ocupada: en web una cancelación no se notifica.
  pickBackup: () => Promise<string | null>;
  importBackup: (rawBackup: string) => Promise<boolean>;
  resetAll: () => Promise<boolean>;
};

type AppGet = () => AppState;

type AppSet = (partial: Partial<AppState> | ((state: AppState) => Partial<AppState>)) => void;

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

type ActionOutcome<T> = { ok: true; value: T } | { ok: false };

const ACTION_FAILED: ActionOutcome<never> = { ok: false };

function reportActionError(language: Language) {
  notify(t(language, 'actionFailed'), t(language, 'actionFailedCopy'));
}

// En una importación el motivo importa: casi siempre es un fichero que no valida.
function reportImportError(error: unknown, language: Language) {
  notify(t(language, 'importFailed'), t(language, 'importFailedCopy', { reason: t(language, getImportFailureReasonKey(error)) }));
}

// Único punto por el que pasan las acciones del usuario. Marca la acción como en curso (por hábito
// si lleva habitId, global si no), descarta una repetición mientras dura, y si la tarea falla avisa
// al usuario y devuelve { ok: false } en vez de rechazar: las pantallas llaman con `void`. La cola
// del repositorio ya impide escrituras dobles; esto evita lanzarlas y da respuesta visible.
async function runAction<T>(
  set: AppSet,
  get: AppGet,
  task: () => Promise<T>,
  options: { habitId?: string; report?: (error: unknown, language: Language) => void } = {},
): Promise<ActionOutcome<T>> {
  const { habitId } = options;
  if (habitId ? get().pendingHabitIds.includes(habitId) : get().isBusy) return ACTION_FAILED;

  set(habitId ? (state) => ({ pendingHabitIds: [...state.pendingHabitIds, habitId] }) : { isBusy: true });
  try {
    return { ok: true, value: await task() };
  } catch (error) {
    if (options.report) options.report(error, get().language);
    else reportActionError(get().language);
    return ACTION_FAILED;
  } finally {
    set(habitId ? (state) => ({ pendingHabitIds: state.pendingHabitIds.filter((id) => id !== habitId) }) : { isBusy: false });
  }
}

// Reprograma los recordatorios sin bloquear ni romper nada: un fallo aquí solo deja la agenda como
// estaba hasta la siguiente sincronización.
function syncRemindersInBackground(language: Language) {
  syncReminders(language).catch((error) => {
    if (__DEV__) console.warn('[reminders] sync failed', error);
  });
}

// boot y closeMissedDays no se solapan consigo mismos: Reintentar o dos avisos de cambio de día
// seguidos reutilizan la ejecución en curso.
let bootInFlight: Promise<void> | null = null;
let closeMissedDaysInFlight: Promise<void> | null = null;

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
  bootError: null,
  isBusy: false,
  pendingHabitIds: [],
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
  boot: () => {
    bootInFlight ??= (async () => {
      set({ bootError: null });
      try {
        // El idioma va primero: si la base no abre, la pantalla de error ya sale en el idioma correcto.
        set({ language: resolveInitialLanguage(await AsyncStorage.getItem(LANGUAGE_KEY), getDeviceLocale()) });
        await initializeDatabase();
        await get().closeMissedDays();
        // Desbloqueo silencioso al arrancar: otorga la Esencia de logros ya cumplidos por el estado
        // actual sin celebrar (evita una avalancha de toasts al actualizar la app). El regalo inicial
        // por logros ya conseguidos es intencional.
        await get().runAchievementCheck(false);
        await get().refresh();
        set({ isReady: true });
        configureNotifications();
        syncRemindersInBackground(get().language);
      } catch (error) {
        set({ bootError: error instanceof Error ? error.message : String(error) });
      } finally {
        bootInFlight = null;
      }
    })();
    return bootInFlight;
  },
  refresh: async () => {
    // Primero la misión: getDailyMission sincroniza el día y puede revocar un bonus ya reclamado
    // (XP y Esencia) si el día dejó de estar completo. Las lecturas no pasan por la cola del
    // repositorio, así que leer el jugador en paralelo podía devolver el de antes de la revocación.
    const dailyMission = await getDailyMission();
    const [habits, todayHabits, player, events, ownedRewards, unlockedAchievements] = await Promise.all([
      listHabits(true),
      listTodayHabits(),
      getPlayer(),
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
    const outcome = await runAction(set, get, async () => {
      const reminder = id
        ? await updateHabit(id, input, get().language)
        : (await createHabit(input, get().language)).reminder;
      await get().refresh();
      await get().runAchievementCheck(true);
      return reminder;
    });
    // El hábito se guardó; lo que no se pudo es avisar.
    if (outcome.ok && outcome.value === 'denied') warnRemindersDisabled(get().language, 'habitReminderDisabledCopy');
    return outcome.ok;
  },
  getHabitById: (id) => getHabit(id),
  getHabitInsightById: (id) => getHabitInsight(id),
  archiveHabitById: async (id) => {
    const outcome = await runAction(set, get, async () => {
      await archiveHabit(id);
      await get().refresh();
    });
    return outcome.ok;
  },
  unarchiveHabitById: async (id) => {
    const outcome = await runAction(set, get, async () => {
      const reminder = await unarchiveHabit(id, get().language);
      await get().refresh();
      return reminder;
    });
    if (outcome.ok && outcome.value === 'denied') warnRemindersDisabled(get().language, 'habitReminderDisabledCopy');
    return outcome.ok;
  },
  incrementHabit: async (id) => {
    const outcome = await runAction(
      set,
      get,
      async () => {
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
      { habitId: id },
    );
    return outcome.ok;
  },
  failHabit: async (id) => {
    const outcome = await runAction(
      set,
      get,
      async () => {
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
      { habitId: id },
    );
    return outcome.ok;
  },
  undoHabit: async (id) => {
    const outcome = await runAction(
      set,
      get,
      async () => {
        await undoTodayHabit(id);
        await get().refresh();
        await get().runAchievementCheck(true);
      },
      { habitId: id },
    );
    return outcome.ok;
  },
  claimMission: async () => {
    const outcome = await runAction(set, get, async () => {
      const prev = get().player;
      await claimDailyMission();
      await get().refresh();
      appendCelebrations(set, queueProgressCelebrations(prev, get().player));
      flagRankUp(set, prev, get().player);
      fireLevelUp(prev, get().player);
      await get().runAchievementCheck(true);
    });
    return outcome.ok;
  },
  claimPerfectWeekMission: async () => {
    const outcome = await runAction(set, get, async () => {
      const prev = get().player;
      await claimPerfectWeekMissionRepo();
      await get().refresh();
      appendCelebrations(set, queueProgressCelebrations(prev, get().player));
      flagRankUp(set, prev, get().player);
      fireLevelUp(prev, get().player);
      await get().runAchievementCheck(true);
    });
    return outcome.ok;
  },
  closeMissedDays: () => {
    closeMissedDaysInFlight ??= (async () => {
      try {
        const today = toDateKey();
        const yesterday = getYesterdayDateKey();
        const lastActiveDate = await AsyncStorage.getItem(LAST_ACTIVE_DATE_KEY);

        // El tramo acaba siempre en ayer: el día en curso nunca se cierra aquí. closeDay es
        // idempotente, así que repetir un día ya cerrado no vuelve a penalizar.
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
      } finally {
        closeMissedDaysInFlight = null;
      }
    })();
    return closeMissedDaysInFlight;
  },
  closeToday: async () => {
    const outcome = await runAction(set, get, async () => {
      await closeDay();
      await get().refresh();
      // El día se cerró con la misión diaria INCOMPLETA (tenía objetivo>0 y no se alcanzó) → aparición
      // del Sistema. Simétrico a 'mission_complete'; si el día no tenía objetivo o la misión se
      // completó, no salta.
      if (isMissionIncomplete(get().dailyMission)) {
        fireInterjection('mission_failed');
      }
      await get().runAchievementCheck(true);
    });
    return outcome.ok;
  },
  setLanguage: async (language) => {
    const outcome = await runAction(set, get, async () => {
      await AsyncStorage.setItem(LANGUAGE_KEY, language);
      set({ language });
    });
    // El texto de un recordatorio queda fijado al programarlo: hay que reprogramar en el idioma nuevo.
    if (outcome.ok) syncRemindersInBackground(language);
    return outcome.ok;
  },
  setPlayerName: async (name) => {
    const outcome = await runAction(set, get, async () => {
      await updatePlayerName(name);
      await get().refresh();
    });
    return outcome.ok;
  },
  purchaseReward: async (id) => {
    const outcome = await runAction(set, get, async () => {
      const result = await purchaseReward(id);
      await get().refresh();
      await get().runAchievementCheck(true);
      return result;
    });
    return outcome.ok ? outcome.value : null;
  },
  equipReward: async (id) => {
    const outcome = await runAction(set, get, async () => {
      const result = await equipReward(id);
      await get().refresh();
      return result;
    });
    return outcome.ok ? outcome.value : null;
  },
  unequipTitle: async () => {
    const outcome = await runAction(set, get, async () => {
      await unequipTitle();
      await get().refresh();
    });
    return outcome.ok;
  },
  exportBackup: async () => {
    const outcome = await runAction(
      set,
      get,
      async () => {
        await shareBackupFile(serializeBackupPayload(await exportAllData()), t(get().language, 'backupShareTitle'));
      },
      {
        report: (error, language) =>
          error instanceof ShareUnavailableError
            ? notify(t(language, 'backupShareUnavailable'), t(language, 'backupShareUnavailableCopy'))
            : reportActionError(language),
      },
    );
    return outcome.ok;
  },
  pickBackup: async () => {
    try {
      const rawBackup = await pickBackupFile();
      // Comprobación temprana de formato y versión: un fichero que no es un backup se rechaza aquí,
      // antes de pedir al usuario que confirme el reemplazo de sus datos.
      if (rawBackup !== null) parseBackupPayload(rawBackup);
      return rawBackup;
    } catch (error) {
      reportImportError(error, get().language);
      return null;
    }
  },
  importBackup: async (rawBackup) => {
    const outcome = await runAction(
      set,
      get,
      async () => {
        const payload = parseBackupPayload(rawBackup);
        await importAllData(payload.data);
        await get().refresh();
      },
      { report: reportImportError },
    );
    if (outcome.ok) await afterDataReplaced(get().language);
    return outcome.ok;
  },
  resetAll: async () => {
    const outcome = await runAction(set, get, async () => {
      await resetAllData();
      await clearEndOfDayReminder();
      await get().refresh();
    });
    if (outcome.ok) await afterDataReplaced(get().language);
    return outcome.ok;
  },
}));

// Tras reset o importación la base es otra: la sesión de IA en memoria y la agenda de recordatorios
// siguen siendo las de los datos anteriores. Import dinámico por el ciclo appStore ↔ aiStore; un
// fallo aquí no deshace la operación, que ya se confirmó.
async function afterDataReplaced(language: Language) {
  await import('./aiStore').then(({ resetAiSession }) => resetAiSession()).catch(() => undefined);
  syncRemindersInBackground(language);
}
