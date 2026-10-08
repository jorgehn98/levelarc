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
import { enqueueReminderWork } from '@/lib/reminderQueue';

// Une lo que el usuario quiere (hora de cada hábito en la base, hora del recordatorio de fin de día
// en preferencias) con lo que el sistema tiene programado.

const END_OF_DAY_TIME_KEY = 'levelarc.endOfDayReminderTime';
const END_OF_DAY_ID_KEY = 'levelarc.endOfDayReminderNotificationId';

export function getEndOfDayReminderTime() {
  return AsyncStorage.getItem(END_OF_DAY_TIME_KEY);
}

// Lo que el usuario pidió (hora) y si el sistema lo tiene programado. Con hora y sin programar, el
// permiso de notificaciones está denegado o se revocó: la pantalla lo dice en vez de dar el aviso
// por activo.
export async function getEndOfDayReminderState(): Promise<{ time: string | null; scheduled: boolean }> {
  const [time, notificationId] = await Promise.all([
    AsyncStorage.getItem(END_OF_DAY_TIME_KEY),
    AsyncStorage.getItem(END_OF_DAY_ID_KEY),
  ]);
  return { time, scheduled: Boolean(time && notificationId) };
}

// Programa primero y sustituye el anterior solo si salió bien: un fallo deja el recordatorio que
// ya había, no un interruptor encendido sin nada detrás.
export function saveEndOfDayReminder(reminderTime: string, language: Language): Promise<ReminderStatus> {
  return enqueueReminderWork(async () => {
    const reminder = await scheduleEndOfDayReminder(reminderTime, language);
    if (reminder.status !== 'scheduled' || !reminder.notificationId) return reminder.status;
    const previousId = await AsyncStorage.getItem(END_OF_DAY_ID_KEY);
    await AsyncStorage.setItem(END_OF_DAY_TIME_KEY, reminderTime);
    await AsyncStorage.setItem(END_OF_DAY_ID_KEY, reminder.notificationId);
    await cancelEndOfDayReminder(previousId);
    return 'scheduled';
  });
}

export function clearEndOfDayReminder(): Promise<void> {
  return enqueueReminderWork(async () => {
    const previousId = await AsyncStorage.getItem(END_OF_DAY_ID_KEY);
    await AsyncStorage.removeItem(END_OF_DAY_TIME_KEY);
    await AsyncStorage.removeItem(END_OF_DAY_ID_KEY);
    await cancelEndOfDayReminder(previousId);
  });
}

// Permiso con el que corrió la última sincronización; null si todavía no hubo ninguna.
let lastSyncedPermission: boolean | null = null;

// Deja la agenda del sistema igual que la base: cancela todo lo programado por la app, reprograma
// los hábitos activos y el recordatorio de fin de día, y guarda los ids nuevos. Nunca pide permiso;
// sin permiso deja la agenda vacía y los ids a null, y la siguiente sincronización lo repara cuando
// el usuario lo conceda. También repara una restauración del sistema sin alarmas y reescribe el
// texto tras un cambio de idioma. Comparte cola con el resto de operaciones de recordatorios.
export function syncReminders(language: Language): Promise<void> {
  return enqueueReminderWork(() => runSync(language));
}

// Para la vuelta a primer plano: sincroniza solo si el permiso cambió desde la última vez (el
// usuario lo concedió o lo revocó en los ajustes del sistema). Devuelve si sincronizó.
export async function syncRemindersIfPermissionChanged(language: Language): Promise<boolean> {
  if (!remindersSupported) return false;
  if ((await hasNotificationPermission()) === lastSyncedPermission) return false;
  await syncReminders(language);
  return true;
}

async function runSync(language: Language) {
  if (!remindersSupported) return;
  await ensureReminderChannel(language);
  const granted = await hasNotificationPermission();
  lastSyncedPermission = granted;
  await cancelAllReminders();

  // A partir de aquí la agenda del sistema está vacía. Pase lo que pase, los ids guardados y el
  // recordatorio de fin de día tienen que acabar reflejándolo: por eso los `finally`.
  const entries: { habit: HabitRecord; notificationId: string | null }[] = [];
  try {
    const plan = planReminderSync(await listHabits(true));
    for (const habit of plan.clear) entries.push({ habit, notificationId: null });
    for (const habit of plan.schedule) {
      entries.push({ habit, notificationId: granted ? await scheduleOrNull(habit, language) : null });
    }
  } finally {
    try {
      // Un hábito editado mientras se sincronizaba ya gestionó su propio recordatorio: el de esta
      // pasada sobra.
      const orphaned = await saveHabitNotificationIds(entries);
      await Promise.all(orphaned.map((notificationId) => cancelHabitReminder(notificationId)));
    } finally {
      await syncEndOfDayReminder(granted, language);
    }
  }
}

// Un hábito que no se puede programar no corta la sincronización del resto: queda sin id y la
// siguiente pasada lo reintenta.
async function scheduleOrNull(habit: HabitRecord, language: Language): Promise<string | null> {
  try {
    const reminder = await scheduleHabitReminder(habit.nombre, habit.horaRecordatorio, habit.diasSemana, language, {
      askPermission: false,
    });
    return reminder.notificationId;
  } catch {
    return null;
  }
}

async function syncEndOfDayReminder(granted: boolean, language: Language) {
  let notificationId: string | null = null;
  try {
    if (granted) {
      const reminder = await scheduleEndOfDayReminder(await getEndOfDayReminderTime(), language, { askPermission: false });
      notificationId = reminder.notificationId;
    }
  } finally {
    if (notificationId) {
      await AsyncStorage.setItem(END_OF_DAY_ID_KEY, notificationId);
    } else {
      await AsyncStorage.removeItem(END_OF_DAY_ID_KEY);
    }
  }
}
