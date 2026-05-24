export const weekDays = [
  { id: 1, label: 'L' },
  { id: 2, label: 'M' },
  { id: 3, label: 'X' },
  { id: 4, label: 'J' },
  { id: 5, label: 'V' },
  { id: 6, label: 'S' },
  { id: 7, label: 'D' },
] as const;

const weekdayLabels = new Map<number, string>(weekDays.map((day) => [day.id, day.label]));

export function formatWeekdays(weekdaysCsv: string) {
  const days = weekdaysCsv
    .split(',')
    .map((value) => Number(value))
    .filter((value, index, values) => Number.isInteger(value) && weekdayLabels.has(value) && values.indexOf(value) === index)
    .sort((a, b) => a - b);

  if (days.length === weekDays.length) return 'Diario';

  return days
    .map((value) => weekdayLabels.get(value))
    .join(' · ');
}
