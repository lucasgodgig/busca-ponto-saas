CREATE TABLE `studyUsage` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`month` int NOT NULL,
	`year` int NOT NULL,
	`count` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `studyUsage_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `monthlyStudyLimit` int DEFAULT 10 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `isActive` boolean DEFAULT true NOT NULL;--> statement-breakpoint
CREATE INDEX `user_month_year_idx` ON `studyUsage` (`userId`,`month`,`year`);