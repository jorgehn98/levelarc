import { describe, expect, it } from 'vitest';

import { buildDailyReminderTrigger, buildHabitReminderTriggers, planReminderSync, toExpoWeekday } from './reminderPlan';

describe('reminder triggers', () => {
  it('maps LevelArc weekdays (Monday = 1) to Expo weekdays (Sunday = 1)', () => {
    expect([1, 2, 3, 4, 5, 6, 7].map(toExpoWeekday)).toEqual([2, 3, 4, 5, 6, 7, 1]);
  });

  it('builds one weekly trigger per scheduled day', () => {
    expect(buildHabitReminderTriggers('07:05', '1,7')).toEqual([
      { kind: 'weekly', weekday: 2, hour: 7, minute: 5 },
      { kind: 'weekly', weekday: 1, hour: 7, minute: 5 },
    ]);
  });

  it('ignores invalid and repeated weekdays', () => {
    expect(buildHabitReminderTriggers('21:30', '3,3,0,8,x,')).toEqual([{ kind: 'weekly', weekday: 4, hour: 21, minute: 30 }]);
  });

  it('builds nothing without a valid time', () => {
    expect(buildHabitReminderTriggers(null, '1,2')).toEqual([]);
    expect(buildHabitReminderTriggers('25:00', '1,2')).toEqual([]);
    expect(buildDailyReminderTrigger('')).toBeNull();
  });

  it('builds the daily trigger of the end-of-day reminder', () => {
    expect(buildDailyReminderTrigger('21:30')).toEqual({ kind: 'daily', hour: 21, minute: 30 });
  });
});

describe('reminder sync plan', () => {
  const habit = (id: string, overrides: object = {}) => ({
    id,
    archivado: false,
    horaRecordatorio: '08:00' as string | null,
    diasSemana: '1,2,3',
    notificationId: null as string | null,
    ...overrides,
  });

  it('schedules active habits with a reminder and clears stale ids', () => {
    const plan = planReminderSync([
      habit('active', { notificationId: 'old' }),
      habit('archived', { archivado: true, notificationId: 'stale' }),
      habit('archived-clean', { archivado: true }),
      habit('no-time', { horaRecordatorio: null, notificationId: 'stale-2' }),
      habit('no-days', { diasSemana: '' }),
    ]);

    expect(plan.schedule.map((item) => item.id)).toEqual(['active']);
    expect(plan.clear.map((item) => item.id)).toEqual(['archived', 'no-time']);
  });
});
