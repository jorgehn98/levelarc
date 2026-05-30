CREATE TABLE `achievements_unlocked` (
	`id` text PRIMARY KEY NOT NULL,
	`achievement_id` text NOT NULL,
	`desbloqueado_en` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `achievements_unlocked_achievement_id_unique` ON `achievements_unlocked` (`achievement_id`);