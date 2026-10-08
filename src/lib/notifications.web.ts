import type { ReminderResult } from '@/lib/reminderPlan';

// La vista web solo sirve de previsualización: no programa recordatorios.
export const remindersSupported = false;

const UNSUPPORTED: ReminderResult = { status: 'unsupported', notificationId: null };

export function configureNotifications() {
  return;
}

export async function ensureReminderChannel() {
  return;
}

export async function hasNotificationPermission() {
  return false;
}

export async function requestNotificationPermissions() {
  return false;
}

export async function cancelHabitReminder() {
  return;
}

export async function cancelEndOfDayReminder() {
  return;
}

export async function cancelAllReminders() {
  return;
}

export async function scheduleHabitReminder(): Promise<ReminderResult> {
  return UNSUPPORTED;
}

export async function scheduleEndOfDayReminder(): Promise<ReminderResult> {
  return UNSUPPORTED;
}
