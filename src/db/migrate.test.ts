import { openDatabaseSync } from 'expo-sqlite';
import { describe, expect, it } from 'vitest';

import { migrateDb } from './migrate';
import { toLocalEndOfDay } from '@/lib/date';

async function columnsOf(db: ReturnType<typeof openDatabaseSync>, table: string) {
  const columns = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${table})`);
  return columns.map((column) => column.name);
}

async function userVersion(db: ReturnType<typeof openDatabaseSync>) {
  return (await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version'))?.user_version;
}

// Esquema de una instalación antigua: solo lo necesario para probar que las columnas que faltan se
// añaden y que el ancla de Esencia se aplica una vez.
const OLD_SCHEMA = `
  CREATE TABLE habits (
    id text PRIMARY KEY NOT NULL,
    nombre text NOT NULL,
    importancia integer NOT NULL,
    tipo text NOT NULL,
    meta integer DEFAULT 1 NOT NULL,
    dias_semana text NOT NULL,
    hora_recordatorio text,
    archivado integer DEFAULT 0 NOT NULL,
    creado_en text NOT NULL
  );
  CREATE TABLE player (
    id integer PRIMARY KEY DEFAULT 1 NOT NULL,
    xp_total integer DEFAULT 0 NOT NULL,
    nivel integer DEFAULT 1 NOT NULL,
    rango text DEFAULT 'E' NOT NULL,
    racha_misiones integer DEFAULT 0 NOT NULL,
    actualizado_en text NOT NULL
  );
  CREATE TABLE daily_missions (
    fecha text PRIMARY KEY NOT NULL,
    objetivo integer DEFAULT 3 NOT NULL,
    completados integer DEFAULT 0 NOT NULL,
    reclamada integer DEFAULT 0 NOT NULL,
    xp_bonus integer DEFAULT 10 NOT NULL
  );
  INSERT INTO habits (id, nombre, importancia, tipo, dias_semana, creado_en)
    VALUES ('h1', 'Leer', 3, 'binario', '1,2,3', '2026-01-01T00:00:00.000Z');
  INSERT INTO player (id, xp_total, nivel, actualizado_en) VALUES (1, 400, 7, '2026-01-01T00:00:00.000Z');
  INSERT INTO daily_missions (fecha, objetivo, completados, reclamada) VALUES ('2026-01-10', 1, 1, 1);
  INSERT INTO daily_missions (fecha, objetivo, completados, reclamada) VALUES ('2026-01-11', 1, 0, 0);
`;

describe('migrateDb', () => {
  it('creates the full schema on a fresh database', async () => {
    const db = openDatabaseSync('test');

    await migrateDb(db);

    const tables = await db.getAllAsync<{ name: string }>("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name");
    expect(tables.map((table) => table.name)).toEqual([
      'achievements_unlocked',
      'ai_messages',
      'ai_profile',
      'daily_missions',
      'events',
      'habit_daily_progress',
      'habits',
      'player',
      'player_rewards',
    ]);
    expect(await columnsOf(db, 'daily_missions')).toEqual(expect.arrayContaining(['reclamada_en', 'streak_bonus_reclamado_en']));
    expect(await userVersion(db)).toBe(2);
    expect(await db.getFirstAsync<{ foreign_keys: number }>('PRAGMA foreign_keys')).toEqual({ foreign_keys: 1 });
  });

  it('upgrades a pre-existing database, keeps its data and anchors essence once', async () => {
    const old = openDatabaseSync('test');
    await old.execAsync(OLD_SCHEMA);
    const fresh = openDatabaseSync('test');

    await migrateDb(old);
    await migrateDb(fresh);

    // Converge al mismo esquema que una base nueva.
    for (const table of ['habits', 'player', 'daily_missions', 'events']) {
      expect((await columnsOf(old, table)).sort()).toEqual((await columnsOf(fresh, table)).sort());
    }
    expect(await userVersion(old)).toBe(2);
    expect(await old.getFirstAsync('SELECT nombre, icono, atributos FROM habits')).toEqual({
      nombre: 'Leer',
      icono: 'target',
      atributos: 'voluntad',
    });
    // Ancla: el marcador de esencia de nivel empieza en el nivel que ya tenía, no en 1.
    expect(await old.getFirstAsync('SELECT xp_total, nivel, esencia, nivel_esencia_otorgado FROM player')).toEqual({
      xp_total: 400,
      nivel: 7,
      esencia: 0,
      nivel_esencia_otorgado: 7,
    });
    // v2: el claim antiguo recibe como instante el final de su día local; el no reclamado, nada.
    expect(await old.getAllAsync('SELECT fecha, reclamada_en FROM daily_missions ORDER BY fecha')).toEqual([
      { fecha: '2026-01-10', reclamada_en: toLocalEndOfDay('2026-01-10') },
      { fecha: '2026-01-11', reclamada_en: null },
    ]);

    // Volver a migrar no repite el ancla aunque el nivel haya cambiado.
    await old.execAsync('UPDATE player SET nivel = 9');
    await migrateDb(old);
    expect(await old.getFirstAsync('SELECT nivel_esencia_otorgado FROM player')).toEqual({ nivel_esencia_otorgado: 7 });
  });

  it('re-running the bootstrap on an already-current schema changes nothing', async () => {
    // La base interna existente: tablas ya completas pero user_version 0.
    const db = openDatabaseSync('test');
    await migrateDb(db);
    await db.execAsync("INSERT INTO player (id, nivel, nivel_esencia_otorgado, actualizado_en) VALUES (1, 12, 3, 'x'); PRAGMA user_version = 0;");

    await migrateDb(db);

    expect(await userVersion(db)).toBe(2);
    expect(await db.getFirstAsync('SELECT nivel, nivel_esencia_otorgado FROM player')).toEqual({ nivel: 12, nivel_esencia_otorgado: 3 });
  });

  it('rejects and rolls back when a migration fails', async () => {
    const db = openDatabaseSync('test');
    // Una vista llamada como una tabla del esquema hace fallar de verdad el ALTER de la migración.
    await db.execAsync('CREATE TABLE source (id text); CREATE VIEW habits AS SELECT id FROM source;');

    await expect(migrateDb(db)).rejects.toThrow();

    expect(await userVersion(db)).toBe(0);
    const tables = await db.getAllAsync<{ name: string }>("SELECT name FROM sqlite_master WHERE type = 'table'");
    expect(tables.map((table) => table.name)).toEqual(['source']);
  });
});
