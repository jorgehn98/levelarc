CREATE TABLE `habit_daily_progress` (
	`id` text PRIMARY KEY NOT NULL,
	`habit_id` text NOT NULL,
	`fecha` text NOT NULL,
	`cantidad` integer DEFAULT 0 NOT NULL,
	`estado` text DEFAULT 'pendiente' NOT NULL,
	`actualizado_en` text NOT NULL,
	FOREIGN KEY (`habit_id`) REFERENCES `habits`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `habit_daily_progress_habit_date_idx` ON `habit_daily_progress` (`habit_id`,`fecha`);