CREATE TABLE `assistant_answers` (
	`id` text PRIMARY KEY,
	`actor_id` text NOT NULL,
	`role` text NOT NULL,
	`question` text NOT NULL,
	`status` text NOT NULL,
	`model` text NOT NULL,
	`answer_json` text,
	`error` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	CONSTRAINT "assistant_status_valid" CHECK("status" in ('pending','completed','error'))
);
--> statement-breakpoint
CREATE INDEX `idx_assistant_actor_role_created` ON `assistant_answers` (`actor_id`,`role`,`created_at`);