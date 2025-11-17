ALTER TABLE `commercialPoints` ADD `isOption` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `commercialPoints` ADD `status` enum('pendente','aprovado','rejeitado') DEFAULT 'pendente' NOT NULL;--> statement-breakpoint
CREATE INDEX `status_idx` ON `commercialPoints` (`status`);