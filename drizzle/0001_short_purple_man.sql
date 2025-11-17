CREATE TABLE `processedWebhooks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`eventId` varchar(255) NOT NULL,
	`eventType` varchar(100) NOT NULL,
	`processedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `processedWebhooks_id` PRIMARY KEY(`id`),
	CONSTRAINT `processedWebhooks_eventId_unique` UNIQUE(`eventId`)
);
--> statement-breakpoint
CREATE INDEX `eventId_idx` ON `processedWebhooks` (`eventId`);--> statement-breakpoint
CREATE INDEX `eventType_idx` ON `processedWebhooks` (`eventType`);