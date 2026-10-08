import { vi } from 'vitest';

import type { Language } from '@/i18n';
import type { ReminderResult } from '@/lib/reminderPlan';

// Sustituto de src/lib/notifications en tests: sin expo-notifications, con ids deterministas y
// llamadas observables. El permiso del sistema es lo que devuelva `hasNotificationPermission`.
let nextId = 0;

export const remindersSupported = true;
export const hasNotificationPermission = vi.fn(async () => true);

async function schedule(reminderTime: string | null): Promise<ReminderResult> {
  if (!reminderTime) return { status: 'none', notificationId: null };
  if (!(await hasNotificationPermission())) return { status: 'denied', notificationId: null };
  return { status: 'scheduled', notificationId: `notification-${(nextId += 1)}` };
}

export const scheduleHabitReminder = vi.fn(
  (_habitName: string, reminderTime: string | null, _weekdaysCsv: string, _language: Language, _options?: object) =>
    schedule(reminderTime),
);

export const scheduleEndOfDayReminder = vi.fn((reminderTime: string | null, _language: Language, _options?: object) =>
  schedule(reminderTime),
);

export const cancelHabitReminder = vi.fn(async (_notificationId: string | null): Promise<void> => undefined);
export const cancelEndOfDayReminder = vi.fn(async (_notificationId: string | null): Promise<void> => undefined);
export const cancelAllReminders = vi.fn(async (): Promise<void> => undefined);
export const ensureReminderChannel = vi.fn(async (_language: Language): Promise<void> => undefined);
