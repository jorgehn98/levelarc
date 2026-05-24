function parseReminderTime(value: string | null) {
  if (!value) return null;
  const match = value.trim().match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
  if (!match) return null;
  return {
    hour: Number(match[1]),
    minute: Number(match[2]),
  };
}

export async function requestNotificationPermissions() {
  return false;
}

export async function cancelHabitReminder() {
  return;
}

export async function scheduleHabitReminder() {
  return null;
}
