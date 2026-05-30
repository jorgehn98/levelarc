import { describe, expect, it } from 'vitest';

import type { SystemContext } from './aiContext';
import { detectIntent, getSystemGreeting, getSystemReply, normalizeMessage, type SystemReply } from './systemVoice';

// Tras el cambio a union, el core siempre devuelve la variante 'key'. Esta narrowing helper falla
// el test si alguna vez devolviera 'text', y de paso da acceso tipado a key/params.
function asKeyReply(reply: SystemReply): { key: string; params?: Record<string, string | number> } {
  expect(reply.kind).toBe('key');
  if (reply.kind !== 'key') throw new Error('expected a key reply');
  return reply;
}

function makeContext(overrides: Partial<SystemContext> = {}): SystemContext {
  return {
    nombre: 'Jorge',
    nivel: 10,
    rango: 'D',
    esencia: 20,
    ratioNivel: 0.3,
    faltaParaNivel: 100,
    rachaMisiones: 0,
    atributoTop: null,
    habitosHoyTotal: 0,
    completadosHoy: 0,
    pendientesHoy: 0,
    falladosHoy: 0,
    diaPerfecto: false,
    mejorRachaHabito: 0,
    rachaPerfecta: 0,
    ...overrides,
  };
}

describe('getSystemGreeting priority', () => {
  it('pushes when there are pending missions (highest priority)', () => {
    // Pendientes gana incluso con día perfecto/fallos en el mismo contexto.
    const reply = asKeyReply(getSystemGreeting(makeContext({ pendientesHoy: 3, falladosHoy: 1, ratioNivel: 0.95 })));
    expect(reply.key).toMatch(/^sys_pending_[12]$/);
    expect(reply.params?.n).toBe(3);
  });

  it('acknowledges a perfect day when nothing is pending', () => {
    const reply = asKeyReply(getSystemGreeting(makeContext({ habitosHoyTotal: 4, completadosHoy: 4, diaPerfecto: true })));
    expect(reply.key).toMatch(/^sys_perfect_[12]$/);
  });

  it('flags a failure without drama', () => {
    const reply = asKeyReply(getSystemGreeting(makeContext({ falladosHoy: 2 })));
    expect(reply.key).toMatch(/^sys_failed_[12]$/);
  });

  it('motivates when close to leveling up', () => {
    const reply = asKeyReply(getSystemGreeting(makeContext({ ratioNivel: 0.85, faltaParaNivel: 15 })));
    expect(reply.key).toMatch(/^sys_near_level_[12]$/);
    expect(reply.params?.falta).toBe(15);
  });

  it('congratulates a high mission streak', () => {
    const reply = asKeyReply(getSystemGreeting(makeContext({ rachaMisiones: 5 })));
    expect(reply.key).toMatch(/^sys_streak_[12]$/);
    expect(reply.params?.racha).toBe(5);
  });

  it('falls back to a state greeting when nothing stands out', () => {
    const reply = asKeyReply(getSystemGreeting(makeContext()));
    expect(reply.key).toMatch(/^sys_greet_state_[12]$/);
    expect(reply.params?.nivel).toBe(10);
    expect(reply.params?.rango).toBe('D');
  });
});

describe('detectIntent', () => {
  it('maps greeting keywords (ES and EN)', () => {
    expect(detectIntent('hola Sistema')).toBe('hello');
    expect(detectIntent('hey there')).toBe('hello');
    expect(detectIntent('buenas')).toBe('hello');
  });

  it('maps status keywords ignoring accents', () => {
    expect(detectIntent('¿cómo voy?')).toBe('status');
    expect(detectIntent('show me my progress')).toBe('status');
    expect(detectIntent('estado')).toBe('status');
  });

  it('maps help keywords', () => {
    expect(detectIntent('ayuda')).toBe('help');
    expect(detectIntent('what should i do')).toBe('help');
  });

  it('maps thanks keywords', () => {
    expect(detectIntent('gracias')).toBe('thanks');
    expect(detectIntent('thanks!')).toBe('thanks');
  });

  it('maps motivation keywords', () => {
    expect(detectIntent('dame ánimo')).toBe('motivate');
    expect(detectIntent('motivate me')).toBe('motivate');
  });

  it('returns unknown for unrecognized text', () => {
    expect(detectIntent('xyzzy plugh')).toBe('unknown');
    expect(detectIntent('')).toBe('unknown');
  });

  it('matches keywords by whole word, not substring', () => {
    // 'hi' no debe matchear dentro de "history"/"this" (falso positivo del matching por substring).
    expect(detectIntent('show me my history')).toBe('unknown');
    expect(detectIntent('is this working')).toBe('unknown');
    // Pero sí matchea cuando aparece como palabra suelta.
    expect(detectIntent('hi there')).toBe('hello');
  });
});

describe('normalizeMessage', () => {
  it('lowercases and strips accents', () => {
    expect(normalizeMessage('CÓMO Voy')).toBe('como voy');
    expect(normalizeMessage('  Ánimo  ')).toBe('animo');
  });
});

describe('getSystemReply', () => {
  it('routes a greeting to a hello reply', () => {
    const reply = asKeyReply(getSystemReply(makeContext(), 'hola'));
    expect(reply.key).toMatch(/^sys_reply_hello_[12]$/);
  });

  it('routes a status question to a status reply with progress params', () => {
    const reply = asKeyReply(getSystemReply(makeContext({ completadosHoy: 2, faltaParaNivel: 30 }), 'como voy'));
    expect(reply.key).toMatch(/^sys_reply_status_[12]$/);
    expect(reply.params?.completados).toBe(2);
    expect(reply.params?.falta).toBe(30);
  });

  it('routes help and thanks intents', () => {
    expect(asKeyReply(getSystemReply(makeContext(), 'ayuda')).key).toMatch(/^sys_reply_help_[12]$/);
    expect(asKeyReply(getSystemReply(makeContext(), 'gracias')).key).toMatch(/^sys_reply_thanks_[12]$/);
  });

  it('falls back to the greeting when the message is unknown but something stands out', () => {
    // Sin intención reconocida pero con pendientes → reutiliza el saludo proactivo.
    const reply = asKeyReply(getSystemReply(makeContext({ pendientesHoy: 2 }), 'blah blah'));
    expect(reply.key).toMatch(/^sys_pending_[12]$/);
  });

  it('uses the unknown reply when the message is unknown and nothing stands out', () => {
    const reply = asKeyReply(getSystemReply(makeContext(), 'blah blah'));
    expect(reply.key).toMatch(/^sys_reply_unknown_[12]$/);
  });

  it('is deterministic: same context and message produce the same key', () => {
    const ctx = makeContext({ pendientesHoy: 1 });
    expect(asKeyReply(getSystemReply(ctx, 'hola')).key).toBe(asKeyReply(getSystemReply(ctx, 'hola')).key);
  });
});
