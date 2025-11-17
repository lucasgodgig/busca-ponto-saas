CREATE TABLE `auditLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` int,
	`actorId` int,
	`action` varchar(100) NOT NULL,
	`targetType` varchar(100),
	`targetId` int,
	`metaJson` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `auditLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `billingCustomers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` int NOT NULL,
	`stripeCustomerId` varchar(255) NOT NULL,
	`stripeSubscriptionId` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `billingCustomers_id` PRIMARY KEY(`id`),
	CONSTRAINT `billingCustomers_tenantId_unique` UNIQUE(`tenantId`),
	CONSTRAINT `billingCustomers_stripeCustomerId_unique` UNIQUE(`stripeCustomerId`)
);
--> statement-breakpoint
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
	`city` varchar(255) NOT NULL,
	`neighborhoods` text,
	`socialClass` varchar(50),
	`propertySize` int,
	`maxRent` int,
	`requirements` text NOT NULL,
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
CREATE TABLE `generatedStudies` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` int NOT NULL,
	`createdBy` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`segment` varchar(255) NOT NULL,
	`lat` varchar(50) NOT NULL,
	`lng` varchar(50) NOT NULL,
	`radiusM` int NOT NULL,
	`notes` text,
	`status` enum('queued','processing','done','error') NOT NULL DEFAULT 'queued',
	`resultJsonUrl` text,
	`pdfUrl` text,
	`errorMessage` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `generatedStudies_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `inviteCodes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(255) NOT NULL,
	`createdBy` int NOT NULL,
	`usedBy` int,
	`usedAt` timestamp,
	`expiresAt` timestamp,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `inviteCodes_id` PRIMARY KEY(`id`),
	CONSTRAINT `inviteCodes_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `leads` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nome` varchar(255) NOT NULL,
	`email` varchar(320) NOT NULL,
	`telefone` varchar(20),
	`empresa` varchar(255),
	`cargo` varchar(255),
	`userId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `leads_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `memberships` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`tenantId` int NOT NULL,
	`role` enum('tenant_admin','analyst','member') NOT NULL DEFAULT 'member',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `memberships_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`content` text NOT NULL,
	`type` enum('study_ready','study_rejected','system','other') NOT NULL DEFAULT 'other',
	`relatedStudyRequestId` int,
	`isRead` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `planUsage` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` int NOT NULL,
	`periodStart` timestamp NOT NULL,
	`periodEnd` timestamp NOT NULL,
	`quickQueriesUsed` int NOT NULL DEFAULT 0,
	`studiesOpened` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `planUsage_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `quickQueries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` int NOT NULL,
	`userId` int NOT NULL,
	`lat` varchar(50) NOT NULL,
	`lng` varchar(50) NOT NULL,
	`radiusM` int NOT NULL,
	`layersEnabledJson` json NOT NULL,
	`resultSummaryJson` json,
	`costUnits` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `quickQueries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
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
CREATE TABLE `studies` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`segment` varchar(255) NOT NULL,
	`address` text NOT NULL,
	`lat` varchar(50) NOT NULL,
	`lng` varchar(50) NOT NULL,
	`radiusM` int NOT NULL,
	`objectives` text,
	`status` enum('aberto','em_analise','devolvido','concluido') NOT NULL DEFAULT 'aberto',
	`priority` enum('baixa','media','alta') NOT NULL DEFAULT 'media',
	`dueAt` timestamp,
	`createdBy` int NOT NULL,
	`assignedBpUserId` int,
	`finalReportJson` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `studies_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `studyComments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`studyId` int NOT NULL,
	`authorId` int NOT NULL,
	`body` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `studyComments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `studyFiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`studyId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`type` varchar(50) NOT NULL,
	`url` text NOT NULL,
	`fileKey` text NOT NULL,
	`uploadedBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `studyFiles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `studyRequests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` int NOT NULL,
	`createdBy` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`segment` varchar(255),
	`address` text NOT NULL,
	`lat` varchar(50),
	`lng` varchar(50),
	`radiusM` int,
	`description` text,
	`objectives` text,
	`status` enum('pendente','em_analise','concluido','cancelado') NOT NULL DEFAULT 'pendente',
	`priority` enum('baixa','media','alta') NOT NULL DEFAULT 'media',
	`assignedTo` int,
	`pdfUrl` text,
	`pdfFileKey` text,
	`adminNotes` text,
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `studyRequests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
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
CREATE TABLE `tenants` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`slug` varchar(255) NOT NULL,
	`segment` varchar(100),
	`logoUrl` text,
	`colorPrimary` varchar(7) DEFAULT '#0F172A',
	`colorDark` varchar(7) DEFAULT '#020617',
	`plan` enum('start','essencial','pro') NOT NULL DEFAULT 'start',
	`limitsJson` json NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tenants_id` PRIMARY KEY(`id`),
	CONSTRAINT `tenants_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`openId` varchar(64) NOT NULL,
	`name` text,
	`email` varchar(320),
	`loginMethod` varchar(64),
	`role` enum('admin_bp','tenant_admin','member','analyst_bp') NOT NULL DEFAULT 'member',
	`image` text,
	`monthlyStudyLimit` int NOT NULL DEFAULT 10,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_openId_unique` UNIQUE(`openId`)
);
--> statement-breakpoint
CREATE INDEX `pointId_idx` ON `commercialPointPhotos` (`pointId`);--> statement-breakpoint
CREATE INDEX `tenantId_idx` ON `commercialPointRequests` (`tenantId`);--> statement-breakpoint
CREATE INDEX `userId_idx` ON `commercialPointRequests` (`userId`);--> statement-breakpoint
CREATE INDEX `status_idx` ON `commercialPointRequests` (`status`);--> statement-breakpoint
CREATE INDEX `city_idx` ON `commercialPointRequests` (`city`);--> statement-breakpoint
CREATE INDEX `requestId_idx` ON `commercialPoints` (`requestId`);--> statement-breakpoint
CREATE INDEX `tenantId_idx` ON `commercialPoints` (`tenantId`);--> statement-breakpoint
CREATE INDEX `userId_idx` ON `memberships` (`userId`);--> statement-breakpoint
CREATE INDEX `tenantId_idx` ON `memberships` (`tenantId`);--> statement-breakpoint
CREATE INDEX `user_id_idx` ON `notifications` (`userId`);--> statement-breakpoint
CREATE INDEX `type_idx` ON `notifications` (`type`);--> statement-breakpoint
CREATE INDEX `userId_idx` ON `savedLocations` (`userId`);--> statement-breakpoint
CREATE INDEX `category_idx` ON `savedLocations` (`category`);--> statement-breakpoint
CREATE INDEX `tenantId_idx` ON `studies` (`tenantId`);--> statement-breakpoint
CREATE INDEX `status_idx` ON `studies` (`status`);--> statement-breakpoint
CREATE INDEX `createdBy_idx` ON `studies` (`createdBy`);--> statement-breakpoint
CREATE INDEX `tenantId_idx` ON `studyRequests` (`tenantId`);--> statement-breakpoint
CREATE INDEX `status_idx` ON `studyRequests` (`status`);--> statement-breakpoint
CREATE INDEX `createdBy_idx` ON `studyRequests` (`createdBy`);--> statement-breakpoint
CREATE INDEX `user_month_year_idx` ON `studyUsage` (`userId`,`month`,`year`);