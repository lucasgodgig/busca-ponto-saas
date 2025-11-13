CREATE TABLE `commercialPointPhotos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`pointId` int NOT NULL,
	`url` text NOT NULL,
	`fileKey` text NOT NULL,
	`caption` varchar(255),
	`order` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `commercialPointPhotos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `commercialPointRequests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` int NOT NULL,
	`userId` int NOT NULL,
	`studyId` int,
	`segment` varchar(255) NOT NULL,
	`address` text NOT NULL,
	`lat` varchar(50) NOT NULL,
	`lng` varchar(50) NOT NULL,
	`radiusM` int NOT NULL,
	`requirements` text,
	`status` enum('aberto','em_busca','encontrado','cancelado') NOT NULL DEFAULT 'aberto',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `commercialPointRequests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `commercialPoints` (
	`id` int AUTO_INCREMENT NOT NULL,
	`requestId` int NOT NULL,
	`tenantId` int NOT NULL,
	`address` text NOT NULL,
	`lat` varchar(50) NOT NULL,
	`lng` varchar(50) NOT NULL,
	`propertyType` varchar(100),
	`totalAreaM2` int,
	`usableAreaM2` int,
	`rentalPrice` int,
	`salePrice` int,
	`ownerName` varchar(255),
	`ownerPhone` varchar(20),
	`brokerName` varchar(255),
	`brokerPhone` varchar(20),
	`brokerEmail` varchar(320),
	`description` text,
	`amenitiesJson` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `commercialPoints_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `pointId_idx` ON `commercialPointPhotos` (`pointId`);--> statement-breakpoint
CREATE INDEX `tenantId_idx` ON `commercialPointRequests` (`tenantId`);--> statement-breakpoint
CREATE INDEX `userId_idx` ON `commercialPointRequests` (`userId`);--> statement-breakpoint
CREATE INDEX `status_idx` ON `commercialPointRequests` (`status`);--> statement-breakpoint
CREATE INDEX `requestId_idx` ON `commercialPoints` (`requestId`);--> statement-breakpoint
CREATE INDEX `tenantId_idx` ON `commercialPoints` (`tenantId`);