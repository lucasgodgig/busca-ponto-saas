ALTER TABLE `users` ADD `memberType` enum('user','member_test') DEFAULT 'member_test' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `testStartedAt` timestamp;--> statement-breakpoint
ALTER TABLE `users` ADD `testExpiresAt` timestamp;