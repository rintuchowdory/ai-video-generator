CREATE TYPE "public"."audio_sync_mode" AS ENUM('auto', 'manual');--> statement-breakpoint
CREATE TYPE "public"."job_type" AS ENUM('text-to-video', 'text-to-image', 'image-to-video');--> statement-breakpoint
CREATE TYPE "public"."language" AS ENUM('de', 'en');--> statement-breakpoint
CREATE TYPE "public"."media_status" AS ENUM('pending', 'processing', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."project_status" AS ENUM('draft', 'generating', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('user', 'admin');--> statement-breakpoint
CREATE TABLE "assets" (
	"id" serial PRIMARY KEY NOT NULL,
	"projectId" integer NOT NULL,
	"userId" integer NOT NULL,
	"assetKey" varchar(255) NOT NULL,
	"url" text NOT NULL,
	"filename" varchar(255),
	"mimeType" varchar(64),
	"sizeBytes" integer,
	"expiresAt" timestamp with time zone,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "assets_assetKey_unique" UNIQUE("assetKey")
);
--> statement-breakpoint
CREATE TABLE "jobs" (
	"id" serial PRIMARY KEY NOT NULL,
	"projectId" integer NOT NULL,
	"sceneId" integer,
	"jobId" varchar(255) NOT NULL,
	"type" "job_type" NOT NULL,
	"status" "media_status" DEFAULT 'pending' NOT NULL,
	"provider" varchar(64) DEFAULT 'magic-hour' NOT NULL,
	"metadata" jsonb,
	"resultUrl" text,
	"errorMessage" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"completedAt" timestamp with time zone,
	CONSTRAINT "jobs_jobId_unique" UNIQUE("jobId")
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"language" "language" DEFAULT 'de' NOT NULL,
	"topic" text,
	"status" "project_status" DEFAULT 'draft' NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scenes" (
	"id" serial PRIMARY KEY NOT NULL,
	"projectId" integer NOT NULL,
	"sceneNumber" integer NOT NULL,
	"narration" text NOT NULL,
	"visualPrompt" text NOT NULL,
	"durationSeconds" integer DEFAULT 3 NOT NULL,
	"model" varchar(64) DEFAULT 'ltx-2.3' NOT NULL,
	"resolution" varchar(16) DEFAULT '480p' NOT NULL,
	"aspectRatio" varchar(8) DEFAULT '16:9' NOT NULL,
	"generateAudio" boolean DEFAULT false NOT NULL,
	"audioAssetId" integer,
	"audioUrl" text,
	"audioFilename" varchar(255),
	"audioSyncMode" "audio_sync_mode" DEFAULT 'auto' NOT NULL,
	"audioOffsetSeconds" numeric(8, 3) DEFAULT '0' NOT NULL,
	"audioTransitionSeconds" numeric(8, 3) DEFAULT '0.25' NOT NULL,
	"audioStartSeconds" numeric(8, 3) DEFAULT '0' NOT NULL,
	"audioEndSeconds" numeric(8, 3) DEFAULT '0' NOT NULL,
	"videoJobId" varchar(255),
	"videoUrl" text,
	"videoStatus" "media_status" DEFAULT 'pending' NOT NULL,
	"imageJobId" varchar(255),
	"imageUrl" text,
	"imageStatus" "media_status" DEFAULT 'pending' NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"openId" varchar(128) NOT NULL,
	"name" text,
	"email" varchar(320),
	"loginMethod" varchar(64),
	"role" "role" DEFAULT 'user' NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"lastSignedIn" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_openId_unique" UNIQUE("openId")
);
