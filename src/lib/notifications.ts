import * as Notifications from 'expo-notifications';

import { parseClockTime } from '@/lib/time';

export async function requestNotificationPermissions() {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) {
    return true;
  }

  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

export async function cancelHabitReminder(notificationId: string | null) {
  if (!notificationId) return;
  for (const id of notificationId.split(',').filter(Boolean)) {
    try {
      await Notifications.cancelScheduledNotificationAsync(id);
    } catch {
      // A missing scheduled notification should not block habit edits.
    }
  }
}

export async function scheduleHabitReminder(habitName: string, reminderTime: string | null, weekdaysCsv: string) {
  const time = parseClockTime(reminderTime);
  if (!time) return null;
  const granted = await requestNotificationPermissions();
  if (!granted) return null;

  const weekdays = weekdaysCsv
    .split(',')
    .map((day) => Number(day))
    .filter((day) => Number.isInteger(day) && day >= 1 && day <= 7);
  const identifiers: string[] = [];

  for (const weekday of weekdays) {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'LevelArc',
        body: `Misión pendiente: ${habitName}.`,
        sound: 'default',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday: weekday === 7 ? 1 : weekday + 1,
        hour: time.hour,
        minute: time.minute,
      },
    });
    identifiers.push(id);
  }

  return identifiers.length > 0 ? identifiers.join(',') : null;
}

export async function cancelEndOfDayReminder(notificationId: string | null) {
  if (!notificationId) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch {
    // A missing scheduled notification should not block settings changes.
  }
}

export async function scheduleEndOfDayReminder(reminderTime: string | null, title: string, body: string) {
  const time = parseClockTime(reminderTime);
  if (!time) return null;
  const granted = await requestNotificationPermissions();
  if (!granted) return null;

  return Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: 'default',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: time.hour,
      minute: time.minute,
    },
  });
}
