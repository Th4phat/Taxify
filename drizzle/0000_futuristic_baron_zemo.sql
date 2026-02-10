CREATE TABLE `app_settings` (
	`id` text PRIMARY KEY DEFAULT 'main' NOT NULL,
	`is_encrypted` integer DEFAULT false,
	`encryption_key_id` text,
	`language` text DEFAULT 'th',
	`currency` text DEFAULT 'THB',
	`date_format` text DEFAULT 'DD/MM/YYYY',
	`theme_mode` text DEFAULT 'system',
	`daily_reminder_enabled` integer DEFAULT false,
	`dailyReminderTime` text DEFAULT '20:00',
	`tax_deadline_reminder` integer DEFAULT true,
	`default_tax_year` integer
);
--> statement-breakpoint
CREATE TABLE `categories` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`name_th` text,
	`type` text NOT NULL,
	`icon` text NOT NULL,
	`color` text NOT NULL,
	`default_section_40` integer,
	`is_system` integer DEFAULT false,
	`display_order` integer DEFAULT 0,
	`is_active` integer DEFAULT true
);
--> statement-breakpoint
CREATE TABLE `receipt_cache` (
	`id` text PRIMARY KEY NOT NULL,
	`image_uri` text NOT NULL,
	`processed_text` text,
	`merchant_name` text,
	`total_amount` real,
	`transaction_date` integer,
	`confidence` real,
	`is_processed` integer DEFAULT false,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sub_categories` (
	`id` text PRIMARY KEY NOT NULL,
	`category_id` text NOT NULL,
	`name` text NOT NULL,
	`name_th` text,
	`is_active` integer DEFAULT true,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `tax_profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`full_name` text,
	`tax_id` text,
	`tax_year` integer NOT NULL,
	`has_section_40_1` integer DEFAULT false,
	`has_section_40_2` integer DEFAULT false,
	`has_section_40_3` integer DEFAULT false,
	`has_section_40_4` integer DEFAULT false,
	`has_section_40_5` integer DEFAULT false,
	`has_section_40_6` integer DEFAULT false,
	`has_section_40_7` integer DEFAULT false,
	`has_section_40_8` integer DEFAULT false,
	`personal_allowance` real DEFAULT 60000,
	`spouse_allowance` real DEFAULT 0,
	`child_allowance` real DEFAULT 0,
	`parent_allowance` real DEFAULT 0,
	`disability_allowance` real DEFAULT 0,
	`life_insurance` real DEFAULT 0,
	`health_insurance` real DEFAULT 0,
	`pension_insurance` real DEFAULT 0,
	`rmf` real DEFAULT 0,
	`ssf` real DEFAULT 0,
	`social_security` real DEFAULT 0,
	`home_loan_interest` real DEFAULT 0,
	`donation` real DEFAULT 0,
	`estimated_tax` real,
	`last_calculated_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `tax_profile_year_idx` ON `tax_profiles` (`tax_year`);--> statement-breakpoint
CREATE TABLE `transactions` (
	`id` text PRIMARY KEY NOT NULL,
	`amount` real NOT NULL,
	`type` text NOT NULL,
	`category_id` text NOT NULL,
	`sub_category_id` text,
	`section_40_type` integer,
	`is_tax_deductible` integer DEFAULT false,
	`deductible_amount` real,
	`receipt_image_uri` text,
	`ocr_raw_text` text,
	`ocr_confidence` real,
	`description` text,
	`transaction_date` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`sync_status` text DEFAULT 'pending',
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`sub_category_id`) REFERENCES `sub_categories`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `transaction_date_idx` ON `transactions` (`transaction_date`);--> statement-breakpoint
CREATE INDEX `transaction_type_idx` ON `transactions` (`type`);--> statement-breakpoint
CREATE INDEX `transaction_category_idx` ON `transactions` (`category_id`);--> statement-breakpoint
CREATE INDEX `transaction_section40_idx` ON `transactions` (`section_40_type`);