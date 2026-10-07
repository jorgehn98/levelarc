import { vi } from 'vitest';

import type { HabitInput } from '@/db/types';
import { shiftDateKey } from '@/lib/date';

// Lunes. Los tests se mueven por días relativos a esta fecha.
const BASE_DATE = '2026-03-02';

export function dateAt(dayOffset: number) {
  return shiftDateKey(BASE_DATE, dayOffset);
}

// Fija el reloj (hora local) en el día indicado. Requiere vi.useFakeTimers({ toFake: ['Date'] }).
export function goTo(dayOffset: number, time = '09:00:00') {
  vi.setSystemTime(new Date(`${dateAt(dayOffset)}T${time}`));
}

// Repositorio nativo sobre una base en memoria nueva, ya migrada e inicializada.
export async function openRepository() {
  vi.resetModules();
  const repo = await import('@/db/repository');
  const { sqlite } = await import('@/db/client');
  const notifications = await import('@/lib/notifications');
  await repo.initializeDatabase();
  return { repo, sqlite, notifications };
}

export function habitInput(overrides: Partial<HabitInput> = {}): HabitInput {
  return {
    nombre: 'Leer',
    icono: 'book',
    atributos: 'intelecto',
    importancia: 1,
    tipo: 'binario',
    meta: 1,
    diasSemana: '1,2,3,4,5,6,7',
    horaRecordatorio: null,
    ...overrides,
  };
}
