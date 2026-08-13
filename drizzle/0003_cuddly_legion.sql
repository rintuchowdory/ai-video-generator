ALTER TABLE `scenes` ADD `audioSyncMode` enum('auto','manual') DEFAULT 'auto' NOT NULL;--> statement-breakpoint
ALTER TABLE `scenes` ADD `audioOffsetSeconds` decimal(8,3) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE `scenes` ADD `audioTransitionSeconds` decimal(8,3) DEFAULT '0.25' NOT NULL;--> statement-breakpoint
ALTER TABLE `scenes` ADD `audioStartSeconds` decimal(8,3) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE `scenes` ADD `audioEndSeconds` decimal(8,3) DEFAULT '0' NOT NULL;