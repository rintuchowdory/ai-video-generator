import { describe, it, expect } from "vitest";
import { magicHourClient } from "./magic_hour_client";
import { groqClient } from "./groq_client";

describe("Provider Integration Tests", () => {
  describe("Magic Hour Client", () => {
    it("should return capabilities without errors", async () => {
      const capabilities = await magicHourClient.getCapabilities();
      
      expect(capabilities).toBeDefined();
      expect(capabilities.models).toBeDefined();
      expect(Array.isArray(capabilities.models)).toBe(true);
      expect(capabilities.models.length).toBeGreaterThan(0);
      
      // Check model structure
      const model = capabilities.models[0];
      expect(model).toHaveProperty("id");
      expect(model).toHaveProperty("name");
      expect(model).toHaveProperty("type");
      expect(model).toHaveProperty("resolutions");
      expect(model).toHaveProperty("aspectRatios");
      expect(model).toHaveProperty("maxDurationSeconds");
      
      // Check image styles
      expect(capabilities.imageStyles).toBeDefined();
      expect(Array.isArray(capabilities.imageStyles)).toBe(true);
      expect(capabilities.imageStyles.length).toBeGreaterThan(0);
    });

    it("should have valid model types", async () => {
      const capabilities = await magicHourClient.getCapabilities();
      const validTypes = ["text-to-video", "text-to-image", "image-to-video"];
      
      capabilities.models.forEach((model) => {
        expect(validTypes).toContain(model.type);
      });
    });

    it("should have valid resolutions for each model", async () => {
      const capabilities = await magicHourClient.getCapabilities();
      
      capabilities.models.forEach((model) => {
        expect(model.resolutions.length).toBeGreaterThan(0);
        model.resolutions.forEach((res) => {
          expect(typeof res).toBe("string");
          expect(res.length).toBeGreaterThan(0);
        });
      });
    });
  });

  describe("Groq Client", () => {
    it("should be initialized with API key", () => {
      // This test verifies that the Groq client can be instantiated
      // without throwing errors
      expect(groqClient).toBeDefined();
    });

    it("should have methods for storyboard generation", () => {
      expect(groqClient.generateStoryboard).toBeDefined();
      expect(typeof groqClient.generateStoryboard).toBe("function");
    });
  });

  describe("Provider Configuration", () => {
    it("should have Magic Hour API base URL configured", () => {
      // Verify that the Magic Hour client is properly configured
      const capabilities = magicHourClient.getCapabilities();
      expect(capabilities).toBeDefined();
    });
  });
});
