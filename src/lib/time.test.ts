import { describe, expect, it } from 'vitest';

import { formatClockTime, parseClockTime } from './time';

describe('clock time helpers', () => {
  it('parses valid 24h times', () => {
    expect(parseClockTime('8:05')).toEqual({ hour: 8, minute: 5 });
    expect(parseClockTime('21:30')).toEqual({ hour: 21, minute: 30 });
  });

  it('rejects invalid times', () => {
    expect(parseClockTime('24:00')).toBeNull();
    expect(parseClockTime('21:99')).toBeNull();
    expect(parseClockTime('lo que sea')).toBeNull();
  });

  it('formats times as HH:MM', () => {
    expect(formatClockTime({ hour: 8, minute: 5 })).toBe('08:05');
  });
});
