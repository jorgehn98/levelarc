import { describe, expect, it } from 'vitest';

import {
  buildHabitContext,
  buildHabitContextText,
  buildSystemContextText,
  type HabitInsightInput,
  type SystemContext,
} from './aiContext';

function makeContext(overrides: Partial<SystemContext> = {}): SystemContext {
  return {
    nombre: 'Jorge',
    nivel: 12,
    rango: 'D',
    esencia: 40,
    ratioNivel: 0.5,
    faltaParaNivel: 80,
    rachaMisiones: 4,
    atributoTop: { id: 'voluntad', nivel: 6 },
    habitosActivos: 6,
    habitosHoyTotal: 5,
    completadosHoy: 3,
    pendientesHoy: 2,
    falladosHoy: 0,
    diaPerfecto: false,
    mejorRachaHabito: 9,
    rachaPerfecta: 2,
    ...overrides,
  };
}

describe('buildSystemContextText', () => {
  it('serializes the full context deterministically', () => {
    const text = buildSystemContextText(makeContext());
    expect(text).toContain('nombre: Jorge');
    expect(text).toContain('nivel: 12');
    expect(text).toContain('rango: D');
    expect(text).toContain('progreso_nivel: 50%');
    expect(text).toContain('atributo_top: voluntad (nivel 6)');
    expect(text).toContain('habitos_activos: 6');
    expect(text).toContain('pendientes_hoy: 2');
    expect(text).toContain('dia_perfecto: no');
  });

  it('produces identical output for identical input', () => {
    expect(buildSystemContextText(makeContext())).toBe(buildSystemContextText(makeContext()));
  });

  it('handles null name and null top attribute', () => {
    const text = buildSystemContextText(makeContext({ nombre: null, atributoTop: null }));
    expect(text).toContain('nombre: -');
    expect(text).toContain('atributo_top: -');
  });

  it('marks a perfect day', () => {
    const text = buildSystemContextText(makeContext({ diaPerfecto: true }));
    expect(text).toContain('dia_perfecto: si');
  });

  it('serializes the weak link when present and a dash when absent', () => {
    expect(buildSystemContextText(makeContext())).toContain('eslabon_debil: -');
    const withWeak = buildSystemContextText(
      makeContext({ eslabonDebil: { nombre: 'Leer', ratio: 0.42 } }),
    );
    expect(withWeak).toContain('eslabon_debil: Leer (42%)');
  });
});

function makeHabitInput(overrides: Partial<HabitInsightInput> = {}): HabitInsightInput {
  return {
    nombre: 'Correr',
    consistency30: 0.7,
    currentStreak: 4,
    mejorRachaHabito: 12,
    importancia: 3,
    atributos: ['vitalidad', 'voluntad'],
    last7: ['completado', 'completado', 'fallado', 'no_programado', 'completado', 'pendiente', 'completado'],
    ...overrides,
  };
}

describe('buildHabitContext', () => {
  it('counts completed and failed days in the last-7 window', () => {
    const ctx = buildHabitContext(makeHabitInput());
    expect(ctx.completados7).toBe(4);
    expect(ctx.fallados7).toBe(1);
  });

  it('maps the flat input fields onto the context', () => {
    const ctx = buildHabitContext(makeHabitInput({ nombre: 'Leer', consistency30: 0.55, currentStreak: 2 }));
    expect(ctx.nombre).toBe('Leer');
    expect(ctx.consistencia).toBe(0.55);
    expect(ctx.rachaActual).toBe(2);
    expect(ctx.mejorRacha).toBe(12);
    expect(ctx.importancia).toBe(3);
    expect(ctx.atributos).toEqual(['vitalidad', 'voluntad']);
  });
});

describe('buildHabitContextText', () => {
  it('serializes the habit context deterministically with compact symbols', () => {
    const text = buildHabitContextText(buildHabitContext(makeHabitInput()));
    expect(text).toContain('habito: Correr');
    expect(text).toContain('consistencia_30d: 70%');
    expect(text).toContain('racha_actual: 4');
    expect(text).toContain('mejor_racha: 12');
    expect(text).toContain('importancia: 3');
    expect(text).toContain('atributos: vitalidad, voluntad');
    expect(text).toContain('ultimos_7: CCX-CPC');
    expect(text).toContain('completados_7: 4');
    expect(text).toContain('fallados_7: 1');
  });

  it('produces identical output for identical input', () => {
    expect(buildHabitContextText(buildHabitContext(makeHabitInput()))).toBe(
      buildHabitContextText(buildHabitContext(makeHabitInput())),
    );
  });

  it('renders a dash when there are no attributes', () => {
    const text = buildHabitContextText(buildHabitContext(makeHabitInput({ atributos: [] })));
    expect(text).toContain('atributos: -');
  });
});
