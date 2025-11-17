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
CREATE INDEX `tenantId_idx` ON `studyRequests` (`tenantId`);--> statement-breakpoint
CREATE INDEX `status_idx` ON `studyRequests` (`status`);--> statement-breakpoint
CREATE INDEX `createdBy_idx` ON `studyRequests` (`createdBy`);