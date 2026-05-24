export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export function parseWeekdays(value: string): Weekday[] {
  return value
    .split(',')
    .map((day) => Number(day.trim()))
    .filter((day): day is Weekday => Number.isInteger(day) && day >= 0 && day <= 6);
}

export function habitAppliesOnDate(weekdaysCsv: string, date: Date): boolean {
  return parseWeekdays(weekdaysCsv).includes(date.getDay() as Weekday);
}
