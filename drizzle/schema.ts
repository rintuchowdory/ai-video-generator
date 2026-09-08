import {
  boolean,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", ["user", "admin"]);
export const languageEnum = pgEnum("language", ["de", "en"]);
export const projectStatusEnum = pgEnum("project_status", ["draft", "generating", "completed", "failed"]);
export const audioSyncModeEnum = pgEnum("audio_sync_mode", ["auto", "manual"]);
export const mediaStatusEnum = pgEnum("media_status", ["pending", "processing", "completed", "failed"]);
export const jobTypeEnum = pgEnum("job_type", ["text-to-video", "text-to-image", "image-to-video"]);

/**
 * Core user identity table. Anonymous browser workspaces use openId values in
 * the form guest:<uuid>; no OAuth account is required.
 */
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("openId", { length: 128 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: roleEnum("role").default("user").notNull(),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().$onUpdate(() => new Date()).notNull(),
  lastSignedIn: timestamp("lastSignedIn", { withTimezone: true }).defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  language: languageEnum("language").default("de").notNull(),
  topic: text("topic"),
  status: projectStatusEnum("status").default("draft").notNull(),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().$onUpdate(() => new Date()).notNull(),
});

export type Project = typeof projects.$inferSelect;
export type InsertProject = typeof projects.$inferInsert;

export const scenes = pgTable("scenes", {
  id: serial("id").primaryKey(),
  projectId: integer("projectId").notNull(),
  sceneNumber: integer("sceneNumber").notNull(),
  narration: text("narration").notNull(),
  visualPrompt: text("visualPrompt").notNull(),
  durationSeconds: integer("durationSeconds").default(3).notNull(),
  model: varchar("model", { length: 64 }).default("ltx-2.3").notNull(),
  resolution: varchar("resolution", { length: 16 }).default("480p").notNull(),
  aspectRatio: varchar("aspectRatio", { length: 8 }).default("16:9").notNull(),
  generateAudio: boolean("generateAudio").default(false).notNull(),
  audioAssetId: integer("audioAssetId"),
  audioUrl: text("audioUrl"),
  audioFilename: varchar("audioFilename", { length: 255 }),
  audioSyncMode: audioSyncModeEnum("audioSyncMode").default("auto").notNull(),
  audioOffsetSeconds: numeric("audioOffsetSeconds", { precision: 8, scale: 3 }).default("0").notNull(),
  audioTransitionSeconds: numeric("audioTransitionSeconds", { precision: 8, scale: 3 }).default("0.25").notNull(),
  audioStartSeconds: numeric("audioStartSeconds", { precision: 8, scale: 3 }).default("0").notNull(),
  audioEndSeconds: numeric("audioEndSeconds", { precision: 8, scale: 3 }).default("0").notNull(),
  videoJobId: varchar("videoJobId", { length: 255 }),
  videoUrl: text("videoUrl"),
  videoStatus: mediaStatusEnum("videoStatus").default("pending").notNull(),
  imageJobId: varchar("imageJobId", { length: 255 }),
  imageUrl: text("imageUrl"),
  imageStatus: mediaStatusEnum("imageStatus").default("pending").notNull(),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().$onUpdate(() => new Date()).notNull(),
});

export type Scene = typeof scenes.$inferSelect;
export type InsertScene = typeof scenes.$inferInsert;

export const jobs = pgTable("jobs", {
  id: serial("id").primaryKey(),
  projectId: integer("projectId").notNull(),
  sceneId: integer("sceneId"),
  jobId: varchar("jobId", { length: 255 }).notNull().unique(),
  type: jobTypeEnum("type").notNull(),
  status: mediaStatusEnum("status").default("pending").notNull(),
  provider: varchar("provider", { length: 64 }).default("magic-hour").notNull(),
  metadata: jsonb("metadata"),
  resultUrl: text("resultUrl"),
  errorMessage: text("errorMessage"),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().$onUpdate(() => new Date()).notNull(),
  completedAt: timestamp("completedAt", { withTimezone: true }),
});

export type Job = typeof jobs.$inferSelect;
export type InsertJob = typeof jobs.$inferInsert;

export const assets = pgTable("assets", {
  id: serial("id").primaryKey(),
  projectId: integer("projectId").notNull(),
  userId: integer("userId").notNull(),
  assetKey: varchar("assetKey", { length: 255 }).notNull().unique(),
  url: text("url").notNull(),
  filename: varchar("filename", { length: 255 }),
  mimeType: varchar("mimeType", { length: 64 }),
  sizeBytes: integer("sizeBytes"),
  expiresAt: timestamp("expiresAt", { withTimezone: true }),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
});

export type Asset = typeof assets.$inferSelect;
export type InsertAsset = typeof assets.$inferInsert;
