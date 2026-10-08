import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { dateAt, goTo, habitInput, openRepository } from '../../test/repository';

// SQL real: el repositorio nativo corre contra node:sqlite en memoria (ver vitest.config.mjs).

type Repository = Awaited<ReturnType<typeof openRepository>>;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  goTo(0);
});

afterEach(() => {
  vi.useRealTimers();
});

async function count({ sqlite }: Repository, table: string, where = '1 = 1') {
  const row = await sqlite.getFirstAsync<{ count: number }>(`SELECT COUNT(*) as count FROM ${table} WHERE ${where}`);
  return row?.count ?? 0;
}

async function storedEssence({ sqlite }: Repository) {
  return (await sqlite.getFirstAsync<{ esencia: number }>('SELECT esencia FROM player'))?.esencia;
}

describe('concurrent mutations', () => {
  it('grants a double-tapped completion exactly once', async () => {
    const ctx = await openRepository();
    const id = (await ctx.repo.createHabit(habitInput({ importancia: 5 }), 'es')).id;

    await Promise.all([ctx.repo.incrementHabitProgress(id), ctx.repo.incrementHabitProgress(id)]);

    expect(await count(ctx, 'events')).toBe(1);
    // Importancia 5: 25 XP y 10 de Esencia, una sola vez.
    expect(await ctx.repo.getPlayer()).toMatchObject({ xpTotal: 25, nivel: 1, esencia: 10 });
  });

  it('does not lose XP when two different habits complete at once', async () => {
    const ctx = await openRepository();
    const a = (await ctx.repo.createHabit(habitInput({ importancia: 5 }), 'es')).id;
    const b = (await ctx.repo.createHabit(habitInput({ importancia: 3 }), 'es')).id;

    await Promise.all([ctx.repo.incrementHabitProgress(a), ctx.repo.incrementHabitProgress(b)]);

    expect(await count(ctx, 'events')).toBe(2);
    // 25 + 15 XP = nivel 2. Esencia: 10 + 6 de completar y 15 por subir al nivel 2.
    expect(await ctx.repo.getPlayer()).toMatchObject({ xpTotal: 40, nivel: 2, esencia: 31 });
  });

  it('grants a double-tapped mission claim exactly once', async () => {
    const ctx = await openRepository();
    const id = (await ctx.repo.createHabit(habitInput({ importancia: 1 }), 'es')).id;
    await ctx.repo.incrementHabitProgress(id);

    await Promise.all([ctx.repo.claimDailyMission(), ctx.repo.claimDailyMission()]);

    // 5 XP del hábito + 5 del bonus (objetivo 1). Esencia: 2 + 3.
    expect(await ctx.repo.getPlayer()).toMatchObject({ xpTotal: 10, esencia: 5, rachaMisiones: 1 });
  });

  it('rolls back a mutation that fails midway and keeps the queue usable', async () => {
    const ctx = await openRepository();
    const id = (await ctx.repo.createHabit(habitInput({ importancia: 5 }), 'es')).id;
    const realRun = ctx.sqlite.runAsync.bind(ctx.sqlite);
    const spy = vi.spyOn(ctx.sqlite, 'runAsync').mockImplementation(async (source, ...params) => {
      // Falla al actualizar la caché del jugador, después de haber insertado el evento.
      if (source.includes('UPDATE player')) throw new Error('disk full');
      return realRun(source, ...params);
    });

    await expect(ctx.repo.incrementHabitProgress(id)).rejects.toThrow('disk full');
    spy.mockRestore();

    expect(await count(ctx, 'events')).toBe(0);
    expect(await count(ctx, 'habit_daily_progress')).toBe(0);
    expect(await ctx.repo.getPlayer()).toMatchObject({ xpTotal: 0, esencia: 0 });

    await ctx.repo.incrementHabitProgress(id);
    expect(await ctx.repo.getPlayer()).toMatchObject({ xpTotal: 25, esencia: 10 });
  });
});

describe('habit actions', () => {
  it('awards a countable habit only when the target is reached', async () => {
    const ctx = await openRepository();
    const id = (await ctx.repo.createHabit(habitInput({ importancia: 2, tipo: 'contable', meta: 3 }), 'es')).id;

    await ctx.repo.incrementHabitProgress(id);
    await ctx.repo.incrementHabitProgress(id);
    expect(await count(ctx, 'events')).toBe(0);
    expect(await ctx.repo.listTodayHabits()).toMatchObject([{ cantidad: 2, estado: 'pendiente' }]);
    expect((await ctx.repo.getPlayer()).xpTotal).toBe(0);

    await ctx.repo.incrementHabitProgress(id);
    await ctx.repo.incrementHabitProgress(id);
    expect(await count(ctx, 'events')).toBe(1);
    expect(await ctx.repo.listTodayHabits()).toMatchObject([{ cantidad: 3, estado: 'completado' }]);
    expect((await ctx.repo.getPlayer()).xpTotal).toBe(10);
  });

  it('restores exact XP, attributes and Esencia on undo', async () => {
    const ctx = await openRepository();
    const a = (await ctx.repo.createHabit(habitInput({ importancia: 3 }), 'es')).id;
    const b = (await ctx.repo.createHabit(habitInput({ importancia: 2, atributos: 'fuerza' }), 'es')).id;
    await ctx.repo.incrementHabitProgress(a);
    const before = await ctx.repo.getPlayer();
    expect(before).toMatchObject({ xpTotal: 15, esencia: 6 });

    await ctx.repo.incrementHabitProgress(b);
    await ctx.repo.undoTodayHabit(b);

    const after = await ctx.repo.getPlayer();
    expect({ ...after, actualizadoEn: '' }).toEqual({ ...before, actualizadoEn: '' });
    expect(await count(ctx, 'events')).toBe(1);
    expect(await count(ctx, 'habit_daily_progress', "estado = 'completado'")).toBe(1);
    expect(await count(ctx, 'habit_daily_progress')).toBe(1);
  });

  it('never drops below the level floor on failure and stores the nominal penalty', async () => {
    const ctx = await openRepository();
    const a = (await ctx.repo.createHabit(habitInput({ importancia: 5 }), 'es')).id;
    const b = (await ctx.repo.createHabit(habitInput({ importancia: 3 }), 'es')).id;
    const c = (await ctx.repo.createHabit(habitInput({ importancia: 5 }), 'es')).id;
    await ctx.repo.incrementHabitProgress(a);
    await ctx.repo.incrementHabitProgress(b);

    await ctx.repo.markHabitFailed(c);

    // 40 XP − 20 quedaría en 20, por debajo del suelo del nivel 2 (30).
    expect(await ctx.repo.getPlayer()).toMatchObject({ xpTotal: 30, nivel: 2 });
    expect(await ctx.sqlite.getFirstAsync("SELECT xp_delta FROM events WHERE tipo_evento = 'fallado'")).toEqual({ xp_delta: -20 });
  });

  it('close-day penalises only untouched habits and is idempotent', async () => {
    const ctx = await openRepository();
    const untouched = (await ctx.repo.createHabit(habitInput({ nombre: 'untouched', importancia: 1 }), 'es')).id;
    const partial = (await ctx.repo.createHabit(habitInput({ nombre: 'partial', tipo: 'contable', meta: 3 }), 'es')).id;
    const done = (await ctx.repo.createHabit(habitInput({ nombre: 'done', importancia: 5 }), 'es')).id;
    const failed = (await ctx.repo.createHabit(habitInput({ nombre: 'failed', importancia: 1 }), 'es')).id;
    await ctx.repo.incrementHabitProgress(partial);
    await ctx.repo.incrementHabitProgress(done);
    await ctx.repo.markHabitFailed(failed);

    await ctx.repo.closeDay();

    const states = async () =>
      Object.fromEntries((await ctx.repo.listTodayHabits()).map((habit) => [habit.id, [habit.estado, habit.cantidad]]));
    const expected = {
      [untouched]: ['fallado', 0],
      [partial]: ['pendiente', 1],
      [done]: ['completado', 1],
      [failed]: ['fallado', 0],
    };
    expect(await states()).toEqual(expected);
    expect(await count(ctx, 'events', "tipo_evento = 'fallado'")).toBe(2);
    // 25 − 4 − 4.
    expect((await ctx.repo.getPlayer()).xpTotal).toBe(17);

    await ctx.repo.closeDay();

    expect(await states()).toEqual(expected);
    expect(await count(ctx, 'events')).toBe(3);
    expect((await ctx.repo.getPlayer()).xpTotal).toBe(17);
  });
});

describe('ledger and player cache', () => {
  it('keeps the cache equal to the ledger across a claimed mission and a clamped penalty', async () => {
    const ctx = await openRepository();
    goTo(0, '21:00:00');
    const a = (await ctx.repo.createHabit(habitInput({ importancia: 5 }), 'es')).id;
    await ctx.repo.incrementHabitProgress(a);
    goTo(0, '21:05:00');
    await ctx.repo.claimDailyMission();
    // 25 + 5 de bonus = 30: justo el suelo del nivel 2.
    expect(await ctx.repo.getPlayer()).toMatchObject({ xpTotal: 30, nivel: 2 });

    // A la mañana siguiente, antes del final del día UTC de la fecha de la misión: el fallo se
    // recorta en el suelo del nivel 2.
    goTo(1, '07:00:00');
    await ctx.repo.markHabitFailed(a);
    expect(await ctx.repo.getPlayer()).toMatchObject({ xpTotal: 30, nivel: 2 });

    // Un deshacer que no tiene que ver obliga a reconstruir el jugador desde el ledger.
    goTo(1, '08:00:00');
    const b = (await ctx.repo.createHabit(habitInput({ importancia: 1 }), 'es')).id;
    await ctx.repo.incrementHabitProgress(b);
    expect((await ctx.repo.getPlayer()).xpTotal).toBe(35);
    goTo(1, '08:01:00');
    await ctx.repo.undoTodayHabit(b);

    expect(await ctx.repo.getPlayer()).toMatchObject({ xpTotal: 30, nivel: 2, rachaMisiones: 1 });
  });

  it('never rewrites the bonus of an already claimed mission', async () => {
    const ctx = await openRepository();
    const ids: string[] = [];
    for (let index = 0; index < 4; index += 1) {
      ids.push((await ctx.repo.createHabit(habitInput({ importancia: 1 }), 'es')).id);
    }
    for (const id of ids) await ctx.repo.incrementHabitProgress(id);
    await ctx.repo.claimDailyMission();
    // 4 hábitos × 5 XP + bonus 15 (objetivo 4). Esencia: 4 × 2 + 8 de misión + 15 de nivel 2.
    expect(await ctx.repo.getPlayer()).toMatchObject({ xpTotal: 35, esencia: 31 });

    await ctx.repo.archiveHabit(ids[3]);
    // Con objetivo 3 el bonus sería 10 XP / 5 Esencia; el ya reclamado se conserva.
    expect(await ctx.repo.getDailyMission()).toMatchObject({ objetivo: 3, reclamada: true, xpBonus: 15, esenciaOtorgada: 8 });

    await ctx.repo.unarchiveHabit(ids[3], 'es');
    await ctx.repo.updateHabit(ids[0], habitInput({ importancia: 4 }), 'es');
    expect(await ctx.repo.getDailyMission()).toMatchObject({ objetivo: 4, reclamada: true, xpBonus: 15, esenciaOtorgada: 8 });

    // Deshacer un hábito deja el día incompleto: se revoca exactamente lo que se concedió.
    await ctx.repo.undoTodayHabit(ids[1]);
    expect(await ctx.repo.getDailyMission()).toMatchObject({ reclamada: false, esenciaOtorgada: 0, reclamadaEn: null });
    expect(await ctx.repo.getPlayer()).toMatchObject({ xpTotal: 15, esencia: 21 });
  });
});

describe('missions and streaks', () => {
  it('pays the perfect-streak bonus on day 7 and 14 but not on day 8', async () => {
    const ctx = await openRepository();
    const id = (await ctx.repo.createHabit(habitInput({ importancia: 1 }), 'es')).id;
    const paidOn: number[] = [];

    for (let day = 1; day <= 14; day += 1) {
      goTo(day - 1);
      await ctx.repo.incrementHabitProgress(id);
      await ctx.repo.claimPerfectWeekMission();
      const mission = await ctx.repo.getDailyMission();
      expect(mission.perfectStreakDays).toBe(day);
      if (mission.streakBonusClaimed) paidOn.push(day);
    }

    expect(paidOn).toEqual([7, 14]);
    // Hábito: 3 días × 5 XP + 11 días × 6 XP (multiplicador de racha) = 81. Bonus: 2 × 30.
    // Esencia: 14 × 2 + 2 × 25 + 35 por alcanzar el nivel 3.
    expect(await ctx.repo.getPlayer()).toMatchObject({ xpTotal: 141, nivel: 3, esencia: 113 });
  });

  it('does not break mission or perfect streaks on days without scheduled habits', async () => {
    const ctx = await openRepository();
    const id = (await ctx.repo.createHabit(habitInput({ diasSemana: '1,2,3,4,5' }), 'es')).id;

    for (let day = 0; day < 5; day += 1) {
      goTo(day);
      await ctx.repo.incrementHabitProgress(id, dateAt(day));
      await ctx.repo.claimDailyMission();
    }
    // Sábado y domingo: se abre la app, pero no hay nada programado ni reclamable.
    for (const day of [5, 6]) {
      goTo(day);
      await ctx.repo.claimDailyMission();
      await ctx.repo.claimPerfectWeekMission();
      expect(await ctx.repo.getDailyMission()).toMatchObject({ objetivo: 0, reclamada: false, perfectStreakDays: 5 });
    }
    expect((await ctx.repo.getPlayer()).rachaMisiones).toBe(5);

    goTo(7);
    await ctx.repo.incrementHabitProgress(id);
    await ctx.repo.claimDailyMission();
    expect((await ctx.repo.getDailyMission()).perfectStreakDays).toBe(6);
    expect((await ctx.repo.getPlayer()).rachaMisiones).toBe(6);

    goTo(8);
    await ctx.repo.incrementHabitProgress(id);
    await ctx.repo.claimPerfectWeekMission();
    expect(await ctx.repo.getDailyMission()).toMatchObject({ perfectStreakDays: 7, streakBonusClaimed: true });

    // Un día programado sin registro (la app no se abrió) sí rompe la racha.
    goTo(10);
    await ctx.repo.incrementHabitProgress(id);
    await ctx.repo.claimDailyMission();
    expect((await ctx.repo.getDailyMission()).perfectStreakDays).toBe(1);
    expect((await ctx.repo.getPlayer()).rachaMisiones).toBe(1);
  });

  it('counts streaks longer than a month, live and when recalculated', async () => {
    const ctx = await openRepository();
    const id = (await ctx.repo.createHabit(habitInput(), 'es')).id;

    for (let day = 0; day < 40; day += 1) {
      goTo(day);
      await ctx.repo.incrementHabitProgress(id);
      await ctx.repo.claimDailyMission();
    }

    expect((await ctx.repo.getDailyMission()).perfectStreakDays).toBe(40);
    expect((await ctx.repo.getPlayer()).rachaMisiones).toBe(40);

    // Importar recalcula la racha desde las misiones en vez de fiarse de la caché.
    await ctx.repo.importAllData(await ctx.repo.exportAllData());
    expect((await ctx.repo.getPlayer()).rachaMisiones).toBe(40);
  });
});

describe('essence', () => {
  it('creates no Esencia through complete, spend, undo, redo', async () => {
    const ctx = await openRepository();
    const ids: string[] = [];
    for (let index = 0; index < 3; index += 1) {
      ids.push((await ctx.repo.createHabit(habitInput({ importancia: 5 }), 'es')).id);
    }
    for (const id of ids) await ctx.repo.incrementHabitProgress(id);
    // 3 × 10 de completar + 15 por subir al nivel 2.
    expect((await ctx.repo.getPlayer()).esencia).toBe(45);

    expect(await ctx.repo.purchaseReward('title_awakened')).toEqual({ ok: true });
    expect((await ctx.repo.getPlayer()).esencia).toBe(15);

    for (const id of ids) await ctx.repo.undoTodayHabit(id);
    // El saldo guardado queda en deuda; hacia fuera se muestra 0 y no compra nada.
    expect(await storedEssence(ctx)).toBe(-15);
    expect((await ctx.repo.getPlayer()).esencia).toBe(0);
    expect(await ctx.repo.purchaseReward('aura_amber')).toEqual({ ok: false, reason: 'insufficient' });

    for (const id of ids) await ctx.repo.incrementHabitProgress(id);
    // Igual que justo después de comprar: rehacer no fabricó Esencia ni volvió a pagar el nivel.
    expect((await ctx.repo.getPlayer()).esencia).toBe(15);
    expect(await ctx.repo.listOwnedRewardIds()).toContain('title_awakened');
  });
});

describe('chat history', () => {
  it('prunes ai_messages on insert', async () => {
    const ctx = await openRepository();
    for (let index = 0; index < 1000; index += 1) {
      await ctx.sqlite.runAsync(
        'INSERT INTO ai_messages (id, rol, contenido, fecha, creado_en) VALUES (?, ?, ?, ?, ?)',
        [`m${index}`, 'user', 'hola', dateAt(0), new Date(Date.UTC(2026, 0, 1, 0, 0, index)).toISOString()],
      );
    }

    const added = await ctx.repo.addAiMessage('assistant', 'nuevo');

    const messages = await ctx.repo.listAiMessages();
    expect(messages).toHaveLength(1000);
    expect(messages[0].id).toBe('m1');
    expect(messages[999].id).toBe(added.id);
  });
});

describe('backup', () => {
  async function seedRealisticDatabase(ctx: Repository) {
    const { repo } = ctx;
    await repo.updatePlayerName('Jorge');
    const read = (await repo.createHabit(habitInput({ nombre: 'Leer', importancia: 5, horaRecordatorio: '08:30' }), 'es')).id;
    const water = (await repo.createHabit(habitInput({ nombre: 'Agua', importancia: 2, tipo: 'contable', meta: 3, atributos: 'vitalidad,fuerza' }), 'es')).id;
    const gym = (await repo.createHabit(habitInput({ nombre: 'Gym', importancia: 4, diasSemana: '1,3,5', atributos: 'fuerza' }), 'es')).id;
    const old = (await repo.createHabit(habitInput({ nombre: 'Viejo', importancia: 1 }), 'es')).id;

    for (let day = 0; day < 9; day += 1) {
      goTo(day, '08:00:00');
      await repo.incrementHabitProgress(read);
      for (let sip = 0; sip < (day === 4 ? 1 : 3); sip += 1) await repo.incrementHabitProgress(water);
      if (day === 2) await repo.markHabitFailed(gym);
      else if ([0, 4, 7].includes(day)) await repo.incrementHabitProgress(gym);
      if (day < 3) await repo.incrementHabitProgress(old);
      if (day === 3) await repo.archiveHabit(old);
      goTo(day, '20:00:00');
      await repo.claimDailyMission();
      await repo.claimPerfectWeekMission();
      await repo.evaluateAndUnlockAchievements();
      goTo(day, '23:00:00');
      await repo.closeDay();
    }

    goTo(9, '10:00:00');
    await repo.getDailyMission();
    expect(await repo.purchaseReward('title_awakened')).toEqual({ ok: true });
    expect(await repo.equipReward('title_awakened')).toEqual({ ok: true });
    await repo.addAiMessage('user', '¿Cómo voy?');
    goTo(9, '10:00:05');
    await repo.addAiMessage('assistant', 'Vas bien. Mantén la racha.');
    await repo.incrementHabitProgress(water);
    await repo.evaluateAndUnlockAchievements();
  }

  // Lo único que no viaja en un backup: ids de notificación del dispositivo y marcas de escritura.
  function comparable(exported: Awaited<ReturnType<Repository['repo']['exportAllData']>>) {
    const strip = (rows: unknown[], ...keys: string[]) =>
      (rows as Record<string, unknown>[]).map((row) => Object.fromEntries(Object.entries(row).filter(([key]) => !keys.includes(key))));
    return {
      ...exported,
      exportedAt: '',
      habits: strip(exported.habits, 'notification_id'),
      player: strip(exported.player, 'actualizado_en'),
      aiProfile: strip(exported.aiProfile, 'actualizado_en'),
    };
  }

  it('round-trips a realistic database without loss', async () => {
    const source = await openRepository();
    await seedRealisticDatabase(source);
    const exported = await source.repo.exportAllData();
    // La semilla produce lo que el test dice cubrir.
    expect(exported.events.length).toBeGreaterThan(20);
    expect(await count(source, 'events', "tipo_evento = 'fallado'")).toBeGreaterThan(0);
    expect(await count(source, 'daily_missions', 'reclamada = 1')).toBeGreaterThan(0);
    expect(await count(source, 'achievements_unlocked')).toBeGreaterThan(0);
    const sourcePlayer = await source.repo.getPlayer();

    // Pasa por JSON, como el backup real, y entra en una base distinta.
    const target = await openRepository();
    await target.repo.importAllData(JSON.parse(JSON.stringify(exported)));

    expect(comparable(await target.repo.exportAllData())).toEqual(comparable(exported));
    expect({ ...(await target.repo.getPlayer()), actualizadoEn: '' }).toEqual({ ...sourcePlayer, actualizadoEn: '' });
    // La importación no programa nada: los hábitos entran sin id y syncReminders los reprograma.
    expect(vi.mocked(target.notifications.scheduleHabitReminder)).not.toHaveBeenCalled();
    expect(await count(target, 'habits', 'notification_id IS NOT NULL')).toBe(0);
  });

  it('imports a backup with more chat history than the limit', async () => {
    const ctx = await openRepository();
    const aiMessages = Array.from({ length: 1005 }, (_, index) => ({
      id: `m${index}`,
      rol: 'user',
      contenido: index === 1004 ? 'x'.repeat(5000) : `mensaje ${index}`,
      fecha: dateAt(0),
      creado_en: new Date(Date.UTC(2026, 0, 1, 0, 0, index)).toISOString(),
    }));

    await ctx.repo.importAllData({ aiMessages: [...aiMessages].reverse() });

    const messages = await ctx.repo.listAiMessages();
    expect(messages).toHaveLength(1000);
    expect(messages[0].id).toBe('m5');
    expect(messages[999].contenido).toHaveLength(4000);
  });

  const habitRow = { id: 'h1', nombre: 'Leer', importancia: 5, tipo: 'binario', meta: 1, dias_semana: '1,2,3,4,5,6,7', creado_en: '2026-03-01T00:00:00.000Z' };
  const eventRow = { id: 'e1', habit_id: 'h1', fecha: '2026-03-01', tipo_evento: 'completado', xp_delta: 25, attribute_delta: '{"intelecto":37.5}', esencia_otorgada: 10, registrado_en: '2026-03-01T01:00:00.000Z' };

  it.each([
    ['huge', 1e300],
    ['not a number', 'NaN'],
    ['fractional', 2.5],
    ['negative completion', -25],
  ])('rejects a ledger with a %s xp delta and leaves the database untouched', async (_label, xpDelta) => {
    const ctx = await openRepository();
    const existing = (await ctx.repo.createHabit(habitInput({ importancia: 3 }), 'es')).id;
    await ctx.repo.incrementHabitProgress(existing);

    await expect(ctx.repo.importAllData({ habits: [habitRow], events: [{ ...eventRow, xp_delta: xpDelta }] })).rejects.toThrow(
      'Invalid backup number',
    );

    expect((await ctx.repo.listHabits()).map((habit) => habit.id)).toEqual([existing]);
    expect((await ctx.repo.getPlayer()).xpTotal).toBe(15);
  });

  it('clamps hostile cached numbers and keeps the app functions terminating', async () => {
    const ctx = await openRepository();

    await ctx.repo.importAllData({
      habits: [{ ...habitRow, tipo: 'contable', meta: 1e300, importancia: 99 }],
      habitDailyProgress: [{ id: 'p1', habit_id: 'h1', fecha: dateAt(0), cantidad: 1e300, estado: 'pendiente' }],
      player: [{ xp_total: 1e300, nivel: 1e300, rango: 'S', racha_misiones: 1e300, atributos_xp: '{"fuerza":1e300}', esencia: 1e300, nivel_esencia_otorgado: -5 }],
      dailyMissions: [{ fecha: dateAt(-1), objetivo: 1e300, completados: -4, reclamada: 1, xp_bonus: 10, perfect_streak_days: 1e300 }],
    });

    expect(await ctx.repo.getHabit('h1')).toMatchObject({ meta: 100_000, importancia: 5 });
    expect(await ctx.repo.getPlayer()).toMatchObject({
      xpTotal: 0,
      nivel: 1,
      rango: 'E',
      rachaMisiones: 0,
      atributosXp: { fuerza: 0 },
      esencia: 1_000_000,
      nivelEsenciaOtorgado: 1,
    });
    // La misión decía estar reclamada sin estar completa: su bonus no entra en el ledger.
    expect(await count(ctx, 'daily_missions', 'reclamada = 1')).toBe(0);

    await ctx.repo.incrementHabitProgress('h1');
    await ctx.repo.getDailyMission();
    await ctx.repo.evaluateAndUnlockAchievements();
    await ctx.repo.closeDay();
    expect((await ctx.repo.buildSystemContext()).nivel).toBe(1);
  });

  it('recomputes an inconsistent player cache from the imported ledger', async () => {
    const ctx = await openRepository();

    await ctx.repo.importAllData({
      habits: [habitRow],
      events: [eventRow, { ...eventRow, id: 'orphan', habit_id: 'missing' }],
      habitDailyProgress: [{ id: 'p-orphan', habit_id: 'missing', fecha: '2026-03-01', cantidad: 1, estado: 'completado' }],
      dailyMissions: [{ fecha: '2026-03-01', objetivo: 1, completados: 1, reclamada: 1, xp_bonus: 5, esencia_otorgada: 3 }],
      player: [{ nombre: 'Jorge', xp_total: 99_999, nivel: 50, rango: 'S', racha_misiones: 77, atributos_xp: '{"fuerza":5000}', esencia: 40, titulo_equipado: 'title_monarch', aura_equipada: 'aura_gold' }],
      playerRewards: [{ id: 'r1', reward_id: 'aura_amber', kind: 'aura' }, { id: 'r2', reward_id: 'not_in_catalog', kind: 'aura' }],
      achievementsUnlocked: [{ id: 'a1', achievement_id: 'ach_first_habit' }, { id: 'a2', achievement_id: 'ach_made_up' }],
    });

    expect(await ctx.repo.getPlayer()).toMatchObject({
      nombre: 'Jorge',
      // 25 del evento + 5 del bonus de misión reclamado.
      xpTotal: 30,
      nivel: 2,
      rango: 'E',
      rachaMisiones: 1,
      atributosXp: { fuerza: 0, intelecto: 37.5 },
      // El saldo se conserva tal cual: importar no paga otra vez el nivel alcanzado.
      esencia: 40,
      nivelEsenciaOtorgado: 2,
      // Lo equipado no estaba entre lo poseído.
      tituloEquipado: null,
      auraEquipada: 'aura_cyan',
    });
    expect(await count(ctx, 'events')).toBe(1);
    expect(await count(ctx, 'habit_daily_progress')).toBe(0);
    expect((await ctx.repo.listOwnedRewardIds()).sort()).toEqual(['aura_amber', 'aura_cyan']);
    expect(await ctx.repo.listUnlockedAchievementIds()).toEqual(['ach_first_habit']);
  });

  it('cancels the replaced reminders only when the import goes in', async () => {
    const ctx = await openRepository();
    const cancel = vi.mocked(ctx.notifications.cancelHabitReminder);
    const existing = (await ctx.repo.createHabit(habitInput({ horaRecordatorio: '07:00' }), 'es')).id;
    const oldNotification = (await ctx.repo.getHabit(existing))?.notificationId;
    expect(oldNotification).toBeTruthy();

    await expect(ctx.repo.importAllData({ habits: [habitRow], events: [{ ...eventRow, xp_delta: 1e300 }] })).rejects.toThrow('Invalid backup number');

    expect(cancel).not.toHaveBeenCalled();
    expect((await ctx.repo.getHabit(existing))?.notificationId).toBe(oldNotification);

    await ctx.repo.importAllData({ habits: [{ ...habitRow, hora_recordatorio: '08:00', notification_id: 'from-another-device' }] });

    expect(cancel.mock.calls.map(([id]) => id)).toEqual([oldNotification]);
    expect(await ctx.repo.getHabit('h1')).toMatchObject({ horaRecordatorio: '08:00', notificationId: null });
  });
});

describe('habit reminders', () => {
  it('saves the habit and reports it when notifications are denied', async () => {
    const ctx = await openRepository();
    vi.mocked(ctx.notifications.hasNotificationPermission).mockResolvedValue(false);

    const created = await ctx.repo.createHabit(habitInput({ horaRecordatorio: '07:00' }), 'es');

    expect(created.reminder).toBe('denied');
    expect(await ctx.repo.getHabit(created.id)).toMatchObject({ horaRecordatorio: '07:00', notificationId: null });
    expect((await ctx.repo.createHabit(habitInput(), 'es')).reminder).toBe('none');

    vi.mocked(ctx.notifications.hasNotificationPermission).mockResolvedValue(true);
    expect(await ctx.repo.updateHabit(created.id, habitInput({ horaRecordatorio: '07:00' }), 'es')).toBe('scheduled');
    expect((await ctx.repo.getHabit(created.id))?.notificationId).toBeTruthy();
  });

  it('never schedules a reminder for an archived habit', async () => {
    const ctx = await openRepository();
    const schedule = vi.mocked(ctx.notifications.scheduleHabitReminder);
    const { id } = await ctx.repo.createHabit(habitInput({ horaRecordatorio: '07:00' }), 'es');
    await ctx.repo.archiveHabit(id);
    schedule.mockClear();

    expect(await ctx.repo.updateHabit(id, habitInput({ nombre: 'Leer más', horaRecordatorio: '09:00' }), 'es')).toBe('none');

    expect(schedule).not.toHaveBeenCalled();
    expect(await ctx.repo.getHabit(id)).toMatchObject({ nombre: 'Leer más', horaRecordatorio: '09:00', notificationId: null });
  });

  it('cancels leftover ids before scheduling when a habit is unarchived', async () => {
    const ctx = await openRepository();
    const { id } = await ctx.repo.createHabit(habitInput({ horaRecordatorio: '07:00' }), 'en');
    await ctx.repo.archiveHabit(id);
    // Estado que dejaban las versiones que programaban al editar un archivado.
    await ctx.sqlite.runAsync("UPDATE habits SET notification_id = 'stale-1,stale-2' WHERE id = ?", [id]);
    const order: string[] = [];
    vi.mocked(ctx.notifications.cancelHabitReminder).mockImplementation(async (notificationId) => {
      order.push(`cancel:${notificationId}`);
    });
    const schedule = vi.mocked(ctx.notifications.scheduleHabitReminder);
    schedule.mockClear();
    schedule.mockImplementationOnce(async () => {
      order.push('schedule');
      return { status: 'scheduled', notificationId: 'fresh' };
    });

    expect(await ctx.repo.unarchiveHabit(id, 'en')).toBe('scheduled');

    expect(order).toEqual(['cancel:stale-1,stale-2', 'schedule']);
    expect(schedule.mock.calls[0]).toEqual(['Leer', '07:00', '1,2,3,4,5,6,7', 'en']);
    expect(await ctx.repo.getHabit(id)).toMatchObject({ archivado: false, notificationId: 'fresh' });
  });
});
