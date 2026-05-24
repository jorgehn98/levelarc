CREATE TABLE `daily_missions` (
	`fecha` text PRIMARY KEY NOT NULL,
	`objetivo` integer DEFAULT 3 NOT NULL,
	`completados` integer DEFAULT 0 NOT NULL,
	`reclamada` integer DEFAULT false NOT NULL,
	`xp_bonus` integer DEFAULT 10 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `events` (
	`id` text PRIMARY KEY NOT NULL,
	`habit_id` text NOT NULL,
	`fecha` text NOT NULL,
	`tipo_evento` text NOT NULL,
	`xp_delta` integer NOT NULL,
	`registrado_en` text NOT NULL,
	FOREIGN KEY (`habit_id`) REFERENCES `habits`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `habits` (
	`id` text PRIMARY KEY NOT NULL,
	`nombre` text NOT NULL,
	`importancia` integer NOT NULL,
	`tipo` text NOT NULL,
	`meta` integer DEFAULT 1 NOT NULL,
	`dias_semana` text NOT NULL,
	`hora_recordatorio` text,
	`archivado` integer DEFAULT false NOT NULL,
	`creado_en` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `player` (
	`id` integer PRIMARY KEY DEFAULT 1 NOT NULL,
	`xp_total` integer DEFAULT 0 NOT NULL,
	`nivel` integer DEFAULT 1 NOT NULL,
	`rango` text DEFAULT 'E' NOT NULL,
	`racha_misiones` integer DEFAULT 0 NOT NULL,
	`actualizado_en` text NOT NULL
);
