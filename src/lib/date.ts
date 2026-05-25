export function toDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getYesterdayDateKey(date = new Date()): string {
  const yesterday = new Date(date);
  yesterday.setDate(yesterday.getDate() - 1);
  return toDateKey(yesterday);
}

export function getDateKeysBetween(startDateKey: string, endDateKey: string): string[] {
  if (startDateKey > endDateKey) return [];

  const keys: string[] = [];
  const cursor = new Date(`${startDateKey}T12:00:00`);
  const end = new Date(`${endDateKey}T12:00:00`);

  while (cursor <= end) {
    keys.push(toDateKey(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  return keys;
}

export function toIsoTimestamp(date = new Date()): string {
  return date.toISOString();
}

export function getTodayWeekday(date = new Date()): number {
  const day = date.getDay();
  return day === 0 ? 7 : day;
}
