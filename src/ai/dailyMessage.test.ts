import { describe, expect, it } from 'vitest';

import type { SystemContext } from '@/core/aiContext';

import { buildDailyMessageKey, parseCachedDailyMessage } from './dailyMessage';

function makeContext(overrides: Partial<SystemContext> = {}): SystemContext {
  return {
    nombre: 'Jorge',
    nivel: 3,
    rango: 'E',
    esencia: 0,
    ratioNivel: 0.2,
    faltaParaNivel: 80,
    rachaMisiones: 0,
    atributoTop: null,
    habitosActivos: 2,
    habitosHoyTotal: 2,
    completadosHoy: 0,
    pendientesHoy: 2,
    falladosHoy: 0,
    diaPerfecto: false,
    mejorRachaHabito: 0,
    rachaPerfecta: 0,
    ...overrides,
  };
}

describe('buildDailyMessageKey', () => {
  it('identifies the day, the language and the state the message was written for', () => {
    expect(buildDailyMessageKey('2026-10-08', 'es', makeContext())).toBe('2026-10-08|es|pending:2');
  });

  it('goes stale when the language changes', () => {
    const ctx = makeContext();
    expect(buildDailyMessageKey('2026-10-08', 'en', ctx)).not.toBe(buildDailyMessageKey('2026-10-08', 'es', ctx));
  });

  it('goes stale when the day changes', () => {
    const ctx = makeContext();
    expect(buildDailyMessageKey('2026-10-09', 'es', ctx)).not.toBe(buildDailyMessageKey('2026-10-08', 'es', ctx));
  });

  it('goes stale when the missions of the day are completed', () => {
    const done = makeContext({ completadosHoy: 2, pendientesHoy: 0, diaPerfecto: true });
    expect(buildDailyMessageKey('2026-10-08', 'es', done)).toBe('2026-10-08|es|done:0');
  });
});

describe('parseCachedDailyMessage', () => {
  it('reads a cached message', () => {
    const raw = JSON.stringify({ key: '2026-10-08|es|pending:2', text: 'Quedan 2.', fromAi: true });
    expect(parseCachedDailyMessage(raw)).toEqual({ key: '2026-10-08|es|pending:2', text: 'Quedan 2.', fromAi: true });
  });

  it('discards the legacy date-only cache, which carried no language', () => {
    expect(parseCachedDailyMessage(JSON.stringify({ date: '2026-10-08', text: 'Quedan 2.', fromAi: true }))).toBeNull();
  });

  it('discards missing or corrupt entries', () => {
    expect(parseCachedDailyMessage(null)).toBeNull();
    expect(parseCachedDailyMessage('{not json')).toBeNull();
    expect(parseCachedDailyMessage('null')).toBeNull();
  });
});
