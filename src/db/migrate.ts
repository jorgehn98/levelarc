import type { SQLiteDatabase } from 'expo-sqlite';

export async function migrateDb(sqlite: SQLiteDatabase) {
  await sqlite.execAsync(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS habits (
      id text PRIMARY KEY NOT NULL,
      nombre text NOT NULL,
      icono text DEFAULT 'target' NOT NULL,
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
      registrado_en text NOT NULL,
      FOREIGN KEY (habit_id) REFERENCES habits(id) ON UPDATE no action ON DELETE no action
    );

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
      actualizado_en text NOT NULL
    );

    CREATE TABLE IF NOT EXISTS daily_missions (
      fecha text PRIMARY KEY NOT NULL,
      objetivo integer DEFAULT 3 NOT NULL,
      completados integer DEFAULT 0 NOT NULL,
      reclamada integer DEFAULT 0 NOT NULL,
      xp_bonus integer DEFAULT 10 NOT NULL
    );
  `);

  try {
    await sqlite.execAsync('ALTER TABLE habits ADD COLUMN notification_id text;');
  } catch {
    // Column already exists in fresh databases and after the first migration.
  }

  try {
    await sqlite.execAsync("ALTER TABLE habits ADD COLUMN icono text DEFAULT 'target' NOT NULL;");
  } catch {
    // Column already exists in fresh databases and after the first migration.
  }

  try {
    await sqlite.execAsync('ALTER TABLE player ADD COLUMN nombre text;');
  } catch {
    // Column already exists in fresh databases and after the first migration.
  }
}
