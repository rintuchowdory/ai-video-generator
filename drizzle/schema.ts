import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  json,
  decimal,
  boolean,
} from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Projects table: stores user projects with metadata
 */
export const projects = mysqlTable("projects", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  language: mysqlEnum("language", ["de", "en"]).default("de").notNull(),
  topic: text("topic"),
  status: mysqlEnum("status", ["draft", "generating", "completed", "failed"]).default("draft").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Project = typeof projects.$inferSelect;
export type InsertProject = typeof projects.$inferInsert;

/**
 * Scenes table: stores individual scenes within a project
 */
export const scenes = mysqlTable("scenes", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  sceneNumber: int("sceneNumber").notNull(),
  narration: text("narration").notNull(),
  visualPrompt: text("visualPrompt").notNull(),
  durationSeconds: int("durationSeconds").default(3).notNull(),
  model: varchar("model", { length: 64 }).default("ltx-2.3").notNull(),
  resolution: varchar("resolution", { length: 16 }).default("480p").notNull(),
  aspectRatio: varchar("aspectRatio", { length: 8 }).default("16:9").notNull(),
  generateAudio: boolean("generateAudio").default(false).notNull(),
  audioAssetId: int("audioAssetId"),
  audioUrl: text("audioUrl"),
  audioFilename: varchar("audioFilename", { length: 255 }),
  audioSyncMode: mysqlEnum("audioSyncMode", ["auto", "manual"]).default("auto").notNull(),
  audioOffsetSeconds: decimal("audioOffsetSeconds", { precision: 8, scale: 3 }).default("0").notNull(),
  audioTransitionSeconds: decimal("audioTransitionSeconds", { precision: 8, scale: 3 }).default("0.25").notNull(),
  audioStartSeconds: decimal("audioStartSeconds", { precision: 8, scale: 3 }).default("0").notNull(),
  audioEndSeconds: decimal("audioEndSeconds", { precision: 8, scale: 3 }).default("0").notNull(),
  videoJobId: varchar("videoJobId", { length: 255 }),
  videoUrl: text("videoUrl"),
  videoStatus: mysqlEnum("videoStatus", ["pending", "processing", "completed", "failed"]).default("pending").notNull(),
  imageJobId: varchar("imageJobId", { length: 255 }),
  imageUrl: text("imageUrl"),
  imageStatus: mysqlEnum("imageStatus", ["pending", "processing", "completed", "failed"]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Scene = typeof scenes.$inferSelect;
export type InsertScene = typeof scenes.$inferInsert;

/**
 * Jobs table: tracks async video and image generation jobs
 */
export const jobs = mysqlTable("jobs", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  sceneId: int("sceneId"),
  jobId: varchar("jobId", { length: 255 }).notNull().unique(),
  type: mysqlEnum("type", ["text-to-video", "text-to-image", "image-to-video"]).notNull(),
  status: mysqlEnum("status", ["pending", "processing", "completed", "failed"]).default("pending").notNull(),
  provider: varchar("provider", { length: 64 }).default("magic-hour").notNull(),
  metadata: json("metadata"),
  resultUrl: text("resultUrl"),
  errorMessage: text("errorMessage"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  completedAt: timestamp("completedAt"),
});

export type Job = typeof jobs.$inferSelect;
export type InsertJob = typeof jobs.$inferInsert;

/**
 * Assets table: stores uploaded images and references
 */
export const assets = mysqlTable("assets", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  userId: int("userId").notNull(),
  assetKey: varchar("assetKey", { length: 255 }).notNull().unique(),
  url: text("url").notNull(),
  filename: varchar("filename", { length: 255 }),
  mimeType: varchar("mimeType", { length: 64 }),
  sizeBytes: int("sizeBytes"),
  expiresAt: timestamp("expiresAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Asset = typeof assets.$inferSelect;
export type InsertAsset = typeof assets.$inferInsert;
