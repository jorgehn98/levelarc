import { describe, expect, it } from 'vitest';

import { getImportFailureReasonKey, parseBackupPayload, serializeBackupPayload } from './backup';
import { normalizeBackupData } from './backupValidation';
import { toLocalEndOfDay } from './date';

const habit = { id: 'h1', nombre: ' Leer ', importancia: 3, tipo: 'binario', meta: 1, dias_semana: '1,3,5', creado_en: '2026-03-01T09:00:00+09:00' };
const mission = { fecha: '2026-03-02', objetivo: 2, completados: 2, reclamada: 1, xp_bonus: 10, esencia_otorgada: 5 };

describe('backup payload', () => {
  it('serializes compact JSON in the current version and reads it back', () => {
    const raw = serializeBackupPayload({ habits: [habit] });

    expect(raw).not.toMatch(/\n/);
    expect(parseBackupPayload(raw)).toMatchObject({ version: 2, data: { habits: [habit] } });
  });

  it('still reads version 1 and rejects unknown versions', () => {
    const payload = { exportedAt: '2026-03-01T00:00:00.000Z', data: {} };

    expect(parseBackupPayload(JSON.stringify({ ...payload, version: 1 })).version).toBe(1);
    expect(() => parseBackupPayload(JSON.stringify({ ...payload, version: 3 }))).toThrow('Unsupported backup version: 3');
    expect(() => parseBackupPayload('{')).toThrow('Invalid backup JSON');
  });

  it('explains an import failure with a reason the user can act on', () => {
    const reasonOf = (task: () => unknown) => {
      try {
        task();
      } catch (error) {
        return getImportFailureReasonKey(error);
      }
      return null;
    };
    const newer = JSON.stringify({ version: 3, exportedAt: '2026-01-01T00:00:00.000Z', data: {} });

    expect(reasonOf(() => parseBackupPayload(newer))).toBe('importReasonVersion');
    expect(reasonOf(() => parseBackupPayload('not json'))).toBe('importReasonInvalid');
    expect(reasonOf(() => parseBackupPayload('{"version":"2"}'))).toBe('importReasonInvalid');
    expect(reasonOf(() => normalizeBackupData(null))).toBe('importReasonInvalid');
    expect(getImportFailureReasonKey(new Error('disk full'))).toBe('importReasonUnknown');
  });
});

describe('normalizeBackupData', () => {
  it('accepts native (snake_case) and web (camelCase) rows alike', () => {
    const native = normalizeBackupData({ habits: [habit], dailyMissions: [{ ...mission, reclamada_en: '2026-03-02T11:00:00.000Z' }] });
    const web = normalizeBackupData({
      habits: [{ id: 'h1', nombre: ' Leer ', importancia: 3, tipo: 'binario', meta: 1, diasSemana: '1,3,5', creadoEn: '2026-03-01T09:00:00+09:00' }],
      missions: [{ fecha: '2026-03-02', objetivo: 2, completados: 2, reclamada: true, xpBonus: 10, esenciaOtorgada: 5, reclamadaEn: '2026-03-02T11:00:00.000Z' }],
    });

    expect(web).toEqual(native);
    expect(native.habits[0]).toMatchObject({ nombre: 'Leer', diasSemana: '1,3,5', creadoEn: '2026-03-01T00:00:00.000Z', notificationId: null });
  });

  it('keeps rest days as objective 0', () => {
    const { dailyMissions } = normalizeBackupData({ dailyMissions: [{ fecha: '2026-03-01', objetivo: 0, completados: 0, reclamada: 0, xp_bonus: 0 }] });

    expect(dailyMissions[0]).toMatchObject({ objetivo: 0, completados: 0, reclamada: false, reclamadaEn: null });
  });

  it('dates the claims of a version 1 backup at the local end of their day', () => {
    const { dailyMissions } = normalizeBackupData({ dailyMissions: [{ ...mission, streak_bonus_claimed: 1 }] });

    expect(dailyMissions[0]).toMatchObject({
      reclamada: true,
      reclamadaEn: toLocalEndOfDay('2026-03-02'),
      streakBonusClaimed: true,
      streakBonusReclamadoEn: toLocalEndOfDay('2026-03-02'),
    });
  });

  it('accepts a negative Esencia balance within bounds', () => {
    expect(normalizeBackupData({ player: [{ esencia: -15 }] }).player.esencia).toBe(-15);
    expect(normalizeBackupData({ player: [{ esencia: -1e300 }] }).player.esencia).toBe(-1_000_000);
  });

  it.each([
    ['duplicate habit ids', { habits: [habit, habit] }, 'Duplicate backup habit id'],
    ['duplicate mission dates', { dailyMissions: [mission, mission] }, 'Duplicate backup mission date'],
    ['a malformed date', { dailyMissions: [{ ...mission, fecha: '2026-02-30' }] }, 'Invalid backup date'],
    ['a malformed timestamp', { habits: [{ ...habit, creado_en: 'yesterday' }] }, 'Invalid backup timestamp'],
    ['weekdays out of range', { habits: [{ ...habit, dias_semana: '0,8' }] }, 'Invalid backup weekdays'],
    ['repeated weekdays', { habits: [{ ...habit, dias_semana: '1,1' }] }, 'Duplicate backup weekday'],
    ['a mission bonus out of range', { dailyMissions: [{ ...mission, xp_bonus: 1e300 }] }, 'Invalid backup number: xp_bonus'],
    ['a penalty stored as a gain', { habits: [habit], events: [{ id: 'e1', habit_id: 'h1', fecha: '2026-03-02', tipo_evento: 'fallado', xp_delta: 12 }] }, 'Invalid backup number: xp_delta'],
    ['too many habits', { habits: Array.from({ length: 501 }, (_, index) => ({ ...habit, id: `h${index}` })) }, 'Backup habits limit exceeded'],
    ['something that is not an object', [], 'Invalid backup data'],
  ])('rejects %s', (_label, data, message) => {
    expect(() => normalizeBackupData(data)).toThrow(message);
  });

  it('drops an invalid reminder time instead of scheduling it', () => {
    const { habits } = normalizeBackupData({ habits: [{ ...habit, hora_recordatorio: '25:99' }] });

    expect(habits[0].horaRecordatorio).toBeNull();
  });

  it('never fails because of chat history', () => {
    const { aiMessages } = normalizeBackupData({
      aiMessages: [
        { id: 'ok', rol: 'assistant', contenido: 'hola', fecha: '2026-03-02', creado_en: '2026-03-02T01:00:00.000Z' },
        { id: 'ok', rol: 'assistant', contenido: 'duplicado', fecha: '2026-03-02', creado_en: '2026-03-02T02:00:00.000Z' },
        { id: 'sin-fecha', rol: 'hacker', contenido: 42, creado_en: '2026-03-02T03:00:00.000Z' },
        { id: 'roto', creado_en: 'nunca' },
        'basura',
      ],
    });

    expect(aiMessages).toEqual([
      { id: 'ok', rol: 'assistant', contenido: 'hola', fecha: '2026-03-02', creadoEn: '2026-03-02T01:00:00.000Z' },
      { id: 'sin-fecha', rol: 'system', contenido: '', fecha: '2026-03-02', creadoEn: '2026-03-02T03:00:00.000Z' },
    ]);
  });
});
