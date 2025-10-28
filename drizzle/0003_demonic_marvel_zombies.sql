CREATE TABLE `generatedStudies` (
	`id` int AUTO_INCREMENT NOT NULL,
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
