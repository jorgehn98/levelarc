import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { dateAt, goTo, habitInput } from '../../test/repository';

// Paridad del fallback web (AsyncStorage en memoria) con las reglas del repositorio nativo.

async function openWebRepository() {
  vi.resetModules();
  const repo = await import('./repository.web');
  await repo.initializeDatabase();
  return repo;
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  goTo(0);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('web repository parity', () => {
  it('pays the perfect-streak bonus on day 7 and 14 only, skipping rest days', async () => {
    const repo = await openWebRepository();
    const id = await repo.createHabit(habitInput({ diasSemana: '1,2,3,4,5,6' }));
    const paidOn: number[] = [];

    // 17 días naturales; los domingos (offset 6 y 13) no hay nada programado.
    let perfectDays = 0;
    for (let day = 0; day < 17; day += 1) {
      goTo(day);
      if (day % 7 !== 6) {
        await repo.incrementHabitProgress(id);
        perfectDays += 1;
      }
      await repo.claimDailyMission();
      await repo.claimPerfectWeekMission();
      const mission = await repo.getDailyMission();
      expect(mission.perfectStreakDays).toBe(perfectDays);
      if (mission.streakBonusClaimed) paidOn.push(perfectDays);
    }

    expect(paidOn).toEqual([7, 14]);
    expect((await repo.getPlayer()).rachaMisiones).toBe(15);
  });

  it('creates no Esencia through complete, spend, undo, redo', async () => {
    const repo = await openWebRepository();
    const ids: string[] = [];
    for (let index = 0; index < 3; index += 1) ids.push(await repo.createHabit(habitInput({ importancia: 5 })));
    for (const id of ids) await repo.incrementHabitProgress(id);
    expect((await repo.getPlayer()).esencia).toBe(45);

    expect(await repo.purchaseReward('title_awakened')).toEqual({ ok: true });
    for (const id of ids) await repo.undoTodayHabit(id);
    expect((await repo.getPlayer()).esencia).toBe(0);
    expect(await repo.purchaseReward('aura_amber')).toEqual({ ok: false, reason: 'insufficient' });

    for (const id of ids) await repo.incrementHabitProgress(id);
    expect((await repo.getPlayer()).esencia).toBe(15);
  });

  it('keeps a claimed bonus fixed and persists the revocation done while claiming', async () => {
    const repo = await openWebRepository();
    const ids: string[] = [];
    for (let index = 0; index < 4; index += 1) ids.push(await repo.createHabit(habitInput()));
    for (const id of ids) await repo.incrementHabitProgress(id);
    await repo.claimDailyMission();
    await repo.archiveHabit(ids[3]);
    expect(await repo.getDailyMission()).toMatchObject({ objetivo: 3, reclamada: true, xpBonus: 15, esenciaOtorgada: 8 });
    expect((await repo.getPlayer()).xpTotal).toBe(35);

    // Un hábito nuevo deja el día incompleto. El claim no procede, pero su sincronización revoca el
    // bonus anterior y ese cambio tiene que quedar guardado.
    await repo.createHabit(habitInput());
    await repo.claimDailyMission();

    const stored = (await repo.exportAllData()).missions.find((mission) => mission.fecha === dateAt(0));
    expect(stored).toMatchObject({ objetivo: 4, completados: 3, reclamada: false, esenciaOtorgada: 0 });
    expect((await repo.getPlayer()).xpTotal).toBe(20);
  });

  it('round-trips its own export and recomputes a tampered player cache', async () => {
    const repo = await openWebRepository();
    const id = await repo.createHabit(habitInput({ importancia: 5 }));
    await repo.incrementHabitProgress(id);
    await repo.claimDailyMission();
    await repo.addAiMessage('user', 'hola');
    const exported = JSON.parse(JSON.stringify(await repo.exportAllData()));
    const player = await repo.getPlayer();
    expect(player).toMatchObject({ xpTotal: 30, nivel: 2, rachaMisiones: 1 });

    await repo.importAllData({ ...exported, player: { ...exported.player, xpTotal: 1e300, nivel: 900, rango: 'S', rachaMisiones: 50 } });

    expect({ ...(await repo.getPlayer()), actualizadoEn: '' }).toEqual({ ...player, actualizadoEn: '' });
    const again = JSON.parse(JSON.stringify(await repo.exportAllData()));
    expect({ ...again, player: null, aiProfile: null }).toEqual({ ...exported, player: null, aiProfile: null });
  });

  it('rejects a hostile ledger', async () => {
    const repo = await openWebRepository();

    await expect(
      repo.importAllData({
        habits: [{ id: 'h1', nombre: 'Leer', importancia: 5, tipo: 'binario' }],
        events: [{ id: 'e1', habitId: 'h1', fecha: dateAt(0), tipoEvento: 'completado', xpDelta: 1e300 }],
      }),
    ).rejects.toThrow('Invalid backup number: xp_delta');
  });
});
