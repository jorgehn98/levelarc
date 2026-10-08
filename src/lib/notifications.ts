import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { t, type Language } from '@/i18n';
import {
  buildDailyReminderTrigger,
  buildHabitReminderTriggers,
  type ReminderResult,
  type ReminderTrigger,
} from '@/lib/reminderPlan';
import { colors } from '@/theme/colors';

export const remindersSupported = true;

const REMINDER_CHANNEL_ID = 'reminders';

type ScheduleOptions = {
  // false: no abre el diálogo de permisos; sin permiso devuelve `denied`. Para la sincronización
  // en segundo plano, que no debe interrumpir al usuario.
  askPermission?: boolean;
};

// Con la app abierta el recordatorio también se muestra: sin handler, Android e iOS lo descartan.
export function configureNotifications() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

// Android 8+ exige un canal, y Android 13+ no muestra el diálogo de permisos hasta que existe uno.
// De un canal ya creado solo se puede cambiar el nombre, que es lo que sigue al idioma.
let channelLanguage: Language | null = null;

export async function ensureReminderChannel(language: Language) {
  if (Platform.OS !== 'android' || channelLanguage === language) return;
  await Notifications.setNotificationChannelAsync(REMINDER_CHANNEL_ID, {
    name: t(language, 'reminderChannelName'),
    importance: Notifications.AndroidImportance.DEFAULT,
    lightColor: colors.brand.cyanCore,
  });
  channelLanguage = language;
}

export async function hasNotificationPermission() {
  return (await Notifications.getPermissionsAsync()).granted;
}

export async function requestNotificationPermissions(language: Language) {
  await ensureReminderChannel(language);
  if (await hasNotificationPermission()) return true;
  return (await Notifications.requestPermissionsAsync()).granted;
}

async function isAllowed(language: Language, { askPermission = true }: ScheduleOptions) {
  if (askPermission) return requestNotificationPermissions(language);
  await ensureReminderChannel(language);
  return hasNotificationPermission();
}

function toTriggerInput(trigger: ReminderTrigger): Notifications.NotificationTriggerInput {
  if (trigger.kind === 'daily') {
    return {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      channelId: REMINDER_CHANNEL_ID,
      hour: trigger.hour,
      minute: trigger.minute,
    };
  }
  return {
    type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
    channelId: REMINDER_CHANNEL_ID,
    weekday: trigger.weekday,
    hour: trigger.hour,
    minute: trigger.minute,
  };
}

async function cancelIds(notificationId: string | null) {
  if (!notificationId) return;
  for (const id of notificationId.split(',').filter(Boolean)) {
    try {
      await Notifications.cancelScheduledNotificationAsync(id);
    } catch {
      // A missing scheduled notification should not block habit edits.
    }
  }
}

export const cancelHabitReminder = cancelIds;
export const cancelEndOfDayReminder = cancelIds;

// Cancela todo lo que la app tenga programado. LevelArc solo programa recordatorios.
export function cancelAllReminders() {
  return Notifications.cancelAllScheduledNotificationsAsync();
}

// El texto queda fijado al programar: al cambiar de idioma hay que reprogramar (syncReminders).
export async function scheduleHabitReminder(
  habitName: string,
  reminderTime: string | null,
  weekdaysCsv: string,
  language: Language,
  options: ScheduleOptions = {},
): Promise<ReminderResult> {
  const triggers = buildHabitReminderTriggers(reminderTime, weekdaysCsv);
  if (triggers.length === 0) return { status: 'none', notificationId: null };
  if (!(await isAllowed(language, options))) return { status: 'denied', notificationId: null };

  const identifiers: string[] = [];
  try {
    for (const trigger of triggers) {
      identifiers.push(
        await Notifications.scheduleNotificationAsync({
          content: {
            title: 'LevelArc',
            body: t(language, 'habitReminderBody', { habit: habitName }),
            sound: 'default',
          },
          trigger: toTriggerInput(trigger),
        }),
      );
    }
  } catch (error) {
    // Un hábito no se queda con la mitad de sus días programados.
    await cancelIds(identifiers.join(','));
    throw error;
  }
  return { status: 'scheduled', notificationId: identifiers.join(',') };
}

export async function scheduleEndOfDayReminder(
  reminderTime: string | null,
  language: Language,
  options: ScheduleOptions = {},
): Promise<ReminderResult> {
  const trigger = buildDailyReminderTrigger(reminderTime);
  if (!trigger) return { status: 'none', notificationId: null };
  if (!(await isAllowed(language, options))) return { status: 'denied', notificationId: null };

  const notificationId = await Notifications.scheduleNotificationAsync({
    content: {
      title: t(language, 'endOfDayNotificationTitle'),
      body: t(language, 'endOfDayNotificationBody'),
      sound: 'default',
    },
    trigger: toTriggerInput(trigger),
  });
  return { status: 'scheduled', notificationId };
}
