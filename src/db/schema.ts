import { integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const habits = sqliteTable('habits', {
  id: text('id').primaryKey(),
  nombre: text('nombre').notNull(),
  icono: text('icono').notNull().default('target'),
  atributos: text('atributos').notNull().default('voluntad'),
  importancia: integer('importancia').notNull(),
  tipo: text('tipo', { enum: ['binario', 'contable'] }).notNull(),
  meta: integer('meta').notNull().default(1),
  diasSemana: text('dias_semana').notNull(),
  horaRecordatorio: text('hora_recordatorio'),
  notificationId: text('notification_id'),
  archivado: integer('archivado', { mode: 'boolean' }).notNull().default(false),
  creadoEn: text('creado_en').notNull(),
});

export const events = sqliteTable('events', {
  id: text('id').primaryKey(),
  habitId: text('habit_id')
    .notNull()
    .references(() => habits.id),
  fecha: text('fecha').notNull(),
  tipoEvento: text('tipo_evento', { enum: ['completado', 'fallado'] }).notNull(),
  xpDelta: integer('xp_delta').notNull(),
  attributeDelta: text('attribute_delta').notNull().default('{}'),
  registradoEn: text('registrado_en').notNull(),
});

export const habitDailyProgress = sqliteTable(
  'habit_daily_progress',
  {
    id: text('id').primaryKey(),
    habitId: text('habit_id')
      .notNull()
      .references(() => habits.id),
    fecha: text('fecha').notNull(),
    cantidad: integer('cantidad').notNull().default(0),
    estado: text('estado', { enum: ['pendiente', 'completado', 'fallado'] }).notNull().default('pendiente'),
    actualizadoEn: text('actualizado_en').notNull(),
  },
  (table) => [uniqueIndex('habit_daily_progress_habit_date_idx').on(table.habitId, table.fecha)],
);

export const player = sqliteTable('player', {
  id: integer('id').primaryKey().default(1),
  nombre: text('nombre'),
  xpTotal: integer('xp_total').notNull().default(0),
  nivel: integer('nivel').notNull().default(1),
  rango: text('rango', { enum: ['E', 'D', 'C', 'B', 'A', 'S'] }).notNull().default('E'),
  rachaMisiones: integer('racha_misiones').notNull().default(0),
  atributosXp: text('atributos_xp').notNull().default('{}'),
  actualizadoEn: text('actualizado_en').notNull(),
});

export const dailyMissions = sqliteTable('daily_missions', {
  fecha: text('fecha').primaryKey(),
  objetivo: integer('objetivo').notNull().default(3),
  completados: integer('completados').notNull().default(0),
  reclamada: integer('reclamada', { mode: 'boolean' }).notNull().default(false),
  xpBonus: integer('xp_bonus').notNull().default(10),
});
