ALTER TABLE `commercialPointRequests` MODIFY COLUMN `status` enum('aberto','em_busca','encontrado','cancelado') NOT NULL DEFAULT 'aberto';--> statement-breakpoint
ALTER TABLE `commercialPoints` DROP COLUMN `adminNotes`;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `memberType`;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `testStartedAt`;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `testExpiresAt`;