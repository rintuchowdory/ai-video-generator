CREATE TABLE `assets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`userId` int NOT NULL,
	`assetKey` varchar(255) NOT NULL,
	`url` text NOT NULL,
	`filename` varchar(255),
	`mimeType` varchar(64),
	`sizeBytes` int,
	`expiresAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `assets_id` PRIMARY KEY(`id`),
	CONSTRAINT `assets_assetKey_unique` UNIQUE(`assetKey`)
);
--> statement-breakpoint
CREATE TABLE `jobs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`sceneId` int,
	`jobId` varchar(255) NOT NULL,
	`type` enum('text-to-video','text-to-image','image-to-video') NOT NULL,
	`status` enum('pending','processing','completed','failed') NOT NULL DEFAULT 'pending',
	`provider` varchar(64) NOT NULL DEFAULT 'magic-hour',
	`metadata` json,
	`resultUrl` text,
	`errorMessage` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`completedAt` timestamp,
	CONSTRAINT `jobs_id` PRIMARY KEY(`id`),
	CONSTRAINT `jobs_jobId_unique` UNIQUE(`jobId`)
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`language` enum('de','en') NOT NULL DEFAULT 'de',
	`topic` text,
	`status` enum('draft','generating','completed','failed') NOT NULL DEFAULT 'draft',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `projects_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `scenes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`sceneNumber` int NOT NULL,
	`narration` text NOT NULL,
	`visualPrompt` text NOT NULL,
	`durationSeconds` int NOT NULL DEFAULT 3,
	`model` varchar(64) NOT NULL DEFAULT 'ltx-2.3',
	`resolution` varchar(16) NOT NULL DEFAULT '480p',
	`aspectRatio` varchar(8) NOT NULL DEFAULT '16:9',
	`generateAudio` boolean NOT NULL DEFAULT false,
	`videoJobId` varchar(255),
	`videoUrl` text,
	`videoStatus` enum('pending','processing','completed','failed') NOT NULL DEFAULT 'pending',
	`imageJobId` varchar(255),
	`imageUrl` text,
	`imageStatus` enum('pending','processing','completed','failed') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `scenes_id` PRIMARY KEY(`id`)
);
