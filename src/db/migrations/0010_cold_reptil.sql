CREATE TABLE `ai_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`rol` text NOT NULL,
	`contenido` text NOT NULL,
	`fecha` text NOT NULL,
	`creado_en` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `ai_messages_creado_en_idx` ON `ai_messages` (`creado_en`);--> statement-breakpoint
CREATE TABLE `ai_profile` (
	`id` integer PRIMARY KEY DEFAULT 1 NOT NULL,
	`enabled` integer DEFAULT false NOT NULL,
	`engine` text DEFAULT 'template' NOT NULL,
	`model_status` text DEFAULT 'none' NOT NULL,
	`model_path` text,
	`actualizado_en` text NOT NULL
);
