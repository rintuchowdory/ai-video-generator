import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import * as db from "./db";
import { magicHourClient } from "./magic_hour_client";
import { storageGetSignedUrl, storagePut } from "./storage";

vi.mock("./db", () => ({
  getProjectById: vi.fn(),
  getSceneById: vi.fn(),
  getAssetById: vi.fn(),
  createAsset: vi.fn(),
  createJob: vi.fn(),
  updateScene: vi.fn(),
  getJobById: vi.fn(),
  updateJob: vi.fn(),
}));

vi.mock("./magic_hour_client", () => ({
  magicHourClient: {
    submitTextToVideo: vi.fn(),
    submitImageToVideo: vi.fn(),
    getVideoStatus: vi.fn(),
  },
}));

vi.mock("./storage", () => ({
  storagePut: vi.fn(),
  storageGetSignedUrl: vi.fn(),
}));

const user = {
  id: 7,
  openId: "critical-test-user",
  name: "Critical Test User",
  email: "critical@example.com",
  loginMethod: "test",
  role: "user" as const,
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
};

function callerFor(currentUser: typeof user | null) {
  return appRouter.createCaller({
    user: currentUser,
    req: {} as any,
    res: { clearCookie: vi.fn() } as any,
  });
}

const videoInput = {
  sceneId: 11,
  projectId: 19,
  prompt: "A warm cafe opening",
  model: "ltx-2.3",
  resolution: "480p",
  aspectRatio: "16:9",
  durationSeconds: 3,
  generateAudio: false,
};

describe("critical media procedures", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects unauthenticated asset uploads", async () => {
    const caller = callerFor(null);
    await expect(caller.assets.upload({
      projectId: 19,
      filename: "reference.png",
      mimeType: "image/png",
      dataBase64: "data:image/png;base64,AA==",
    })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(storagePut).not.toHaveBeenCalled();
  });

  it("validates upload MIME types before writing storage", async () => {
    const caller = callerFor(user);
    await expect(caller.assets.upload({
      projectId: 19,
      filename: "reference.svg",
      mimeType: "image/svg+xml" as any,
      dataBase64: "data:image/svg+xml;base64,AA==",
    })).rejects.toThrow();
    expect(storagePut).not.toHaveBeenCalled();
  });

  it("stores an authorized image upload and returns its asset id", async () => {
    vi.mocked(db.getProjectById).mockResolvedValue({ id: 19, userId: 7 } as any);
    vi.mocked(storagePut).mockResolvedValue({ key: "users/7/reference_abc.png", url: "/manus-storage/users/7/reference_abc.png" });
    vi.mocked(db.createAsset).mockResolvedValue({ insertId: 42 } as any);

    const caller = callerFor(user);
    const result = await caller.assets.upload({
      projectId: 19,
      filename: "my reference.png",
      mimeType: "image/png",
      dataBase64: "data:image/png;base64,AA==",
    });

    expect(result).toMatchObject({ success: true, assetId: 42, key: "users/7/reference_abc.png" });
    expect(storagePut).toHaveBeenCalledWith(
      "users/7/projects/19/my_reference.png",
      expect.any(Buffer),
      "image/png",
    );
    expect(db.createAsset).toHaveBeenCalledWith(expect.objectContaining({ projectId: 19, userId: 7, sizeBytes: 1 }));
  });

  it("does not submit video generation for a project the user cannot access", async () => {
    vi.mocked(db.getProjectById).mockResolvedValue(null);
    const caller = callerFor(user);

    await expect(caller.videos.generateTextToVideo(videoInput)).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(magicHourClient.submitTextToVideo).not.toHaveBeenCalled();
  });

  it("creates an image-to-video job from an authorized stored asset", async () => {
    vi.mocked(db.getProjectById).mockResolvedValue({ id: 19, userId: 7 } as any);
    vi.mocked(db.getSceneById).mockResolvedValue({ id: 11, projectId: 19 } as any);
    vi.mocked(db.getAssetById).mockResolvedValue({ id: 42, projectId: 19, userId: 7, assetKey: "users/7/reference.png" } as any);
    vi.mocked(storageGetSignedUrl).mockResolvedValue("https://storage.example/reference.png");
    vi.mocked(magicHourClient.submitImageToVideo).mockResolvedValue("mh-image-video-1");
    vi.mocked(db.createJob).mockResolvedValue({} as any);

    const caller = callerFor(user);
    const result = await caller.images.generateImageToVideo({
      ...videoInput,
      assetId: 42,
    });

    expect(result).toEqual({ success: true, jobId: "mh-image-video-1" });
    expect(magicHourClient.submitImageToVideo).toHaveBeenCalledWith(expect.objectContaining({ imageUrl: "https://storage.example/reference.png" }));
    expect(db.createJob).toHaveBeenCalledWith(expect.objectContaining({ type: "image-to-video", sceneId: 11 }));
    expect(db.updateScene).toHaveBeenCalledWith(11, { videoJobId: "mh-image-video-1", videoStatus: "processing" });
  });

  it("persists failed video status for an authorized job", async () => {
    vi.mocked(db.getJobById).mockResolvedValue({ jobId: "mh-failed", projectId: 19, sceneId: 11 } as any);
    vi.mocked(db.getProjectById).mockResolvedValue({ id: 19, userId: 7 } as any);
    vi.mocked(magicHourClient.getVideoStatus).mockResolvedValue({ id: "mh-failed", status: "failed", error: "Provider credits exhausted" });

    const caller = callerFor(user);
    const result = await caller.videos.getStatus({ jobId: "mh-failed" });

    expect(result.status).toBe("failed");
    expect(db.updateJob).toHaveBeenCalledWith("mh-failed", expect.objectContaining({ status: "failed", errorMessage: "Provider credits exhausted" }));
    expect(db.updateScene).toHaveBeenCalledWith(11, { videoStatus: "failed" });
  });
});
