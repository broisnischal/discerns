-- Full-text index over titles, tags, and unencrypted content. Kept in sync by triggers so
-- the application never has to remember to update it. Env items index title and tags only.
CREATE VIRTUAL TABLE `item_fts` USING fts5(
	`item_id` UNINDEXED,
	`title`,
	`tags`,
	`content`,
	tokenize = 'unicode61 remove_diacritics 2'
);--> statement-breakpoint
INSERT INTO `item_fts` (`item_id`, `title`, `tags`, `content`)
	SELECT `id`, `title`, `tags`, CASE WHEN `encrypted` THEN '' ELSE `content` END FROM `item`;--> statement-breakpoint
CREATE TRIGGER `item_fts_insert` AFTER INSERT ON `item` BEGIN
	INSERT INTO `item_fts` (`item_id`, `title`, `tags`, `content`)
	VALUES (new.`id`, new.`title`, new.`tags`, CASE WHEN new.`encrypted` THEN '' ELSE new.`content` END);
END;--> statement-breakpoint
CREATE TRIGGER `item_fts_update` AFTER UPDATE OF `title`, `tags`, `content`, `encrypted` ON `item` BEGIN
	DELETE FROM `item_fts` WHERE `item_id` = old.`id`;
	INSERT INTO `item_fts` (`item_id`, `title`, `tags`, `content`)
	VALUES (new.`id`, new.`title`, new.`tags`, CASE WHEN new.`encrypted` THEN '' ELSE new.`content` END);
END;--> statement-breakpoint
CREATE TRIGGER `item_fts_delete` AFTER DELETE ON `item` BEGIN
	DELETE FROM `item_fts` WHERE `item_id` = old.`id`;
END;
