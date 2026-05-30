import { describe, expect, it } from 'vitest';

import { buildHabitContext, type HabitInsightInput, type SystemContext } from './aiContext';
import {
  detectIntent,
  getDailyBriefing,
  getHabitInsight,
  getInterjectionTone,
  getRankUpLine,
  getSystemGreeting,
  getSystemInterjection,
  getSystemReply,
  normalizeMessage,
  type InterjectionTrigger,
  type SystemReply,
} from './systemVoice';

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

describe('getInterjectionTone', () => {
  it('maps each trigger to the expected pose tone', () => {
    expect(getInterjectionTone('mission_complete')).toBe('celebrate');
    expect(getInterjectionTone('streak_milestone')).toBe('celebrate');
    expect(getInterjectionTone('mission_failed')).toBe('serious');
    expect(getInterjectionTone('comeback')).toBe('neutral');
    expect(getInterjectionTone('near_level')).toBe('neutral');
  });
});

describe('getSystemInterjection', () => {
  // Para cada trigger, las claves válidas son `sys_int_<prefix>_1` o `_2`.
  const expectedKey: Record<InterjectionTrigger, RegExp> = {
    mission_complete: /^sys_int_mission_complete_[12]$/,
    comeback: /^sys_int_comeback_[12]$/,
    streak_milestone: /^sys_int_streak_[12]$/,
    near_level: /^sys_int_near_level_[12]$/,
    mission_failed: /^sys_int_mission_failed_[12]$/,
  };

  it('returns a key from the expected set for each trigger', () => {
    for (const trigger of Object.keys(expectedKey) as InterjectionTrigger[]) {
      const reply = asKeyReply(getSystemInterjection(makeContext(), trigger));
      expect(reply.key).toMatch(expectedKey[trigger]);
    }
  });

  it('interpolates context params (name, level, streak, falta)', () => {
    const reply = asKeyReply(getSystemInterjection(makeContext({ nivel: 12, faltaParaNivel: 40, mejorRachaHabito: 7 }), 'near_level'));
    expect(reply.params?.nivel).toBe(12);
    expect(reply.params?.falta).toBe(40);
    expect(reply.params?.mejorRacha).toBe(7);
  });

  it('is deterministic: same context and trigger produce the same key', () => {
    const ctx = makeContext({ completadosHoy: 2, nivel: 8 });
    expect(asKeyReply(getSystemInterjection(ctx, 'comeback')).key).toBe(
      asKeyReply(getSystemInterjection(ctx, 'comeback')).key,
    );
  });
});

describe('getDailyBriefing', () => {
  it('points at the weak link when one is known', () => {
    const reply = asKeyReply(
      getDailyBriefing(makeContext({ pendientesHoy: 3, eslabonDebil: { nombre: 'Leer', ratio: 0.4 } })),
    );
    expect(reply.key).toMatch(/^sys_briefing_[12]$/);
    expect(reply.params?.n).toBe(3);
    expect(reply.params?.eslabon).toBe('Leer');
    expect(reply.params?.ratioEslabon).toBe(40);
  });

  it('falls back to the generic pending push when there is no weak link', () => {
    const reply = asKeyReply(getDailyBriefing(makeContext({ pendientesHoy: 2 })));
    expect(reply.key).toMatch(/^sys_pending_[12]$/);
    expect(reply.params?.n).toBe(2);
  });
});

describe('getSystemGreeting briefing integration', () => {
  it('uses the actionable briefing when pending and a weak link exists', () => {
    const reply = asKeyReply(
      getSystemGreeting(makeContext({ pendientesHoy: 2, eslabonDebil: { nombre: 'Meditar', ratio: 0.3 } })),
    );
    expect(reply.key).toMatch(/^sys_briefing_[12]$/);
    expect(reply.params?.eslabon).toBe('Meditar');
  });

  it('still degrades to the generic pending greeting without a weak link', () => {
    const reply = asKeyReply(getSystemGreeting(makeContext({ pendientesHoy: 2 })));
    expect(reply.key).toMatch(/^sys_pending_[12]$/);
  });
});

describe('getRankUpLine', () => {
  it('uses the generic rank-up line for a non-S ascent and passes from/to params', () => {
    const reply = asKeyReply(getRankUpLine('E', 'D'));
    expect(reply.key).toMatch(/^sys_rankup_[12]$/);
    expect(reply.params?.from).toBe('E');
    expect(reply.params?.to).toBe('D');
  });

  it('uses the special climax line when reaching rank S', () => {
    const reply = asKeyReply(getRankUpLine('A', 'S'));
    expect(reply.key).toMatch(/^sys_rankup_s_[12]$/);
    expect(reply.params?.to).toBe('S');
  });

  it('is deterministic: same from/to produce the same key', () => {
    expect(asKeyReply(getRankUpLine('C', 'B')).key).toBe(asKeyReply(getRankUpLine('C', 'B')).key);
  });
});

function makeHabit(overrides: Partial<HabitInsightInput> = {}) {
  return buildHabitContext({
    nombre: 'Correr',
    consistency30: 0.7,
    currentStreak: 4,
    mejorRachaHabito: 12,
    importancia: 3,
    atributos: ['vitalidad'],
    last7: ['completado', 'completado', 'no_programado', 'completado', 'pendiente', 'completado', 'completado'],
    ...overrides,
  });
}

describe('getHabitInsight', () => {
  it('acknowledges high consistency (>=0.8) with a dry recognition', () => {
    const reply = asKeyReply(getHabitInsight(makeHabit({ consistency30: 0.9, last7: ['completado'] })));
    expect(reply.key).toMatch(/^sys_habit_high_[12]$/);
    expect(reply.params?.consistencia).toBe(90);
    expect(reply.params?.habito).toBe('Correr');
  });

  it('is neutral and demanding for mid consistency', () => {
    const reply = asKeyReply(getHabitInsight(makeHabit({ consistency30: 0.6, last7: ['completado'] })));
    expect(reply.key).toMatch(/^sys_habit_mid_[12]$/);
  });

  it('corrects low consistency (<0.5)', () => {
    const reply = asKeyReply(getHabitInsight(makeHabit({ consistency30: 0.3, last7: ['completado'] })));
    expect(reply.key).toMatch(/^sys_habit_low_[12]$/);
  });

  it('flags a clear failure pattern (>=2 failures in last 7) over the 30d average', () => {
    // Consistencia alta, pero 2 fallos recientes: el patrón de fallos gana por prioridad.
    const reply = asKeyReply(
      getHabitInsight(makeHabit({ consistency30: 0.9, last7: ['fallado', 'fallado', 'completado'] })),
    );
    expect(reply.key).toMatch(/^sys_habit_failpattern_[12]$/);
    expect(reply.params?.fallos).toBe(2);
  });

  it('is deterministic: same habit produces the same key', () => {
    const habit = makeHabit({ consistency30: 0.65 });
    expect(asKeyReply(getHabitInsight(habit)).key).toBe(asKeyReply(getHabitInsight(habit)).key);
  });
});
