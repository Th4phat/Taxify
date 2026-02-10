-- Create recurring transactions table
CREATE TABLE `recurring_transactions` (
	`id` text PRIMARY KEY NOT NULL,
	`amount` real NOT NULL,
	`type` text NOT NULL,
	`category_id` text NOT NULL,
	`sub_category_id` text,
	`frequency` text NOT NULL,
	`start_date` integer NOT NULL,
	`end_date` integer,
	`next_due_date` integer NOT NULL,
	`section_40_type` integer,
	`is_tax_deductible` integer DEFAULT false,
	`deductible_amount` real,
	`description` text,
	`is_active` integer DEFAULT true,
	`last_generated_date` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`sub_category_id`) REFERENCES `sub_categories`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `recurring_next_due_idx` ON `recurring_transactions` (`next_due_date`);--> statement-breakpoint
CREATE INDEX `recurring_active_idx` ON `recurring_transactions` (`is_active`);--> statement-breakpoint
CREATE INDEX `recurring_category_idx` ON `recurring_transactions` (`category_id`);
