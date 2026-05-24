ALTER TABLE `daily_missions` ADD `perfect_streak_days` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `daily_missions` ADD `streak_bonus_claimed` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `daily_missions` ADD `streak_bonus_xp` integer DEFAULT 30 NOT NULL;
