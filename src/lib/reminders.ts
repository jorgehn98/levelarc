import AsyncStorage from '@react-native-async-storage/async-storage';

import { listHabits, saveHabitNotificationIds, type HabitRecord } from '@/db/repository';
import type { Language } from '@/i18n';
import {
  cancelAllReminders,
  cancelEndOfDayReminder,
  cancelHabitReminder,
  ensureReminderChannel,
  hasNotificationPermission,
  remindersSupported,
  scheduleEndOfDayReminder,
  scheduleHabitReminder,
} from '@/lib/notifications';
import { planReminderSync, type ReminderStatus } from '@/lib/reminderPlan';

// Une lo que el usuario quiere (hora de cada hábito en la base, hora del recordatorio de fin de día
// en preferencias) con lo que el sistema tiene programado.

const END_OF_DAY_TIME_KEY = 'levelarc.endOfDayReminderTime';
const END_OF_DAY_ID_KEY = 'levelarc.endOfDayReminderNotificationId';

export function getEndOfDayReminderTime() {
  return AsyncStorage.getItem(END_OF_DAY_TIME_KEY);
}

// Programa primero y sustituye el anterior solo si salió bien: un fallo deja el recordatorio que
// ya había, no un interruptor encendido sin nada detrás.
export async function saveEndOfDayReminder(reminderTime: string, language: Language): Promise<ReminderStatus> {
  const reminder = await scheduleEndOfDayReminder(reminderTime, language);
  if (reminder.status !== 'scheduled' || !reminder.notificationId) return reminder.status;
  const previousId = await AsyncStorage.getItem(END_OF_DAY_ID_KEY);
  await AsyncStorage.setItem(END_OF_DAY_TIME_KEY, reminderTime);
  await AsyncStorage.setItem(END_OF_DAY_ID_KEY, reminder.notificationId);
  await cancelEndOfDayReminder(previousId);
  return 'scheduled';
}

export async function clearEndOfDayReminder() {
  const previousId = await AsyncStorage.getItem(END_OF_DAY_ID_KEY);
  await AsyncStorage.removeItem(END_OF_DAY_TIME_KEY);
  await AsyncStorage.removeItem(END_OF_DAY_ID_KEY);
  await cancelEndOfDayReminder(previousId);
}

// Las sincronizaciones van de una en una: dos a la vez se cancelarían la agenda entre sí.
let syncQueue: Promise<unknown> = Promise.resolve();

// Deja la agenda del sistema igual que la base: cancela todo lo programado por la app, reprograma
// los hábitos activos y el recordatorio de fin de día, y guarda los ids nuevos. Nunca pide permiso;
// sin permiso deja la agenda vacía y los ids a null, y la siguiente sincronización (arranque) lo
// repara cuando el usuario lo conceda. También repara una restauración del sistema sin alarmas y
// reescribe el texto tras un cambio de idioma.
export function syncReminders(language: Language): Promise<void> {
  const run = syncQueue.then(() => runSync(language));
  syncQueue = run.catch(() => undefined);
  return run;
}

async function runSync(language: Language) {
  if (!remindersSupported) return;
  await ensureReminderChannel(language);
  const granted = await hasNotificationPermission();
  await cancelAllReminders();

  const plan = planReminderSync(await listHabits(true));
  const entries: { habit: HabitRecord; notificationId: string | null }[] = plan.clear.map((habit) => ({
    habit,
    notificationId: null,
  }));
  for (const habit of plan.schedule) {
    const reminder = granted
      ? await scheduleHabitReminder(habit.nombre, habit.horaRecordatorio, habit.diasSemana, language, { askPermission: false })
      : null;
    entries.push({ habit, notificationId: reminder?.notificationId ?? null });
  }
  // Un hábito editado mientras se sincronizaba ya gestionó su propio recordatorio: el de esta
  // pasada sobra.
  const orphaned = await saveHabitNotificationIds(entries);
  await Promise.all(orphaned.map((notificationId) => cancelHabitReminder(notificationId)));

  const endOfDay = granted
    ? await scheduleEndOfDayReminder(await getEndOfDayReminderTime(), language, { askPermission: false })
    : null;
  if (endOfDay?.notificationId) {
    await AsyncStorage.setItem(END_OF_DAY_ID_KEY, endOfDay.notificationId);
  } else {
    await AsyncStorage.removeItem(END_OF_DAY_ID_KEY);
  }
}
