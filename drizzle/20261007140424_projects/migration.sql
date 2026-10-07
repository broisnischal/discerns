CREATE TABLE `project` (
	`id` text PRIMARY KEY,
	`owner_id` text NOT NULL,
	`name` text NOT NULL,
	`key` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	CONSTRAINT `fk_project_owner_id_user_id_fk` FOREIGN KEY (`owner_id`) REFERENCES `user`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `project_member` (
	`project_id` text NOT NULL,
	`user_id` text NOT NULL,
	`role` text DEFAULT 'viewer' NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	CONSTRAINT `project_member_pk` PRIMARY KEY(`project_id`, `user_id`),
	CONSTRAINT `fk_project_member_project_id_project_id_fk` FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_project_member_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
ALTER TABLE `item` ADD `project_id` text REFERENCES project(id) ON DELETE SET NULL;--> statement-breakpoint
CREATE INDEX `item_project_idx` ON `item` (`project_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `project_owner_key_idx` ON `project` (`owner_id`,`key`);--> statement-breakpoint
CREATE INDEX `project_member_user_idx` ON `project_member` (`user_id`);