CREATE TABLE `audit_events` (
	`id` text PRIMARY KEY,
	`expense_id` text NOT NULL,
	`event_type` text NOT NULL,
	`actor_id` text NOT NULL,
	`actor_name` text NOT NULL,
	`note` text NOT NULL,
	`created_at` text NOT NULL,
	CONSTRAINT `fk_audit_events_expense_id_expenses_id_fk` FOREIGN KEY (`expense_id`) REFERENCES `expenses`(`id`),
	CONSTRAINT "audit_events_id_not_null" CHECK("id" is not null)
);
--> statement-breakpoint
CREATE TABLE `expenses` (
	`id` text PRIMARY KEY,
	`merchant` text NOT NULL,
	`expense_date` text NOT NULL,
	`amount_minor` integer NOT NULL,
	`currency` text NOT NULL,
	`category` text NOT NULL,
	`memo` text NOT NULL,
	`receipt_key` text,
	`receipt_name` text,
	`submitter_id` text NOT NULL,
	`submitter_name` text NOT NULL,
	`status` text NOT NULL,
	`over_limit` integer NOT NULL,
	`approver_id` text,
	`approver_name` text,
	`reimbursement_date` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	CONSTRAINT "expenses_id_not_null" CHECK("id" is not null),
	CONSTRAINT "expenses_amount_positive" CHECK("amount_minor" > 0),
	CONSTRAINT "expenses_status_valid" CHECK("status" in ('draft','submitted','approved','rejected','scheduled','paid')),
	CONSTRAINT "expenses_over_limit_boolean" CHECK("over_limit" in (0, 1))
);
--> statement-breakpoint
CREATE INDEX `idx_audit_expense_created` ON `audit_events` (`expense_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_expenses_status_updated` ON `expenses` (`status`,`updated_at`);