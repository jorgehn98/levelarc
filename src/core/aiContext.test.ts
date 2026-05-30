import { describe, expect, it } from 'vitest';

import { buildSystemContextText, type SystemContext } from './aiContext';

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
});
