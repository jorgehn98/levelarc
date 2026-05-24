export type ClockTime = {
  hour: number;
  minute: number;
};

export function parseClockTime(value: string | null): ClockTime | null {
  if (!value) return null;
  const match = value.trim().match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
  if (!match) return null;
  return {
    hour: Number(match[1]),
    minute: Number(match[2]),
  };
}

export function formatClockTime(time: ClockTime) {
  return `${String(time.hour).padStart(2, '0')}:${String(time.minute).padStart(2, '0')}`;
}
