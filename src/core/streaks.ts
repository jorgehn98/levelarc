export type Weekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export function parseWeekdays(value: string): Weekday[] {
  return value
    .split(',')
    .map((day) => Number(day.trim()))
    .filter((day): day is Weekday => Number.isInteger(day) && day >= 1 && day <= 7);
}

export function getLevelArcWeekday(date: Date): Weekday {
  const day = date.getDay();
  return (day === 0 ? 7 : day) as Weekday;
}

export function habitAppliesOnDate(weekdaysCsv: string, date: Date): boolean {
  return parseWeekdays(weekdaysCsv).includes(getLevelArcWeekday(date));
}
