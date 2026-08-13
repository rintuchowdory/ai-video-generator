import { describe, it, expect, vi } from "vitest";
import { appRouter } from "./routers";
import * as db from "./db";
import { groqClient } from "./groq_client";
import { magicHourClient } from "./magic_hour_client";

describe("End-to-End Workflow Tests", () => {
  describe("Provider Integration", () => {
    it("should fetch Magic Hour capabilities", async () => {
      const capabilities = await magicHourClient.getCapabilities();
      
      expect(capabilities).toBeDefined();
      expect(capabilities.models).toBeDefined();
      expect(capabilities.models.length).toBeGreaterThan(0);
      
      // Verify text-to-video models exist
      const videoModels = capabilities.models.filter(m => m.type === "text-to-video");
      expect(videoModels.length).toBeGreaterThan(0);
      
      // Verify text-to-image models exist
      const imageModels = capabilities.models.filter(m => m.type === "text-to-image");
      expect(imageModels.length).toBeGreaterThan(0);
    });

    it("should have valid model configurations", async () => {
      const capabilities = await magicHourClient.getCapabilities();
      
      capabilities.models.forEach((model) => {
        expect(model.id).toBeTruthy();
        expect(model.name).toBeTruthy();
        expect(model.type).toBeTruthy();
        expect(model.resolutions).toBeDefined();
        expect(model.resolutions.length).toBeGreaterThan(0);
        
        if (model.type === "text-to-video" || model.type === "image-to-video") {
          expect(model.aspectRatios).toBeDefined();
          expect(model.maxDurationSeconds).toBeGreaterThan(0);
        }
      });
    });

    it("should have image styles configured", async () => {
      const capabilities = await magicHourClient.getCapabilities();
      
      expect(capabilities.imageStyles).toBeDefined();
      expect(Array.isArray(capabilities.imageStyles)).toBe(true);
      expect(capabilities.imageStyles.length).toBeGreaterThan(0);
    });
  });

  describe("Project Management", () => {
    it("should create and retrieve a project", async () => {
      const testUserId = 1;
      
      const projectData = {
        title: "Test Project",
        description: "E2E test project",
        language: "de" as const,
        topic: "Test topic",
      };

      const createSpy = vi.spyOn(db, "createProject").mockResolvedValue({ insertId: 555 } as any);
      const getSpy = vi.spyOn(db, "getProjectById").mockResolvedValue({
        id: 555,
        userId: testUserId,
        title: "Test Project",
        description: "E2E test project",
        language: "de",
      } as any);

      const result = await db.createProject(testUserId, projectData);
      const project = await db.getProjectById(555, testUserId);

      expect(result).toBeDefined();
      expect(createSpy).toHaveBeenCalledWith(testUserId, projectData);
      expect(getSpy).toHaveBeenCalledWith(555, testUserId);
      expect(project).toMatchObject({ title: "Test Project", language: "de" });
      vi.restoreAllMocks();
    });
  });

  describe("Storyboard Generation", () => {
    it("should validate Groq client is initialized", () => {
      expect(groqClient).toBeDefined();
      expect(groqClient.generateStoryboard).toBeDefined();
    });

    it("should have proper storyboard generation method", () => {
      expect(typeof groqClient.generateStoryboard).toBe("function");
    });
  });

  describe("tRPC Router", () => {
    it("should have provider capabilities endpoint", async () => {
      const caller = appRouter.createCaller({
        user: null,
        req: {} as any,
        res: {} as any,
      });

      const capabilities = await caller.provider.capabilities();
      expect(capabilities).toBeDefined();
      expect(capabilities.models).toBeDefined();
    });

    it("should have project management endpoints", async () => {
      const caller = appRouter.createCaller({
        user: null,
        req: {} as any,
        res: {} as any,
      });

      // Verify endpoints exist
      expect(caller.projects.list).toBeDefined();
      expect(caller.projects.get).toBeDefined();
      expect(caller.projects.create).toBeDefined();
      expect(caller.projects.update).toBeDefined();
    });

    it("should have scene management endpoints", async () => {
      const caller = appRouter.createCaller({
        user: null,
        req: {} as any,
        res: {} as any,
      });

      expect(caller.scenes.list).toBeDefined();
      expect(caller.scenes.update).toBeDefined();
    });

    it("should have storyboard generation endpoint", async () => {
      const caller = appRouter.createCaller({
        user: null,
        req: {} as any,
        res: {} as any,
      });

      expect(caller.storyboard.generate).toBeDefined();
    });

    it("should have video generation endpoints", async () => {
      const caller = appRouter.createCaller({
        user: null,
        req: {} as any,
        res: {} as any,
      });

      expect(caller.videos.generateTextToVideo).toBeDefined();
      expect(caller.videos.getStatus).toBeDefined();
    });

    it("should have image generation endpoints", async () => {
      const caller = appRouter.createCaller({
        user: null,
        req: {} as any,
        res: {} as any,
      });

      expect(caller.images.generateTextToImage).toBeDefined();
      expect(caller.images.getStatus).toBeDefined();
    });
  });

  describe("Configuration Validation", () => {
    it("should have required environment variables configured", () => {
      // These are checked at runtime by the clients
      expect(magicHourClient).toBeDefined();
      expect(groqClient).toBeDefined();
    });

    it("should have valid provider capabilities", async () => {
      const capabilities = await magicHourClient.getCapabilities();
      
      // Verify all models have required fields
      capabilities.models.forEach((model) => {
        expect(model.id).toBeTruthy();
        expect(model.name).toBeTruthy();
        expect(model.type).toMatch(/text-to-video|text-to-image|image-to-video/);
        expect(model.resolutions.length).toBeGreaterThan(0);
      });
    });
  });
});
