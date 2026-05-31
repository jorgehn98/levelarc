CREATE INDEX `events_registrado_en_idx` ON `events` (`registrado_en`);--> statement-breakpoint
CREATE INDEX `events_habit_registrado_idx` ON `events` (`habit_id`,`registrado_en`);--> statement-breakpoint
CREATE INDEX `events_habit_tipo_fecha_idx` ON `events` (`habit_id`,`tipo_evento`,`fecha`);