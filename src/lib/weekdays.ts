import { t, type Language } from '@/i18n';

// Convención LevelArc: lunes = 1 … domingo = 7.
export const weekdayIds = [1, 2, 3, 4, 5, 6, 7] as const;

export type WeekdayId = (typeof weekdayIds)[number];

export function getWeekdayInitial(language: Language, id: WeekdayId) {
  return t(language, `weekdayShort_${id}`);
}

export function getWeekdayName(language: Language, id: WeekdayId) {
  return t(language, `weekday_${id}`);
}

export function formatWeekdays(weekdaysCsv: string, language: Language) {
  const selected = new Set(weekdaysCsv.split(',').map(Number));
  const days = weekdayIds.filter((id) => selected.has(id));

  if (days.length === weekdayIds.length) return t(language, 'everyDay');

  return days.map((id) => getWeekdayInitial(language, id)).join(' · ');
}
