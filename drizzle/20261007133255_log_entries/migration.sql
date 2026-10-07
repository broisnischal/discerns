CREATE TABLE `log_entry` (
	`id` text PRIMARY KEY,
	`item_id` text NOT NULL,
	`seq` integer NOT NULL,
	`body` text NOT NULL,
	`author_id` text,
	`source` text DEFAULT 'web' NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	CONSTRAINT `fk_log_entry_item_id_item_id_fk` FOREIGN KEY (`item_id`) REFERENCES `item`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_log_entry_author_id_user_id_fk` FOREIGN KEY (`author_id`) REFERENCES `user`(`id`) ON DELETE SET NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `log_entry_item_seq_idx` ON `log_entry` (`item_id`,`seq`);