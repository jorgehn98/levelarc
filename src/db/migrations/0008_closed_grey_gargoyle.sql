CREATE TABLE `player_rewards` (
	`id` text PRIMARY KEY NOT NULL,
	`reward_id` text NOT NULL,
	`kind` text NOT NULL,
	`adquirido_en` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `player_rewards_reward_id_unique` ON `player_rewards` (`reward_id`);--> statement-breakpoint
ALTER TABLE `player` ADD `titulo_equipado` text;--> statement-breakpoint
ALTER TABLE `player` ADD `aura_equipada` text DEFAULT 'aura_cyan' NOT NULL;