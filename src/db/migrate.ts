import type { SQLiteDatabase } from 'expo-sqlite';

import { toLocalEndOfDay } from '@/lib/date';

// Única fuente del esquema. Migraciones versionadas sobre `PRAGMA user_version`:
//
// - MIGRATIONS[n] lleva la base de la versión n a la n + 1 y corre dentro de una transacción junto
//   con el cambio de user_version, así que una migración se aplica entera o no se aplica.
// - Un cambio de esquema se añade SIEMPRE como una migración nueva al final de la lista. Las ya
//   publicadas no se editan: hay bases instaladas que ya las ejecutaron.
// - Un fallo real rechaza la promesa; la app no debe arrancar sobre un esquema a medias.
//
// La versión 1 es el arranque histórico (cuando no había user_version) hecho idempotente: una base
// nueva y una base ya instalada en versión 0 convergen al mismo esquema.
const MIGRATIONS: ((sqlite: SQLiteDatabase) => Promise<void>)[] = [bootstrapSchema, addMissionClaimTimestamps];

export async function migrateDb(sqlite: SQLiteDatabase) {
  // Por conexión y sin efecto dentro de una transacción: va antes de migrar. El repositorio usa
  // siempre esta misma conexión.
  await sqlite.execAsync('PRAGMA foreign_keys = ON;');

  const row = await sqlite.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  for (let version = row?.user_version ?? 0; version < MIGRATIONS.length; version += 1) {
    await sqlite.withTransactionAsync(async () => {
      await MIGRATIONS[version](sqlite);
      await sqlite.execAsync(`PRAGMA user_version = ${version + 1}`);
    });
  }
}

// Añade la columna solo si falta, mirando el esquema real en vez de tragarse el error del ALTER
// (que escondía cualquier otro fallo). Devuelve true si la añadió.
async function addColumnIfMissing(sqlite: SQLiteDatabase, table: string, column: string, ddl: string) {
  const columns = await sqlite.getAllAsync<{ name: string }>(`PRAGMA table_info(${table})`);
  if (columns.some((info) => info.name === column)) return false;
  await sqlite.execAsync(`ALTER TABLE ${table} ADD COLUMN ${column} ${ddl}`);
  return true;
}

async function bootstrapSchema(sqlite: SQLiteDatabase) {
  await sqlite.execAsync(`
    CREATE TABLE IF NOT EXISTS habits (
      id text PRIMARY KEY NOT NULL,
      nombre text NOT NULL,
      icono text DEFAULT 'target' NOT NULL,
      atributos text DEFAULT 'voluntad' NOT NULL,
      importancia integer NOT NULL,
      tipo text NOT NULL,
      meta integer DEFAULT 1 NOT NULL,
      dias_semana text NOT NULL,
      hora_recordatorio text,
      notification_id text,
      archivado integer DEFAULT 0 NOT NULL,
      creado_en text NOT NULL
    );

    CREATE TABLE IF NOT EXISTS events (
      id text PRIMARY KEY NOT NULL,
      habit_id text NOT NULL,
      fecha text NOT NULL,
      tipo_evento text NOT NULL,
      xp_delta integer NOT NULL,
      attribute_delta text DEFAULT '{}' NOT NULL,
      esencia_otorgada integer DEFAULT 0 NOT NULL,
      registrado_en text NOT NULL,
      FOREIGN KEY (habit_id) REFERENCES habits(id) ON UPDATE no action ON DELETE no action
    );

    CREATE INDEX IF NOT EXISTS events_registrado_en_idx
      ON events (registrado_en);

    CREATE INDEX IF NOT EXISTS events_habit_registrado_idx
      ON events (habit_id, registrado_en);

    CREATE INDEX IF NOT EXISTS events_habit_tipo_fecha_idx
      ON events (habit_id, tipo_evento, fecha);

    CREATE TABLE IF NOT EXISTS habit_daily_progress (
      id text PRIMARY KEY NOT NULL,
      habit_id text NOT NULL,
      fecha text NOT NULL,
      cantidad integer DEFAULT 0 NOT NULL,
      estado text DEFAULT 'pendiente' NOT NULL,
      actualizado_en text NOT NULL,
      FOREIGN KEY (habit_id) REFERENCES habits(id) ON UPDATE no action ON DELETE no action
    );

    CREATE UNIQUE INDEX IF NOT EXISTS habit_daily_progress_habit_date_idx
      ON habit_daily_progress (habit_id, fecha);

    CREATE TABLE IF NOT EXISTS player (
      id integer PRIMARY KEY DEFAULT 1 NOT NULL,
      nombre text,
      xp_total integer DEFAULT 0 NOT NULL,
      nivel integer DEFAULT 1 NOT NULL,
      rango text DEFAULT 'E' NOT NULL,
      racha_misiones integer DEFAULT 0 NOT NULL,
      atributos_xp text DEFAULT '{}' NOT NULL,
      esencia integer DEFAULT 0 NOT NULL,
      nivel_esencia_otorgado integer DEFAULT 1 NOT NULL,
      titulo_equipado text,
      aura_equipada text DEFAULT 'aura_cyan' NOT NULL,
      actualizado_en text NOT NULL
    );

    CREATE TABLE IF NOT EXISTS player_rewards (
      id text PRIMARY KEY NOT NULL,
      reward_id text NOT NULL,
      kind text NOT NULL,
      adquirido_en text NOT NULL
    );

    CREATE UNIQUE INDEX IF NOT EXISTS player_rewards_reward_id_unique
      ON player_rewards (reward_id);

    CREATE TABLE IF NOT EXISTS daily_missions (
      fecha text PRIMARY KEY NOT NULL,
      objetivo integer DEFAULT 3 NOT NULL,
      completados integer DEFAULT 0 NOT NULL,
      reclamada integer DEFAULT 0 NOT NULL,
      xp_bonus integer DEFAULT 10 NOT NULL,
      perfect_streak_days integer DEFAULT 0 NOT NULL,
      streak_bonus_claimed integer DEFAULT 0 NOT NULL,
      streak_bonus_xp integer DEFAULT 30 NOT NULL,
      esencia_otorgada integer DEFAULT 0 NOT NULL
    );

    CREATE TABLE IF NOT EXISTS achievements_unlocked (
      id text PRIMARY KEY NOT NULL,
      achievement_id text NOT NULL,
      desbloqueado_en text NOT NULL
    );

    CREATE UNIQUE INDEX IF NOT EXISTS achievements_unlocked_achievement_id_unique
      ON achievements_unlocked (achievement_id);

    CREATE TABLE IF NOT EXISTS ai_profile (
      id integer PRIMARY KEY DEFAULT 1 NOT NULL,
      enabled integer DEFAULT 0 NOT NULL,
      engine text DEFAULT 'template' NOT NULL,
      model_status text DEFAULT 'none' NOT NULL,
      model_path text,
      actualizado_en text NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ai_messages (
      id text PRIMARY KEY NOT NULL,
      rol text NOT NULL,
      contenido text NOT NULL,
      fecha text NOT NULL,
      creado_en text NOT NULL
    );

    CREATE INDEX IF NOT EXISTS ai_messages_creado_en_idx
      ON ai_messages (creado_en);
  `);

  // Columnas que se fueron añadiendo a tablas ya creadas en instalaciones antiguas.
  await addColumnIfMissing(sqlite, 'habits', 'notification_id', 'text');
  await addColumnIfMissing(sqlite, 'habits', 'icono', "text DEFAULT 'target' NOT NULL");
  await addColumnIfMissing(sqlite, 'habits', 'atributos', "text DEFAULT 'voluntad' NOT NULL");
  await addColumnIfMissing(sqlite, 'events', 'attribute_delta', "text DEFAULT '{}' NOT NULL");
  await addColumnIfMissing(sqlite, 'events', 'esencia_otorgada', 'integer DEFAULT 0 NOT NULL');
  await addColumnIfMissing(sqlite, 'player', 'nombre', 'text');
  await addColumnIfMissing(sqlite, 'player', 'atributos_xp', "text DEFAULT '{}' NOT NULL");
  await addColumnIfMissing(sqlite, 'player', 'esencia', 'integer DEFAULT 0 NOT NULL');
  if (await addColumnIfMissing(sqlite, 'player', 'nivel_esencia_otorgado', 'integer DEFAULT 1 NOT NULL')) {
    // Solo al añadir la columna a una base existente: anclamos el marcador al nivel actual para que
    // la economía empiece a contar desde ahora y no regale esencia retroactiva por niveles ya
    // alcanzados. Va en la misma transacción que el ALTER, así que no puede quedar a medias ni
    // repetirse.
    await sqlite.execAsync('UPDATE player SET nivel_esencia_otorgado = nivel');
  }
  await addColumnIfMissing(sqlite, 'player', 'titulo_equipado', 'text');
  await addColumnIfMissing(sqlite, 'player', 'aura_equipada', "text DEFAULT 'aura_cyan' NOT NULL");
  await addColumnIfMissing(sqlite, 'daily_missions', 'perfect_streak_days', 'integer DEFAULT 0 NOT NULL');
  await addColumnIfMissing(sqlite, 'daily_missions', 'streak_bonus_claimed', 'integer DEFAULT 0 NOT NULL');
  await addColumnIfMissing(sqlite, 'daily_missions', 'streak_bonus_xp', 'integer DEFAULT 30 NOT NULL');
  await addColumnIfMissing(sqlite, 'daily_missions', 'esencia_otorgada', 'integer DEFAULT 0 NOT NULL');
}

// v2: instante real de cada claim, para ordenar los bonus de misión dentro del ledger. Los claims
// anteriores no lo guardaron; se rellenan con el final del día LOCAL de su fecha.
async function addMissionClaimTimestamps(sqlite: SQLiteDatabase) {
  await addColumnIfMissing(sqlite, 'daily_missions', 'reclamada_en', 'text');
  await addColumnIfMissing(sqlite, 'daily_missions', 'streak_bonus_reclamado_en', 'text');

  const claimed = await sqlite.getAllAsync<{ fecha: string }>(
    'SELECT fecha FROM daily_missions WHERE reclamada = 1 OR streak_bonus_claimed = 1',
  );
  for (const { fecha } of claimed) {
    const endOfDay = toLocalEndOfDay(fecha);
    await sqlite.runAsync(
      `
        UPDATE daily_missions
        SET reclamada_en = CASE WHEN reclamada = 1 THEN COALESCE(reclamada_en, ?) END,
            streak_bonus_reclamado_en = CASE WHEN streak_bonus_claimed = 1 THEN COALESCE(streak_bonus_reclamado_en, ?) END
        WHERE fecha = ?
      `,
      [endOfDay, endOfDay, fecha],
    );
  }
}
