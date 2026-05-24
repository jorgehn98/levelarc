export function getScheduledCompletionStreak(completedDateKeys: Iterable<string>, dateKey: string, weekdaysCsv: string) {
  const completedDates = new Set(completedDateKeys);
  const scheduledWeekdays = parseWeekdays(weekdaysCsv);
  let streak = 0;
  const cursor = new Date(`${dateKey}T12:00:00`);

  while (true) {
    cursor.setDate(cursor.getDate() - 1);
    const weekday = getLevelArcWeekday(cursor);
    if (!scheduledWeekdays.has(weekday)) continue;

    const key = toDateKey(cursor);
    if (!completedDates.has(key)) break;
    streak += 1;
  }

  return streak;
}

function parseWeekdays(weekdaysCsv: string) {
  const weekdays = weekdaysCsv
    .split(',')
    .map((day) => Number(day.trim()))
    .filter((day) => Number.isInteger(day) && day >= 1 && day <= 7);

  return new Set(weekdays.length > 0 ? weekdays : [1, 2, 3, 4, 5, 6, 7]);
}

function getLevelArcWeekday(date: Date) {
  const weekday = date.getDay();
  return weekday === 0 ? 7 : weekday;
}

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}
