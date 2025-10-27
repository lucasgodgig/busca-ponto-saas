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
CREATE TABLE `memberships` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`tenantId` int NOT NULL,
	`role` enum('tenant_admin','member') NOT NULL DEFAULT 'member',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `memberships_id` PRIMARY KEY(`id`)
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
CREATE TABLE `tenants` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`slug` varchar(255) NOT NULL,
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
ALTER TABLE `users` MODIFY COLUMN `role` enum('admin_bp','tenant_admin','member','analyst_bp') NOT NULL DEFAULT 'member';--> statement-breakpoint
ALTER TABLE `users` ADD `image` text;