// server/_core/vercel.ts
import "dotenv/config";

// server/_core/app.ts
import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";

// server/_core/systemRouter.ts
import { z } from "zod";

// server/_core/notification.ts
import { TRPCError } from "@trpc/server";

// server/_core/env.ts
var ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  magicHourApiKey: process.env.MAGIC_HOUR_API_KEY ?? "",
  magicHourApiBaseUrl: process.env.MAGIC_HOUR_API_BASE_URL ?? "https://api.magichour.ai/v1",
  groqApiKey: process.env.GROQ_API_KEY ?? "",
  groqApiUrl: process.env.GROQ_API_URL ?? "https://api.groq.com/openai/v1/chat/completions",
  groqModel: process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile"
};

// server/_core/notification.ts
var TITLE_MAX_LENGTH = 1200;
var CONTENT_MAX_LENGTH = 2e4;
var trimValue = (value) => value.trim();
var isNonEmptyString = (value) => typeof value === "string" && value.trim().length > 0;
var buildEndpointUrl = (baseUrl) => {
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return new URL(
    "webdevtoken.v1.WebDevService/SendNotification",
    normalizedBase
  ).toString();
};
var validatePayload = (input) => {
  if (!isNonEmptyString(input.title)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification title is required."
    });
  }
  if (!isNonEmptyString(input.content)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification content is required."
    });
  }
  const title = trimValue(input.title);
  const content = trimValue(input.content);
  if (title.length > TITLE_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification title must be at most ${TITLE_MAX_LENGTH} characters.`
    });
  }
  if (content.length > CONTENT_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification content must be at most ${CONTENT_MAX_LENGTH} characters.`
    });
  }
  return { title, content };
};
async function notifyOwner(payload) {
  const { title, content } = validatePayload(payload);
  if (!ENV.forgeApiUrl) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service URL is not configured."
    });
  }
  if (!ENV.forgeApiKey) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service API key is not configured."
    });
  }
  const endpoint = buildEndpointUrl(ENV.forgeApiUrl);
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${ENV.forgeApiKey}`,
        "content-type": "application/json",
        "connect-protocol-version": "1"
      },
      body: JSON.stringify({ title, content })
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.warn(
        `[Notification] Failed to notify owner (${response.status} ${response.statusText})${detail ? `: ${detail}` : ""}`
      );
      return false;
    }
    return true;
  } catch (error) {
    console.warn("[Notification] Error calling notification service:", error);
    return false;
  }
}

// shared/const.ts
var NOT_ADMIN_ERR_MSG = "You do not have required permission (10002)";

// server/_core/trpc.ts
import { initTRPC, TRPCError as TRPCError2 } from "@trpc/server";
import superjson from "superjson";
var t = initTRPC.context().create({
  transformer: superjson
});
var router = t.router;
var publicProcedure = t.procedure;
var requireWorkspace = t.middleware(async (opts) => {
  const { ctx, next } = opts;
  if (!ctx.user) {
    throw new TRPCError2({
      code: "UNAUTHORIZED",
      message: "Anonymous workspace could not be initialized"
    });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user
    }
  });
});
var workspaceProcedure = t.procedure.use(requireWorkspace);
var adminProcedure = t.procedure.use(
  t.middleware(async (opts) => {
    const { ctx, next } = opts;
    if (!ctx.user || ctx.user.role !== "admin") {
      throw new TRPCError2({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }
    return next({
      ctx: {
        ...ctx,
        user: ctx.user
      }
    });
  })
);

// server/_core/systemRouter.ts
var systemRouter = router({
  health: publicProcedure.input(
    z.object({
      timestamp: z.number().min(0, "timestamp cannot be negative")
    })
  ).query(() => ({
    ok: true
  })),
  notifyOwner: adminProcedure.input(
    z.object({
      title: z.string().min(1, "title is required"),
      content: z.string().min(1, "content is required")
    })
  ).mutation(async ({ input }) => {
    const delivered = await notifyOwner(input);
    return {
      success: delivered
    };
  })
});

// server/routers.ts
import { z as z2 } from "zod";

// server/db.ts
import { eq, and, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

// drizzle/schema.ts
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
  varchar
} from "drizzle-orm/pg-core";
var roleEnum = pgEnum("role", ["user", "admin"]);
var languageEnum = pgEnum("language", ["de", "en"]);
var projectStatusEnum = pgEnum("project_status", ["draft", "generating", "completed", "failed"]);
var audioSyncModeEnum = pgEnum("audio_sync_mode", ["auto", "manual"]);
var mediaStatusEnum = pgEnum("media_status", ["pending", "processing", "completed", "failed"]);
var jobTypeEnum = pgEnum("job_type", ["text-to-video", "text-to-image", "image-to-video"]);
var users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("openId", { length: 128 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: roleEnum("role").default("user").notNull(),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().$onUpdate(() => /* @__PURE__ */ new Date()).notNull(),
  lastSignedIn: timestamp("lastSignedIn", { withTimezone: true }).defaultNow().notNull()
});
var projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  language: languageEnum("language").default("de").notNull(),
  topic: text("topic"),
  status: projectStatusEnum("status").default("draft").notNull(),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().$onUpdate(() => /* @__PURE__ */ new Date()).notNull()
});
var scenes = pgTable("scenes", {
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
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().$onUpdate(() => /* @__PURE__ */ new Date()).notNull()
});
var jobs = pgTable("jobs", {
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
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().$onUpdate(() => /* @__PURE__ */ new Date()).notNull(),
  completedAt: timestamp("completedAt", { withTimezone: true })
});
var assets = pgTable("assets", {
  id: serial("id").primaryKey(),
  projectId: integer("projectId").notNull(),
  userId: integer("userId").notNull(),
  assetKey: varchar("assetKey", { length: 255 }).notNull().unique(),
  url: text("url").notNull(),
  filename: varchar("filename", { length: 255 }),
  mimeType: varchar("mimeType", { length: 64 }),
  sizeBytes: integer("sizeBytes"),
  expiresAt: timestamp("expiresAt", { withTimezone: true }),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull()
});

// server/db.ts
var _db = null;
var _pool = null;
function getDatabaseUrl() {
  return process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL ?? "";
}
async function getDb() {
  const databaseUrl = getDatabaseUrl();
  if (!_db && databaseUrl) {
    try {
      if (databaseUrl.startsWith("sb_")) {
        throw new Error("SUPABASE_DB_URL/DATABASE_URL must be a PostgreSQL connection URI, not a Supabase API secret key");
      }
      let poolUrl;
      try {
        poolUrl = new URL(databaseUrl);
      } catch {
        poolUrl = new URL("postgresql://localhost/postgres");
      }
      const isLocal = ["localhost", "127.0.0.1", "::1"].includes(poolUrl.hostname);
      _pool = new Pool({ connectionString: databaseUrl, max: 5, idleTimeoutMillis: 3e4, connectionTimeoutMillis: 1e4, ssl: isLocal ? void 0 : { rejectUnauthorized: false } });
      _db = drizzle(_pool);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}
async function getOrCreateGuestUser(guestId) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const openId = `guest:${guestId}`;
  const now = /* @__PURE__ */ new Date();
  await db.insert(users).values({
    openId,
    name: "Guest creator",
    loginMethod: "guest-workspace",
    role: "user",
    lastSignedIn: now
  }).onConflictDoUpdate({
    target: users.openId,
    set: { lastSignedIn: now }
  });
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  const user = result[0];
  if (!user) throw new Error("Guest workspace could not be initialized");
  return user;
}
async function getUserProjects(userId) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(projects).where(eq(projects.userId, userId)).orderBy(desc(projects.createdAt));
}
async function getProjectById(projectId, userId) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(projects).where(and(eq(projects.id, projectId), eq(projects.userId, userId))).limit(1);
  return result.length > 0 ? result[0] : null;
}
async function createProject(userId, data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(projects).values({
    userId,
    title: data.title,
    description: data.description,
    language: data.language,
    topic: data.topic,
    status: "draft"
  });
  return result;
}
async function updateProject(projectId, userId, data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(projects).set(data).where(and(eq(projects.id, projectId), eq(projects.userId, userId)));
}
async function getProjectScenes(projectId) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(scenes).where(eq(scenes.projectId, projectId)).orderBy(scenes.sceneNumber);
}
async function getSceneById(sceneId) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(scenes).where(eq(scenes.id, sceneId)).limit(1);
  return result.length > 0 ? result[0] : null;
}
async function createScene(projectId, data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(scenes).values({
    projectId,
    sceneNumber: data.sceneNumber,
    narration: data.narration,
    visualPrompt: data.visualPrompt,
    durationSeconds: data.durationSeconds ?? 3,
    model: data.model ?? "ltx-2.3",
    resolution: data.resolution ?? "480p",
    aspectRatio: data.aspectRatio ?? "16:9",
    generateAudio: data.generateAudio ?? false,
    videoStatus: "pending",
    imageStatus: "pending"
  });
  return result;
}
async function updateScene(sceneId, data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(scenes).set(data).where(eq(scenes.id, sceneId));
}
async function createJob(data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(jobs).values({
    projectId: data.projectId,
    sceneId: data.sceneId,
    jobId: data.jobId,
    type: data.type,
    metadata: data.metadata,
    status: "pending",
    provider: "magic-hour"
  });
  return result;
}
async function getJobById(jobId) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(jobs).where(eq(jobs.jobId, jobId)).limit(1);
  return result.length > 0 ? result[0] : null;
}
async function updateJob(jobId, data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(jobs).set(data).where(eq(jobs.jobId, jobId));
}
async function getUserVideoReel(userId) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select({
    id: jobs.id,
    jobId: jobs.jobId,
    projectId: projects.id,
    projectTitle: projects.title,
    sceneId: scenes.id,
    sceneNumber: scenes.sceneNumber,
    type: jobs.type,
    status: jobs.status,
    resultUrl: jobs.resultUrl,
    errorMessage: jobs.errorMessage,
    videoUrl: scenes.videoUrl,
    imageUrl: scenes.imageUrl,
    aspectRatio: scenes.aspectRatio,
    durationSeconds: scenes.durationSeconds,
    audioUrl: scenes.audioUrl,
    audioSyncMode: scenes.audioSyncMode,
    audioStartSeconds: scenes.audioStartSeconds,
    audioEndSeconds: scenes.audioEndSeconds,
    createdAt: jobs.createdAt,
    completedAt: jobs.completedAt
  }).from(jobs).innerJoin(projects, eq(jobs.projectId, projects.id)).leftJoin(scenes, eq(jobs.sceneId, scenes.id)).where(eq(projects.userId, userId)).orderBy(desc(jobs.createdAt));
  return rows.filter((job) => job.type === "text-to-video" || job.type === "image-to-video");
}
async function createAsset(data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(assets).values(data).returning({ id: assets.id });
  return result;
}
async function getAssetById(assetId, projectId, userId) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(assets).where(and(
    eq(assets.id, assetId),
    eq(assets.projectId, projectId),
    eq(assets.userId, userId)
  )).limit(1);
  return result.length > 0 ? result[0] : null;
}

// server/groq_client.ts
import axios from "axios";
var GroqClient = class {
  client;
  apiKey;
  constructor() {
    this.apiKey = ENV.groqApiKey;
    this.client = axios.create({
      baseURL: ENV.groqApiUrl,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json"
      }
    });
  }
  /**
   * Generate a storyboard from a topic using Groq
   */
  async generateStoryboard(topic, language) {
    if (!this.apiKey) {
      throw new Error("Groq API key not configured");
    }
    const systemPrompt = this.getSystemPrompt(language);
    const userPrompt = this.getUserPrompt(topic, language);
    try {
      const response = await this.client.post("", {
        model: ENV.groqModel,
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content: userPrompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2e3
      });
      const content = response.data.choices[0]?.message?.content;
      if (!content) {
        throw new Error("No response from Groq");
      }
      return this.parseStoryboard(content, language);
    } catch (error) {
      const message = error.response?.data?.error?.message || error.message;
      throw new Error(`Groq storyboard generation failed: ${message}`);
    }
  }
  getSystemPrompt(language) {
    if (language === "de") {
      return `Du bist ein kreativer Drehbuchautor, der Marketingthemen in detaillierte Storyboards umwandelt.
Deine Aufgabe ist es, ein Thema in 4-5 Szenen aufzuteilen, wobei jede Szene:
1. Eine kurze Narration (1-2 S\xE4tze) f\xFCr den Voice-Over enth\xE4lt
2. Einen detaillierten visuellen Prompt (3-4 S\xE4tze) f\xFCr die Videogenerierung enth\xE4lt

Formatiere die Antwort als JSON-Array mit folgendem Schema:
[
  {
    "sceneNumber": 1,
    "narration": "Narration text",
    "visualPrompt": "Visual description for video generation"
  },
  ...
]

Achte darauf, dass:
- Die Narration klar, pr\xE4gnant und marketingorientiert ist
- Die visuellen Prompts spezifisch, detailliert und f\xFCr KI-Videogenerierung optimiert sind
- Die Szenen eine logische Geschichte erz\xE4hlen
- Jede Szene zwischen 2-5 Sekunden dauert`;
    } else {
      return `You are a creative screenwriter who transforms marketing topics into detailed storyboards.
Your task is to split a topic into 4-5 scenes, where each scene:
1. Contains a brief narration (1-2 sentences) for voice-over
2. Contains a detailed visual prompt (3-4 sentences) for video generation

Format the response as a JSON array with the following schema:
[
  {
    "sceneNumber": 1,
    "narration": "Narration text",
    "visualPrompt": "Visual description for video generation"
  },
  ...
]

Make sure that:
- The narration is clear, concise, and marketing-oriented
- The visual prompts are specific, detailed, and optimized for AI video generation
- The scenes tell a logical story
- Each scene lasts between 2-5 seconds`;
    }
  }
  getUserPrompt(topic, language) {
    if (language === "de") {
      return `Erstelle ein Storyboard f\xFCr folgendes Marketingthema:

"${topic}"

Generiere 4-5 Szenen mit Narration und visuellen Prompts.`;
    } else {
      return `Create a storyboard for the following marketing topic:

"${topic}"

Generate 4-5 scenes with narration and visual prompts.`;
    }
  }
  parseStoryboard(content, language) {
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error("No JSON found in response");
      }
      const scenes2 = JSON.parse(jsonMatch[0]);
      const validatedScenes = scenes2.map((scene, index) => ({
        sceneNumber: scene.sceneNumber || index + 1,
        narration: scene.narration || "",
        visualPrompt: scene.visualPrompt || ""
      }));
      return {
        scenes: validatedScenes
      };
    } catch (error) {
      throw new Error(`Failed to parse storyboard: ${error}`);
    }
  }
};
var groqClient = new GroqClient();

// server/magic_hour_client.ts
import axios2 from "axios";
var MagicHourClient = class {
  client;
  apiKey;
  constructor() {
    this.apiKey = ENV.magicHourApiKey;
    this.client = axios2.create({
      baseURL: ENV.magicHourApiBaseUrl,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json"
      }
    });
  }
  /**
   * Get available models, resolutions, and styles from Magic Hour
   */
  async getCapabilities() {
    return {
      models: [
        {
          id: "ltx-2.3",
          name: "LTX 2.3 \u2014 fast iteration",
          type: "text-to-video",
          resolutions: ["480p", "720p", "1080p"],
          aspectRatios: ["16:9", "9:16", "1:1"],
          maxDurationSeconds: 30,
          minDurationSeconds: 1
        },
        {
          id: "wan-2.2",
          name: "Wan 2.2 \u2014 motion and camera control",
          type: "text-to-video",
          resolutions: ["480p", "720p", "1080p"],
          aspectRatios: ["16:9", "9:16", "1:1"],
          maxDurationSeconds: 30,
          minDurationSeconds: 1
        },
        {
          id: "kling-3.0",
          name: "Kling 3.0 \u2014 cinematic quality",
          type: "text-to-video",
          resolutions: ["480p", "720p", "1080p"],
          aspectRatios: ["16:9", "9:16", "1:1"],
          maxDurationSeconds: 30,
          minDurationSeconds: 1
        },
        {
          id: "seedance-1.5",
          name: "Seedance 1.5 \u2014 smooth motion",
          type: "text-to-video",
          resolutions: ["480p", "720p", "1080p"],
          aspectRatios: ["16:9", "9:16", "1:1"],
          maxDurationSeconds: 30,
          minDurationSeconds: 1
        },
        {
          id: "flux-schnell",
          name: "Flux Schnell \u2014 fast image draft",
          type: "text-to-image",
          resolutions: ["640px", "1k", "2k", "4k"],
          aspectRatios: ["16:9", "9:16", "1:1"],
          maxDurationSeconds: 0,
          minDurationSeconds: 0
        },
        {
          id: "flux-2-klein",
          name: "Flux 2 Klein \u2014 concise image work",
          type: "text-to-image",
          resolutions: ["640px", "1k", "2k", "4k"],
          aspectRatios: ["16:9", "9:16", "1:1"],
          maxDurationSeconds: 0,
          minDurationSeconds: 0
        },
        {
          id: "z-image-turbo",
          name: "Z-Image Turbo \u2014 fast image draft",
          type: "text-to-image",
          resolutions: ["640px", "1k", "2k", "4k"],
          aspectRatios: ["16:9", "9:16", "1:1"],
          maxDurationSeconds: 0,
          minDurationSeconds: 0
        }
      ],
      imageStyles: [
        "general",
        "ai photo generator",
        "ai illustration generator",
        "ai logo generator",
        "movie poster generator",
        "thumbnail maker"
      ]
    };
  }
  /**
   * Submit a text-to-video generation request
   */
  async submitTextToVideo(request) {
    try {
      const response = await this.client.post("/videos/generations", {
        prompt: request.prompt,
        model: request.model,
        resolution: request.resolution,
        aspectRatio: request.aspectRatio,
        durationSeconds: request.durationSeconds,
        generateAudio: request.generateAudio ?? false
      });
      return response.data.id;
    } catch (error) {
      const message = error.response?.data?.message || error.message;
      throw new Error(`Magic Hour text-to-video failed: ${message}`);
    }
  }
  /**
   * Submit a text-to-image generation request
   */
  async submitTextToImage(request) {
    try {
      const response = await this.client.post("/images/generations", {
        prompt: request.prompt,
        model: request.model,
        resolution: request.resolution,
        style: request.style
      });
      return response.data.id;
    } catch (error) {
      const message = error.response?.data?.message || error.message;
      throw new Error(`Magic Hour text-to-image failed: ${message}`);
    }
  }
  /**
   * Submit an image-to-video generation request
   */
  async submitImageToVideo(request) {
    try {
      const response = await this.client.post("/videos/generations", {
        imageUrl: request.imageUrl,
        prompt: request.prompt,
        model: request.model,
        resolution: request.resolution,
        aspectRatio: request.aspectRatio,
        durationSeconds: request.durationSeconds,
        generateAudio: request.generateAudio ?? false
      });
      return response.data.id;
    } catch (error) {
      const message = error.response?.data?.message || error.message;
      throw new Error(`Magic Hour image-to-video failed: ${message}`);
    }
  }
  /**
   * Poll video generation status
   */
  async getVideoStatus(jobId) {
    try {
      const response = await this.client.get(`/videos/generations/${jobId}`);
      const data = response.data;
      return {
        id: jobId,
        status: data.status,
        result: data.status === "completed" ? { videoUrl: data.videoUrl } : void 0,
        error: data.error
      };
    } catch (error) {
      throw new Error(`Failed to get video status: ${error.message}`);
    }
  }
  /**
   * Poll image generation status
   */
  async getImageStatus(jobId) {
    try {
      const response = await this.client.get(`/images/generations/${jobId}`);
      const data = response.data;
      return {
        id: jobId,
        status: data.status,
        result: data.status === "completed" ? { imageUrl: data.imageUrl } : void 0,
        error: data.error
      };
    } catch (error) {
      throw new Error(`Failed to get image status: ${error.message}`);
    }
  }
};
var magicHourClient = new MagicHourClient();

// server/routers.ts
import { TRPCError as TRPCError3 } from "@trpc/server";

// server/storage.ts
function getForgeConfig() {
  const forgeUrl = ENV.forgeApiUrl;
  const forgeKey = ENV.forgeApiKey;
  if (!forgeUrl || !forgeKey) {
    throw new Error(
      "Storage config missing: set BUILT_IN_FORGE_API_URL and BUILT_IN_FORGE_API_KEY"
    );
  }
  return { forgeUrl: forgeUrl.replace(/\/+$/, ""), forgeKey };
}
function normalizeKey(relKey) {
  return relKey.replace(/^\/+/, "");
}
function appendHashSuffix(relKey) {
  const hash = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  const lastDot = relKey.lastIndexOf(".");
  if (lastDot === -1) return `${relKey}_${hash}`;
  return `${relKey.slice(0, lastDot)}_${hash}${relKey.slice(lastDot)}`;
}
async function storagePut(relKey, data, contentType = "application/octet-stream") {
  const { forgeUrl, forgeKey } = getForgeConfig();
  const key = appendHashSuffix(normalizeKey(relKey));
  const presignUrl = new URL("v1/storage/presign/put", forgeUrl + "/");
  presignUrl.searchParams.set("path", key);
  const presignResp = await fetch(presignUrl, {
    headers: { Authorization: `Bearer ${forgeKey}` }
  });
  if (!presignResp.ok) {
    const msg = await presignResp.text().catch(() => presignResp.statusText);
    throw new Error(`Storage presign failed (${presignResp.status}): ${msg}`);
  }
  const { url: s3Url } = await presignResp.json();
  if (!s3Url) throw new Error("Forge returned empty presign URL");
  const blob = typeof data === "string" ? new Blob([data], { type: contentType }) : new Blob([data], { type: contentType });
  const uploadResp = await fetch(s3Url, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: blob
  });
  if (!uploadResp.ok) {
    throw new Error(`Storage upload to S3 failed (${uploadResp.status})`);
  }
  return { key, url: `/manus-storage/${key}` };
}
async function storageGetSignedUrl(relKey) {
  const { forgeUrl, forgeKey } = getForgeConfig();
  const key = normalizeKey(relKey);
  const getUrl = new URL("v1/storage/presign/get", forgeUrl + "/");
  getUrl.searchParams.set("path", key);
  const resp = await fetch(getUrl, {
    headers: { Authorization: `Bearer ${forgeKey}` }
  });
  if (!resp.ok) {
    const msg = await resp.text().catch(() => resp.statusText);
    throw new Error(`Storage signed URL failed (${resp.status}): ${msg}`);
  }
  const { url } = await resp.json();
  return url;
}

// server/routers.ts
var appRouter = router({
  system: systemRouter,
  // Provider capabilities
  provider: router({
    capabilities: publicProcedure.query(async () => {
      try {
        return await magicHourClient.getCapabilities();
      } catch (error) {
        throw new TRPCError3({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch provider capabilities"
        });
      }
    })
  }),
  // Secure user assets: bytes arrive as base64 through tRPC and are stored in S3-backed storage.
  assets: router({
    upload: workspaceProcedure.input(z2.object({
      projectId: z2.number().int().positive(),
      filename: z2.string().min(1).max(255),
      mimeType: z2.enum(["image/png", "image/jpeg", "image/webp", "image/avif", "audio/mpeg", "audio/mp3", "audio/wav", "audio/ogg", "audio/webm", "audio/mp4", "audio/m4a"]),
      dataBase64: z2.string().min(1).max(12e6)
    })).mutation(async ({ ctx, input }) => {
      const project = await getProjectById(input.projectId, ctx.user.id);
      if (!project) {
        throw new TRPCError3({ code: "NOT_FOUND", message: "Project not found" });
      }
      const payload = input.dataBase64.replace(/^data:[^;]+;base64,/, "");
      let data;
      try {
        data = Buffer.from(payload, "base64");
      } catch {
        throw new TRPCError3({ code: "BAD_REQUEST", message: "Ung\xFCltige Medien-Daten" });
      }
      if (!data.length || data.length > 8 * 1024 * 1024) {
        throw new TRPCError3({ code: "BAD_REQUEST", message: "Bild oder Audio darf h\xF6chstens 8 MB gro\xDF sein" });
      }
      const safeName = input.filename.replace(/[^a-zA-Z0-9._-]/g, "_");
      try {
        const stored = await storagePut(
          `users/${ctx.user.id}/projects/${input.projectId}/${safeName}`,
          data,
          input.mimeType
        );
        const result = await createAsset({
          projectId: input.projectId,
          userId: ctx.user.id,
          assetKey: stored.key,
          url: stored.url,
          filename: safeName,
          mimeType: input.mimeType,
          sizeBytes: data.length
        });
        return { success: true, assetId: result?.id ?? result?.insertId ?? 0, ...stored };
      } catch (error) {
        throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR", message: error.message || "Medien-Upload fehlgeschlagen" });
      }
    })
  }),
  // Project management
  projects: router({
    list: workspaceProcedure.query(async ({ ctx }) => {
      try {
        return await getUserProjects(ctx.user.id);
      } catch (error) {
        throw new TRPCError3({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch projects"
        });
      }
    }),
    get: workspaceProcedure.input(z2.object({ projectId: z2.number() })).query(async ({ ctx, input }) => {
      try {
        const project = await getProjectById(input.projectId, ctx.user.id);
        if (!project) {
          throw new TRPCError3({
            code: "NOT_FOUND",
            message: "Project not found"
          });
        }
        return project;
      } catch (error) {
        if (error instanceof TRPCError3) throw error;
        throw new TRPCError3({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch project"
        });
      }
    }),
    create: workspaceProcedure.input(
      z2.object({
        title: z2.string().min(1),
        description: z2.string().optional(),
        language: z2.enum(["de", "en"]),
        topic: z2.string().optional()
      })
    ).mutation(async ({ ctx, input }) => {
      try {
        await createProject(ctx.user.id, input);
        const projects2 = await getUserProjects(ctx.user.id);
        const newProject = projects2[0];
        return { success: true, projectId: newProject?.id || 0 };
      } catch (error) {
        throw new TRPCError3({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create project"
        });
      }
    }),
    update: workspaceProcedure.input(
      z2.object({
        projectId: z2.number(),
        title: z2.string().optional(),
        description: z2.string().optional(),
        status: z2.enum(["draft", "generating", "completed", "failed"]).optional()
      })
    ).mutation(async ({ ctx, input }) => {
      try {
        const project = await getProjectById(input.projectId, ctx.user.id);
        if (!project) {
          throw new TRPCError3({
            code: "NOT_FOUND",
            message: "Project not found"
          });
        }
        await updateProject(input.projectId, ctx.user.id, {
          title: input.title,
          description: input.description,
          status: input.status
        });
        return { success: true };
      } catch (error) {
        if (error instanceof TRPCError3) throw error;
        throw new TRPCError3({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update project"
        });
      }
    })
  }),
  // Video reel feed
  jobs: router({
    videoReel: workspaceProcedure.query(async ({ ctx }) => {
      try {
        return await getUserVideoReel(ctx.user.id);
      } catch (error) {
        throw new TRPCError3({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch video reel"
        });
      }
    })
  }),
  // Scene management
  scenes: router({
    list: workspaceProcedure.input(z2.object({ projectId: z2.number() })).query(async ({ ctx, input }) => {
      try {
        const project = await getProjectById(input.projectId, ctx.user.id);
        if (!project) {
          throw new TRPCError3({
            code: "NOT_FOUND",
            message: "Project not found"
          });
        }
        return await getProjectScenes(input.projectId);
      } catch (error) {
        if (error instanceof TRPCError3) throw error;
        throw new TRPCError3({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch scenes"
        });
      }
    }),
    update: workspaceProcedure.input(
      z2.object({
        sceneId: z2.number(),
        projectId: z2.number(),
        narration: z2.string().optional(),
        visualPrompt: z2.string().optional(),
        durationSeconds: z2.number().optional(),
        model: z2.string().optional(),
        resolution: z2.string().optional(),
        aspectRatio: z2.string().optional(),
        generateAudio: z2.boolean().optional(),
        audioAssetId: z2.number().int().positive().nullable().optional(),
        audioUrl: z2.string().min(1).nullable().optional(),
        audioFilename: z2.string().max(255).nullable().optional(),
        audioSyncMode: z2.enum(["auto", "manual"]).optional(),
        audioOffsetSeconds: z2.number().min(0).max(3600).optional(),
        audioTransitionSeconds: z2.number().min(0).max(2).optional(),
        audioStartSeconds: z2.number().min(0).max(3600).optional(),
        audioEndSeconds: z2.number().min(0).max(3600).optional()
      })
    ).mutation(async ({ ctx, input }) => {
      try {
        const project = await getProjectById(input.projectId, ctx.user.id);
        if (!project) {
          throw new TRPCError3({
            code: "NOT_FOUND",
            message: "Project not found"
          });
        }
        const scene = await getSceneById(input.sceneId);
        if (!scene || scene.projectId !== input.projectId) {
          throw new TRPCError3({
            code: "NOT_FOUND",
            message: "Scene not found"
          });
        }
        let audioPatch = {};
        if (input.audioAssetId !== void 0) {
          if (input.audioAssetId === null) {
            audioPatch = { audioAssetId: null, audioUrl: null, audioFilename: null };
          } else {
            const audioAsset = await getAssetById(input.audioAssetId, input.projectId, ctx.user.id);
            if (!audioAsset || !audioAsset.mimeType?.startsWith("audio/")) {
              throw new TRPCError3({ code: "NOT_FOUND", message: "Audio-Asset not found" });
            }
            audioPatch = { audioAssetId: audioAsset.id, audioUrl: audioAsset.url, audioFilename: audioAsset.filename || "Audio-Spur" };
          }
        }
        await updateScene(input.sceneId, {
          narration: input.narration,
          visualPrompt: input.visualPrompt,
          durationSeconds: input.durationSeconds,
          model: input.model,
          resolution: input.resolution,
          aspectRatio: input.aspectRatio,
          generateAudio: input.generateAudio,
          audioSyncMode: input.audioSyncMode,
          audioOffsetSeconds: input.audioOffsetSeconds === void 0 ? void 0 : input.audioOffsetSeconds.toFixed(3),
          audioTransitionSeconds: input.audioTransitionSeconds === void 0 ? void 0 : input.audioTransitionSeconds.toFixed(3),
          audioStartSeconds: input.audioStartSeconds === void 0 ? void 0 : input.audioStartSeconds.toFixed(3),
          audioEndSeconds: input.audioEndSeconds === void 0 ? void 0 : input.audioEndSeconds.toFixed(3),
          ...audioPatch
        });
        return { success: true };
      } catch (error) {
        if (error instanceof TRPCError3) throw error;
        throw new TRPCError3({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update scene"
        });
      }
    })
  }),
  // Storyboard generation
  storyboard: router({
    generate: workspaceProcedure.input(
      z2.object({
        projectId: z2.number(),
        topic: z2.string().min(1),
        language: z2.enum(["de", "en"])
      })
    ).mutation(async ({ ctx, input }) => {
      try {
        const project = await getProjectById(input.projectId, ctx.user.id);
        if (!project) {
          throw new TRPCError3({
            code: "NOT_FOUND",
            message: "Project not found"
          });
        }
        await updateProject(input.projectId, ctx.user.id, {
          status: "generating",
          topic: input.topic
        });
        const storyboard = await groqClient.generateStoryboard(input.topic, input.language);
        for (const scene of storyboard.scenes) {
          await createScene(input.projectId, {
            sceneNumber: scene.sceneNumber,
            narration: scene.narration,
            visualPrompt: scene.visualPrompt,
            durationSeconds: 3,
            model: "ltx-2.3",
            resolution: "480p",
            aspectRatio: "16:9",
            generateAudio: false
          });
        }
        await updateProject(input.projectId, ctx.user.id, {
          status: "completed"
        });
        return {
          success: true,
          scenes: storyboard.scenes
        };
      } catch (error) {
        await updateProject(input.projectId, ctx.user.id, {
          status: "failed"
        });
        if (error instanceof TRPCError3) throw error;
        throw new TRPCError3({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to generate storyboard"
        });
      }
    })
  }),
  // Video generation
  videos: router({
    generateTextToVideo: workspaceProcedure.input(
      z2.object({
        sceneId: z2.number(),
        projectId: z2.number(),
        prompt: z2.string().min(1),
        model: z2.string(),
        resolution: z2.string(),
        aspectRatio: z2.string(),
        durationSeconds: z2.number(),
        generateAudio: z2.boolean().optional()
      })
    ).mutation(async ({ ctx, input }) => {
      try {
        const project = await getProjectById(input.projectId, ctx.user.id);
        if (!project) {
          throw new TRPCError3({
            code: "NOT_FOUND",
            message: "Project not found"
          });
        }
        const scene = await getSceneById(input.sceneId);
        if (!scene || scene.projectId !== input.projectId) {
          throw new TRPCError3({
            code: "NOT_FOUND",
            message: "Scene not found"
          });
        }
        const jobId = await magicHourClient.submitTextToVideo({
          prompt: input.prompt,
          model: input.model,
          resolution: input.resolution,
          aspectRatio: input.aspectRatio,
          durationSeconds: input.durationSeconds,
          generateAudio: input.generateAudio
        });
        await createJob({
          projectId: input.projectId,
          sceneId: input.sceneId,
          jobId,
          type: "text-to-video",
          metadata: {
            prompt: input.prompt,
            model: input.model,
            resolution: input.resolution
          }
        });
        await updateScene(input.sceneId, {
          videoJobId: jobId,
          videoStatus: "processing"
        });
        return { success: true, jobId };
      } catch (error) {
        if (error instanceof TRPCError3) throw error;
        throw new TRPCError3({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to generate video"
        });
      }
    }),
    getStatus: workspaceProcedure.input(z2.object({ jobId: z2.string() })).query(async ({ ctx, input }) => {
      try {
        const job = await getJobById(input.jobId);
        if (!job) {
          throw new TRPCError3({
            code: "NOT_FOUND",
            message: "Job not found"
          });
        }
        const project = await getProjectById(job.projectId, ctx.user.id);
        if (!project) {
          throw new TRPCError3({
            code: "FORBIDDEN",
            message: "Not authorized to access this job"
          });
        }
        const status = await magicHourClient.getVideoStatus(input.jobId);
        if (status.status === "completed" && status.result?.videoUrl) {
          await updateJob(input.jobId, {
            status: "completed",
            resultUrl: status.result.videoUrl,
            completedAt: /* @__PURE__ */ new Date()
          });
          if (job.sceneId) {
            await updateScene(job.sceneId, {
              videoUrl: status.result.videoUrl,
              videoStatus: "completed"
            });
          }
        } else if (status.status === "failed") {
          await updateJob(input.jobId, {
            status: "failed",
            errorMessage: status.error
          });
          if (job.sceneId) {
            await updateScene(job.sceneId, {
              videoStatus: "failed"
            });
          }
        }
        return status;
      } catch (error) {
        if (error instanceof TRPCError3) throw error;
        throw new TRPCError3({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get video status"
        });
      }
    })
  }),
  // Image generation
  images: router({
    generateTextToImage: workspaceProcedure.input(
      z2.object({
        sceneId: z2.number().optional(),
        projectId: z2.number(),
        prompt: z2.string().min(1),
        model: z2.string(),
        resolution: z2.string(),
        style: z2.string()
      })
    ).mutation(async ({ ctx, input }) => {
      try {
        const project = await getProjectById(input.projectId, ctx.user.id);
        if (!project) {
          throw new TRPCError3({
            code: "NOT_FOUND",
            message: "Project not found"
          });
        }
        const jobId = await magicHourClient.submitTextToImage({
          prompt: input.prompt,
          model: input.model,
          resolution: input.resolution,
          style: input.style
        });
        await createJob({
          projectId: input.projectId,
          sceneId: input.sceneId,
          jobId,
          type: "text-to-image",
          metadata: {
            prompt: input.prompt,
            model: input.model,
            style: input.style
          }
        });
        if (input.sceneId) {
          await updateScene(input.sceneId, {
            imageJobId: jobId,
            imageStatus: "processing"
          });
        }
        return { success: true, jobId };
      } catch (error) {
        throw new TRPCError3({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to generate image"
        });
      }
    }),
    generateImageToVideo: workspaceProcedure.input(z2.object({
      sceneId: z2.number().int().positive(),
      projectId: z2.number().int().positive(),
      assetId: z2.number().int().positive(),
      prompt: z2.string().min(1),
      model: z2.string().min(1),
      resolution: z2.string().min(1),
      aspectRatio: z2.string().min(1),
      durationSeconds: z2.number().int().min(1).max(30),
      generateAudio: z2.boolean().optional()
    })).mutation(async ({ ctx, input }) => {
      const project = await getProjectById(input.projectId, ctx.user.id);
      const scene = await getSceneById(input.sceneId);
      const asset = await getAssetById(input.assetId, input.projectId, ctx.user.id);
      if (!project || !scene || scene.projectId !== input.projectId || !asset) {
        throw new TRPCError3({ code: "NOT_FOUND", message: "Project, scene, or asset not found" });
      }
      try {
        const providerImageUrl = await storageGetSignedUrl(asset.assetKey);
        const jobId = await magicHourClient.submitImageToVideo({
          imageUrl: providerImageUrl,
          prompt: input.prompt,
          model: input.model,
          resolution: input.resolution,
          aspectRatio: input.aspectRatio,
          durationSeconds: input.durationSeconds,
          generateAudio: input.generateAudio
        });
        await createJob({
          projectId: input.projectId,
          sceneId: input.sceneId,
          jobId,
          type: "image-to-video",
          metadata: { assetId: input.assetId, prompt: input.prompt, model: input.model, resolution: input.resolution }
        });
        await updateScene(input.sceneId, { videoJobId: jobId, videoStatus: "processing" });
        return { success: true, jobId };
      } catch (error) {
        if (error instanceof TRPCError3) throw error;
        throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR", message: error.message || "Failed to animate image" });
      }
    }),
    getStatus: workspaceProcedure.input(z2.object({ jobId: z2.string() })).query(async ({ ctx, input }) => {
      try {
        const job = await getJobById(input.jobId);
        if (!job) {
          throw new TRPCError3({
            code: "NOT_FOUND",
            message: "Job not found"
          });
        }
        const project = await getProjectById(job.projectId, ctx.user.id);
        if (!project) {
          throw new TRPCError3({
            code: "FORBIDDEN",
            message: "Not authorized to access this job"
          });
        }
        const status = await magicHourClient.getImageStatus(input.jobId);
        if (status.status === "completed" && status.result?.imageUrl) {
          await updateJob(input.jobId, {
            status: "completed",
            resultUrl: status.result.imageUrl,
            completedAt: /* @__PURE__ */ new Date()
          });
          if (job.sceneId) {
            await updateScene(job.sceneId, {
              imageUrl: status.result.imageUrl,
              imageStatus: "completed"
            });
          }
        } else if (status.status === "failed") {
          await updateJob(input.jobId, {
            status: "failed",
            errorMessage: status.error
          });
          if (job.sceneId) {
            await updateScene(job.sceneId, {
              imageStatus: "failed"
            });
          }
        }
        return status;
      } catch (error) {
        if (error instanceof TRPCError3) throw error;
        throw new TRPCError3({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get image status"
        });
      }
    })
  })
});

// server/_core/context.ts
import { randomUUID } from "node:crypto";
var GUEST_COOKIE_NAME = "werkbank_guest_id";
var ONE_YEAR_MS = 1e3 * 60 * 60 * 24 * 365;
var guestIdPattern = /^[a-f0-9-]{36}$/i;
function getCookieValue(cookieHeader, name) {
  if (!cookieHeader) return void 0;
  const prefix = `${name}=`;
  return cookieHeader.split(";").map((part) => part.trim()).find((part) => part.startsWith(prefix))?.slice(prefix.length);
}
function getOrIssueGuestId(opts) {
  const existing = getCookieValue(opts.req.headers.cookie, GUEST_COOKIE_NAME);
  if (existing && guestIdPattern.test(existing)) return existing;
  const guestId = randomUUID();
  opts.res.cookie(GUEST_COOKIE_NAME, guestId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ONE_YEAR_MS
  });
  return guestId;
}
async function createContext(opts) {
  const guestId = getOrIssueGuestId(opts);
  let user = null;
  try {
    user = await getOrCreateGuestUser(guestId);
  } catch (error) {
    console.warn(
      "[Context] Guest workspace unavailable:",
      error instanceof Error ? error.message : error
    );
  }
  return {
    req: opts.req,
    res: opts.res,
    user
  };
}

// server/_core/security.ts
function configureSecurity(app2) {
  app2.use((req, res, next) => {
    const origin = req.headers.origin;
    const allowedOrigins = [
      "http://localhost:3000",
      "http://localhost:3001",
      "http://127.0.0.1:3000",
      "http://127.0.0.1:3001"
    ];
    if (ENV.isProduction) {
      allowedOrigins.push(process.env.VITE_FRONTEND_URL || "");
    }
    if (origin && allowedOrigins.includes(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
    }
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, Cookie");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Max-Age", "86400");
    if (req.method === "OPTIONS") {
      res.sendStatus(200);
      return;
    }
    next();
  });
  app2.use((req, res, next) => {
    res.setHeader("X-Frame-Options", "SAMEORIGIN");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-XSS-Protection", "1; mode=block");
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://api.groq.com https://api.magichour.ai https://api.manus.im"
    );
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader(
      "Permissions-Policy",
      "geolocation=(), microphone=(), camera=()"
    );
    if (ENV.isProduction) {
      res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    }
    next();
  });
}

// server/_core/storageProxy.ts
function registerStorageProxy(app2) {
  app2.get("/manus-storage/*", async (req, res) => {
    const key = req.params[0];
    if (!key) {
      res.status(400).send("Missing storage key");
      return;
    }
    if (!ENV.forgeApiUrl || !ENV.forgeApiKey) {
      res.status(500).send("Storage proxy not configured");
      return;
    }
    try {
      const forgeUrl = new URL(
        "v1/storage/presign/get",
        ENV.forgeApiUrl.replace(/\/+$/, "") + "/"
      );
      forgeUrl.searchParams.set("path", key);
      const forgeResp = await fetch(forgeUrl, {
        headers: { Authorization: `Bearer ${ENV.forgeApiKey}` }
      });
      if (!forgeResp.ok) {
        const body = await forgeResp.text().catch(() => "");
        console.error(`[StorageProxy] forge error: ${forgeResp.status} ${body}`);
        res.status(502).send("Storage backend error");
        return;
      }
      const { url } = await forgeResp.json();
      if (!url) {
        res.status(502).send("Empty signed URL from backend");
        return;
      }
      res.set("Cache-Control", "no-store");
      res.redirect(307, url);
    } catch (err) {
      console.error("[StorageProxy] failed:", err);
      res.status(502).send("Storage proxy error");
    }
  });
}

// server/_core/app.ts
function createApp() {
  const app2 = express();
  configureSecurity(app2);
  app2.use(express.json({ limit: "50mb" }));
  app2.use(express.urlencoded({ limit: "50mb", extended: true }));
  registerStorageProxy(app2);
  app2.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext
    })
  );
  return app2;
}

// server/_core/vercel.ts
var app = createApp();
function handler(req, res) {
  if (typeof req.url === "string" && req.url.startsWith("/api/manus-storage/")) {
    req.url = req.url.slice(4);
  }
  return app(req, res);
}
export {
  handler as default
};
