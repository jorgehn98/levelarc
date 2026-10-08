import { vi } from 'vitest';

// Sustituto de src/lib/notifications en tests: sin expo-notifications, con ids deterministas y
// llamadas observables.
let nextId = 0;

export const scheduleHabitReminder = vi.fn(
  async (_habitName: string, reminderTime: string | null, _weekdaysCsv: string): Promise<string | null> =>
    reminderTime ? `notification-${(nextId += 1)}` : null,
);

export const cancelHabitReminder = vi.fn(async (_notificationId: string | null): Promise<void> => undefined);
