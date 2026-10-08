import { parseClockTime } from '@/lib/time';

// Parte pura de los recordatorios: qué disparadores corresponden a un hábito y qué hay que
// programar o limpiar para que la agenda del sistema coincida con la base. Sin expo-notifications,
// para poder probarla.

export type ReminderTrigger =
  | { kind: 'weekly'; weekday: number; hour: number; minute: number }
  | { kind: 'daily'; hour: number; minute: number };

// Resultado de intentar programar. `none`: no había nada que programar. `denied`: el sistema no
// permite notificaciones. `unsupported`: la plataforma no programa recordatorios (web).
export type ReminderStatus = 'none' | 'scheduled' | 'denied' | 'unsupported';

export type ReminderResult = { status: ReminderStatus; notificationId: string | null };

// LevelArc cuenta lunes = 1 … domingo = 7; Expo cuenta domingo = 1 … sábado = 7.
export function toExpoWeekday(day: number) {
  return day === 7 ? 1 : day + 1;
}

export function buildHabitReminderTriggers(reminderTime: string | null, weekdaysCsv: string): ReminderTrigger[] {
  const time = parseClockTime(reminderTime);
  if (!time) return [];
  const days = weekdaysCsv
    .split(',')
    .map((value) => Number(value))
    .filter((day, index, all) => Number.isInteger(day) && day >= 1 && day <= 7 && all.indexOf(day) === index);
  return days.map((day) => ({ kind: 'weekly', weekday: toExpoWeekday(day), hour: time.hour, minute: time.minute }));
}

export function buildDailyReminderTrigger(reminderTime: string | null): ReminderTrigger | null {
  const time = parseClockTime(reminderTime);
  return time ? { kind: 'daily', hour: time.hour, minute: time.minute } : null;
}

type PlannedHabit = {
  id: string;
  archivado: boolean;
  horaRecordatorio: string | null;
  diasSemana: string;
  notificationId: string | null;
};

// Plan de una sincronización que parte de una agenda vacía: `schedule` son los hábitos activos con
// un recordatorio válido; `clear`, los que guardan un id que ya no corresponde a nada.
export function planReminderSync<T extends PlannedHabit>(habits: T[]): { schedule: T[]; clear: T[] } {
  const schedule: T[] = [];
  const clear: T[] = [];
  for (const habit of habits) {
    if (!habit.archivado && buildHabitReminderTriggers(habit.horaRecordatorio, habit.diasSemana).length > 0) {
      schedule.push(habit);
    } else if (habit.notificationId) {
      clear.push(habit);
    }
  }
  return { schedule, clear };
}
