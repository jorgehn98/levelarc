import { describe, expect, it, vi } from 'vitest';

import { habitInput, openRepository } from '../../test/repository';

// Repositorio real (node:sqlite en memoria) y notificaciones sustituidas (test/notifications.ts).

const END_OF_DAY_ID_KEY = 'levelarc.endOfDayReminderNotificationId';

async function open() {
  const ctx = await openRepository();
  // openRepository reinicia los módulos: el almacén es el de esta instancia, vacío.
  const { default: storage } = await import('@react-native-async-storage/async-storage');
  const reminders = await import('./reminders');
  return { ...ctx, reminders, storage };
}

describe('syncReminders', () => {
  it('rebuilds the schedule from active habits and the end-of-day preference', async () => {
    const ctx = await open();
    const active = (await ctx.repo.createHabit(habitInput({ nombre: 'Leer', horaRecordatorio: '07:00', diasSemana: '1,3' }), 'es')).id;
    const silent = (await ctx.repo.createHabit(habitInput({ nombre: 'Andar' }), 'es')).id;
    const archived = (await ctx.repo.createHabit(habitInput({ nombre: 'Nadar', horaRecordatorio: '08:00' }), 'es')).id;
    await ctx.repo.archiveHabit(archived);
    // Ids que ya no existen en el sistema (restauración sin alarmas) o que nunca debieron guardarse.
    await ctx.sqlite.runAsync("UPDATE habits SET notification_id = 'lost' WHERE id IN (?, ?)", [active, archived]);
    expect(await ctx.reminders.saveEndOfDayReminder('21:30', 'es')).toBe('scheduled');
    const schedule = vi.mocked(ctx.notifications.scheduleHabitReminder);
    const scheduleEndOfDay = vi.mocked(ctx.notifications.scheduleEndOfDayReminder);
    schedule.mockClear();
    scheduleEndOfDay.mockClear();

    await ctx.reminders.syncReminders('en');

    expect(ctx.notifications.cancelAllReminders).toHaveBeenCalledTimes(1);
    expect(schedule.mock.calls).toEqual([['Leer', '07:00', '1,3', 'en', { askPermission: false }]]);
    expect(scheduleEndOfDay.mock.calls).toEqual([['21:30', 'en', { askPermission: false }]]);
    const scheduledId = (await schedule.mock.results[0].value).notificationId;
    expect((await ctx.repo.getHabit(active))?.notificationId).toBe(scheduledId);
    expect((await ctx.repo.getHabit(silent))?.notificationId).toBeNull();
    expect((await ctx.repo.getHabit(archived))?.notificationId).toBeNull();
    expect(await ctx.storage.getItem(END_OF_DAY_ID_KEY)).toBe((await scheduleEndOfDay.mock.results[0].value).notificationId);
  });

  it('clears every id without asking when notifications are not allowed, and repairs once they are', async () => {
    const ctx = await open();
    const id = (await ctx.repo.createHabit(habitInput({ horaRecordatorio: '07:00' }), 'es')).id;
    await ctx.reminders.saveEndOfDayReminder('21:30', 'es');
    vi.mocked(ctx.notifications.hasNotificationPermission).mockResolvedValue(false);
    vi.mocked(ctx.notifications.scheduleHabitReminder).mockClear();

    await ctx.reminders.syncReminders('es');

    expect(ctx.notifications.scheduleHabitReminder).not.toHaveBeenCalled();
    expect((await ctx.repo.getHabit(id))?.notificationId).toBeNull();
    expect(await ctx.storage.getItem(END_OF_DAY_ID_KEY)).toBeNull();
    // La preferencia sobrevive: es lo que permite reparar.
    expect(await ctx.reminders.getEndOfDayReminderTime()).toBe('21:30');

    vi.mocked(ctx.notifications.hasNotificationPermission).mockResolvedValue(true);
    await ctx.reminders.syncReminders('es');

    expect((await ctx.repo.getHabit(id))?.notificationId).toBeTruthy();
    expect(await ctx.storage.getItem(END_OF_DAY_ID_KEY)).toBeTruthy();
  });

  it('drops its own reminder when the habit changed while it was scheduling', async () => {
    const ctx = await open();
    const id = (await ctx.repo.createHabit(habitInput({ horaRecordatorio: '07:00' }), 'es')).id;
    const schedule = vi.mocked(ctx.notifications.scheduleHabitReminder);
    schedule.mockImplementationOnce(async () => {
      await ctx.sqlite.runAsync("UPDATE habits SET hora_recordatorio = '09:00', notification_id = 'edited' WHERE id = ?", [id]);
      return { status: 'scheduled', notificationId: 'from-sync' };
    });
    const cancel = vi.mocked(ctx.notifications.cancelHabitReminder);
    cancel.mockClear();

    await ctx.reminders.syncReminders('es');

    expect((await ctx.repo.getHabit(id))?.notificationId).toBe('edited');
    expect(cancel.mock.calls.map(([notificationId]) => notificationId)).toEqual(['from-sync']);
  });
});

describe('end-of-day reminder', () => {
  it('keeps the previous reminder when the new one cannot be scheduled', async () => {
    const ctx = await open();
    await ctx.reminders.saveEndOfDayReminder('21:30', 'es');
    const previousId = await ctx.storage.getItem(END_OF_DAY_ID_KEY);
    const cancel = vi.mocked(ctx.notifications.cancelEndOfDayReminder);
    cancel.mockClear();
    vi.mocked(ctx.notifications.hasNotificationPermission).mockResolvedValue(false);

    expect(await ctx.reminders.saveEndOfDayReminder('22:00', 'es')).toBe('denied');

    expect(cancel).not.toHaveBeenCalled();
    expect(await ctx.reminders.getEndOfDayReminderTime()).toBe('21:30');
    expect(await ctx.storage.getItem(END_OF_DAY_ID_KEY)).toBe(previousId);

    vi.mocked(ctx.notifications.hasNotificationPermission).mockResolvedValue(true);
    expect(await ctx.reminders.saveEndOfDayReminder('22:00', 'es')).toBe('scheduled');

    expect(cancel.mock.calls).toEqual([[previousId]]);
    expect(await ctx.reminders.getEndOfDayReminderTime()).toBe('22:00');
  });
});
