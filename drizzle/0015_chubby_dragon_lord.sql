DROP TABLE `auditLogs`;--> statement-breakpoint
DROP TABLE `billingCustomers`;--> statement-breakpoint
DROP TABLE `commercialPointPhotos`;--> statement-breakpoint
DROP TABLE `commercialPointRequests`;--> statement-breakpoint
DROP TABLE `commercialPoints`;--> statement-breakpoint
DROP TABLE `generatedStudies`;--> statement-breakpoint
DROP TABLE `inviteCodes`;--> statement-breakpoint
DROP TABLE `leads`;--> statement-breakpoint
DROP TABLE `memberships`;--> statement-breakpoint
DROP TABLE `notifications`;--> statement-breakpoint
DROP TABLE `planUsage`;--> statement-breakpoint
DROP TABLE `quickQueries`;--> statement-breakpoint
DROP TABLE `savedLocations`;--> statement-breakpoint
DROP TABLE `studies`;--> statement-breakpoint
DROP TABLE `studyComments`;--> statement-breakpoint
DROP TABLE `studyFiles`;--> statement-breakpoint
DROP TABLE `studyRequests`;--> statement-breakpoint
DROP TABLE `studyUsage`;--> statement-breakpoint
DROP TABLE `tenants`;--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('user','admin') NOT NULL DEFAULT 'user';--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `image`;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `monthlyStudyLimit`;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `isActive`;