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

  it('keeps going when one habit cannot be scheduled and still restores the end-of-day reminder', async () => {
    const ctx = await open();
    const broken = (await ctx.repo.createHabit(habitInput({ nombre: 'Leer', horaRecordatorio: '07:00' }), 'es')).id;
    const healthy = (await ctx.repo.createHabit(habitInput({ nombre: 'Andar', horaRecordatorio: '08:00' }), 'es')).id;
    await ctx.reminders.saveEndOfDayReminder('21:30', 'es');
    const schedule = vi.mocked(ctx.notifications.scheduleHabitReminder);
    schedule.mockImplementation(async (habitName) => {
      if (habitName === 'Leer') throw new Error('alarm service unavailable');
      return { status: 'scheduled', notificationId: `resynced-${habitName}` };
    });

    await ctx.reminders.syncReminders('es');

    // La agenda se vació al empezar: el hábito que falló no conserva su id antiguo.
    expect((await ctx.repo.getHabit(broken))?.notificationId).toBeNull();
    expect((await ctx.repo.getHabit(healthy))?.notificationId).toBe('resynced-Andar');
    const endOfDayId = (await vi.mocked(ctx.notifications.scheduleEndOfDayReminder).mock.results.at(-1)?.value)?.notificationId;
    expect(endOfDayId).toBeTruthy();
    expect(await ctx.storage.getItem(END_OF_DAY_ID_KEY)).toBe(endOfDayId);
  });

  it('forgets the end-of-day id when rescheduling it fails', async () => {
    const ctx = await open();
    const id = (await ctx.repo.createHabit(habitInput({ horaRecordatorio: '07:00' }), 'es')).id;
    await ctx.reminders.saveEndOfDayReminder('21:30', 'es');
    vi.mocked(ctx.notifications.scheduleEndOfDayReminder).mockImplementationOnce(async () => {
      throw new Error('alarm service unavailable');
    });

    await expect(ctx.reminders.syncReminders('es')).rejects.toThrow('alarm service unavailable');

    // El id viejo ya no existe en el sistema; la hora sí se conserva para reparar.
    expect(await ctx.storage.getItem(END_OF_DAY_ID_KEY)).toBeNull();
    expect(await ctx.reminders.getEndOfDayReminderTime()).toBe('21:30');
    expect((await ctx.repo.getHabit(id))?.notificationId).toBeTruthy();
  });

  it('makes a habit created during a sync wait, so its new reminder is not cancelled', async () => {
    const ctx = await open();
    const schedule = vi.mocked(ctx.notifications.scheduleHabitReminder);
    let releaseCancelAll = () => {};
    vi.mocked(ctx.notifications.cancelAllReminders).mockImplementationOnce(
      () => new Promise<void>((resolve) => (releaseCancelAll = resolve)),
    );

    const sync = ctx.reminders.syncReminders('es');
    const created = ctx.repo.createHabit(habitInput({ horaRecordatorio: '07:00' }), 'es');
    await new Promise((resolve) => setTimeout(resolve, 20));

    // La sincronización sigue a medias (cancelando): el alta no ha programado nada todavía.
    expect(schedule).not.toHaveBeenCalled();

    releaseCancelAll();
    await sync;
    const { id } = await created;

    expect(schedule).toHaveBeenCalledTimes(1);
    expect((await ctx.repo.getHabit(id))?.notificationId).toBe((await schedule.mock.results[0].value).notificationId);
  });

  it('runs again only when the notification permission changed since the last sync', async () => {
    const ctx = await open();
    const id = (await ctx.repo.createHabit(habitInput({ horaRecordatorio: '07:00' }), 'es')).id;
    const permission = vi.mocked(ctx.notifications.hasNotificationPermission);
    const cancelAll = vi.mocked(ctx.notifications.cancelAllReminders);

    // Primera vez: todavía no hubo ninguna sincronización en este proceso.
    expect(await ctx.reminders.syncRemindersIfPermissionChanged('es')).toBe(true);
    cancelAll.mockClear();
    expect(await ctx.reminders.syncRemindersIfPermissionChanged('es')).toBe(false);
    expect(cancelAll).not.toHaveBeenCalled();

    // El usuario revoca el permiso en los ajustes del sistema y vuelve a la app.
    permission.mockResolvedValue(false);
    expect(await ctx.reminders.syncRemindersIfPermissionChanged('es')).toBe(true);
    expect((await ctx.repo.getHabit(id))?.notificationId).toBeNull();
    expect(await ctx.reminders.syncRemindersIfPermissionChanged('es')).toBe(false);

    // Lo concede de nuevo: el recordatorio vuelve sin reiniciar la app.
    permission.mockResolvedValue(true);
    expect(await ctx.reminders.syncRemindersIfPermissionChanged('es')).toBe(true);
    expect((await ctx.repo.getHabit(id))?.notificationId).toBeTruthy();
  });
});

describe('habit reminders', () => {
  it('saves the habit without a reminder when the system fails to schedule it', async () => {
    const ctx = await open();
    const schedule = vi.mocked(ctx.notifications.scheduleHabitReminder);
    schedule.mockImplementationOnce(async () => {
      throw new Error('alarm service unavailable');
    });

    const created = await ctx.repo.createHabit(habitInput({ nombre: 'Leer', horaRecordatorio: '07:00' }), 'es');

    expect(created.reminder).toBe('failed');
    const saved = await ctx.repo.getHabit(created.id);
    expect(saved).toMatchObject({ nombre: 'Leer', horaRecordatorio: '07:00', notificationId: null });

    schedule.mockImplementationOnce(async () => {
      throw new Error('alarm service unavailable');
    });
    expect(await ctx.repo.updateHabit(created.id, habitInput({ nombre: 'Leer más', horaRecordatorio: '08:00' }), 'es')).toBe('failed');
    expect(await ctx.repo.getHabit(created.id)).toMatchObject({ nombre: 'Leer más', horaRecordatorio: '08:00', notificationId: null });

    // La siguiente sincronización lo repara.
    await ctx.reminders.syncReminders('es');
    expect((await ctx.repo.getHabit(created.id))?.notificationId).toBeTruthy();
  });
});

describe('end-of-day reminder', () => {
  it('reports a saved time that the system is not scheduling', async () => {
    const ctx = await open();
    expect(await ctx.reminders.getEndOfDayReminderState()).toEqual({ time: null, scheduled: false });

    await ctx.reminders.saveEndOfDayReminder('21:30', 'es');
    expect(await ctx.reminders.getEndOfDayReminderState()).toEqual({ time: '21:30', scheduled: true });

    vi.mocked(ctx.notifications.hasNotificationPermission).mockResolvedValue(false);
    await ctx.reminders.syncReminders('es');
    expect(await ctx.reminders.getEndOfDayReminderState()).toEqual({ time: '21:30', scheduled: false });
  });

  it('does not leave two daily reminders when a save races a sync', async () => {
    const ctx = await open();
    await ctx.reminders.saveEndOfDayReminder('21:30', 'es');
    const cancel = vi.mocked(ctx.notifications.cancelEndOfDayReminder);
    const scheduleEndOfDay = vi.mocked(ctx.notifications.scheduleEndOfDayReminder);
    cancel.mockClear();
    scheduleEndOfDay.mockClear();

    const sync = ctx.reminders.syncReminders('es');
    const save = ctx.reminders.saveEndOfDayReminder('22:00', 'es');
    await Promise.all([sync, save]);

    const [fromSync, fromSave] = await Promise.all(scheduleEndOfDay.mock.results.map((result) => result.value));
    expect(scheduleEndOfDay.mock.calls.map(([time]) => time)).toEqual(['21:30', '22:00']);
    // El de la sincronización se sustituye por el nuevo: queda uno solo, y es el guardado.
    expect(cancel.mock.calls).toEqual([[fromSync.notificationId]]);
    expect(await ctx.storage.getItem(END_OF_DAY_ID_KEY)).toBe(fromSave.notificationId);
  });


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
