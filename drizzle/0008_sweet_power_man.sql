CREATE TABLE `savedLocations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`type` enum('point','polygon') NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`category` enum('concorrente','oportunidade','cliente','fornecedor','outro') NOT NULL DEFAULT 'outro',
	`coordinatesJson` json NOT NULL,
	`metadataJson` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `savedLocations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `userId_idx` ON `savedLocations` (`userId`);--> statement-breakpoint
CREATE INDEX `category_idx` ON `savedLocations` (`category`);