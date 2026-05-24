export function toDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function toIsoTimestamp(date = new Date()): string {
  return date.toISOString();
}

export function getTodayWeekday(date = new Date()): number {
  const day = date.getDay();
  return day === 0 ? 7 : day;
}
