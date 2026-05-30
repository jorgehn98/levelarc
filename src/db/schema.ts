import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

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
  esenciaOtorgada: integer('esencia_otorgada').notNull().default(0),
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
  esencia: integer('esencia').notNull().default(0),
  nivelEsenciaOtorgado: integer('nivel_esencia_otorgado').notNull().default(1),
  tituloEquipado: text('titulo_equipado'),
  auraEquipada: text('aura_equipada').notNull().default('aura_cyan'),
  actualizadoEn: text('actualizado_en').notNull(),
});

export const playerRewards = sqliteTable('player_rewards', {
  id: text('id').primaryKey(),
  rewardId: text('reward_id').notNull().unique(),
  kind: text('kind').notNull(),
  adquiridoEn: text('adquirido_en').notNull(),
});

export const achievementsUnlocked = sqliteTable('achievements_unlocked', {
  id: text('id').primaryKey(),
  achievementId: text('achievement_id').notNull().unique(),
  desbloqueadoEn: text('desbloqueado_en').notNull(),
});

export const dailyMissions = sqliteTable('daily_missions', {
  fecha: text('fecha').primaryKey(),
  objetivo: integer('objetivo').notNull().default(3),
  completados: integer('completados').notNull().default(0),
  reclamada: integer('reclamada', { mode: 'boolean' }).notNull().default(false),
  xpBonus: integer('xp_bonus').notNull().default(10),
  perfectStreakDays: integer('perfect_streak_days').notNull().default(0),
  streakBonusClaimed: integer('streak_bonus_claimed', { mode: 'boolean' }).notNull().default(false),
  streakBonusXp: integer('streak_bonus_xp').notNull().default(30),
  esenciaOtorgada: integer('esencia_otorgada').notNull().default(0),
});

// Singleton (id = 1) con la configuración del Chat con el Sistema. `engine` selecciona el motor
// activo ('template' = reglas por plantillas, siempre disponible; 'llama' = LLM local, pendiente de
// build nativo). `modelStatus`/`modelPath` describen el estado del modelo del LLM (sin uso real en 5A).
export const aiProfile = sqliteTable('ai_profile', {
  id: integer('id').primaryKey().default(1),
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(false),
  engine: text('engine', { enum: ['template', 'llama'] }).notNull().default('template'),
  modelStatus: text('model_status', { enum: ['none', 'downloading', 'ready', 'error'] }).notNull().default('none'),
  modelPath: text('model_path'),
  actualizadoEn: text('actualizado_en').notNull(),
});

// Historial de mensajes del Chat con el Sistema. El texto se guarda ya resuelto al idioma en que se
// generó (el motor/core nunca traduce; el store resuelve con i18n antes de persistir).
export const aiMessages = sqliteTable(
  'ai_messages',
  {
    id: text('id').primaryKey(),
    rol: text('rol', { enum: ['system', 'user', 'assistant'] }).notNull(),
    contenido: text('contenido').notNull(),
    fecha: text('fecha').notNull(),
    creadoEn: text('creado_en').notNull(),
  },
  (table) => [index('ai_messages_creado_en_idx').on(table.creadoEn)],
);
