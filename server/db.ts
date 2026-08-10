import { eq, and, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, projects, scenes, jobs, assets, Project, Scene, Job, Asset } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// Project queries
export async function getUserProjects(userId: number) {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(projects)
    .where(eq(projects.userId, userId))
    .orderBy(desc(projects.createdAt));
}

export async function getProjectById(projectId: number, userId: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))
    .limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function createProject(userId: number, data: {
  title: string;
  description?: string;
  language: "de" | "en";
  topic?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(projects).values({
    userId,
    title: data.title,
    description: data.description,
    language: data.language,
    topic: data.topic,
    status: "draft",
  });

  return result;
}

export async function updateProject(projectId: number, userId: number, data: Partial<Project>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(projects)
    .set(data)
    .where(and(eq(projects.id, projectId), eq(projects.userId, userId)));
}

// Scene queries
export async function getProjectScenes(projectId: number) {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(scenes)
    .where(eq(scenes.projectId, projectId))
    .orderBy(scenes.sceneNumber);
}

export async function getSceneById(sceneId: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(scenes)
    .where(eq(scenes.id, sceneId))
    .limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function createScene(projectId: number, data: {
  sceneNumber: number;
  narration: string;
  visualPrompt: string;
  durationSeconds?: number;
  model?: string;
  resolution?: string;
  aspectRatio?: string;
  generateAudio?: boolean;
}) {
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
    imageStatus: "pending",
  });

  return result;
}

export async function updateScene(sceneId: number, data: Partial<Scene>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(scenes)
    .set(data)
    .where(eq(scenes.id, sceneId));
}

// Job queries
export async function createJob(data: {
  projectId: number;
  sceneId?: number;
  jobId: string;
  type: "text-to-video" | "text-to-image" | "image-to-video";
  metadata?: Record<string, unknown>;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(jobs).values({
    projectId: data.projectId,
    sceneId: data.sceneId,
    jobId: data.jobId,
    type: data.type,
    metadata: data.metadata,
    status: "pending",
    provider: "magic-hour",
  });

  return result;
}

export async function getJobById(jobId: string) {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(jobs)
    .where(eq(jobs.jobId, jobId))
    .limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function updateJob(jobId: string, data: Partial<Job>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(jobs)
    .set(data)
    .where(eq(jobs.jobId, jobId));
}

export async function getProjectJobs(projectId: number) {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(jobs)
    .where(eq(jobs.projectId, projectId))
    .orderBy(desc(jobs.createdAt));
}

// Asset queries
export async function createAsset(data: {
  projectId: number;
  userId: number;
  assetKey: string;
  url: string;
  filename?: string;
  mimeType?: string;
  sizeBytes?: number;
  expiresAt?: Date;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(assets).values(data);
  return result;
}

export async function getAssetByKey(assetKey: string) {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(assets)
    .where(eq(assets.assetKey, assetKey))
    .limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function getProjectAssets(projectId: number) {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(assets)
    .where(eq(assets.projectId, projectId))
    .orderBy(desc(assets.createdAt));
}
