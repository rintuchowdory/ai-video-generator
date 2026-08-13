import axios, { AxiosInstance } from "axios";
import { ENV } from "./_core/env";

export interface MagicHourCapabilities {
  models: Array<{
    id: string;
    name: string;
    type: "text-to-video" | "text-to-image" | "image-to-video";
    resolutions: string[];
    aspectRatios: string[];
    maxDurationSeconds: number;
    minDurationSeconds: number;
  }>;
  imageStyles: string[];
}

export interface TextToVideoRequest {
  prompt: string;
  model: string;
  resolution: string;
  aspectRatio: string;
  durationSeconds: number;
  generateAudio?: boolean;
}

export interface TextToImageRequest {
  prompt: string;
  model: string;
  resolution: string;
  style: string;
}

export interface ImageToVideoRequest {
  imageUrl: string;
  prompt: string;
  model: string;
  resolution: string;
  aspectRatio: string;
  durationSeconds: number;
  generateAudio?: boolean;
}

export interface JobStatus {
  id: string;
  status: "pending" | "processing" | "completed" | "failed";
  result?: {
    videoUrl?: string;
    imageUrl?: string;
  };
  error?: string;
}

class MagicHourClient {
  private client: AxiosInstance;
  private apiKey: string;

  constructor() {
    this.apiKey = ENV.magicHourApiKey;
    this.client = axios.create({
      baseURL: ENV.magicHourApiBaseUrl,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
    });
  }

  /**
   * Get available models, resolutions, and styles from Magic Hour
   */
  async getCapabilities(): Promise<MagicHourCapabilities> {
    // Hardcoded capabilities based on Magic Hour API documentation
    // In production, this could be fetched from the API
    return {
      models: [
        {
          id: "ltx-2.3",
          name: "LTX 2.3 — fast iteration",
          type: "text-to-video",
          resolutions: ["480p", "720p", "1080p"],
          aspectRatios: ["16:9", "9:16", "1:1"],
          maxDurationSeconds: 30,
          minDurationSeconds: 1,
        },
        {
          id: "wan-2.2",
          name: "Wan 2.2 — motion and camera control",
          type: "text-to-video",
          resolutions: ["480p", "720p", "1080p"],
          aspectRatios: ["16:9", "9:16", "1:1"],
          maxDurationSeconds: 30,
          minDurationSeconds: 1,
        },
        {
          id: "kling-3.0",
          name: "Kling 3.0 — cinematic quality",
          type: "text-to-video",
          resolutions: ["480p", "720p", "1080p"],
          aspectRatios: ["16:9", "9:16", "1:1"],
          maxDurationSeconds: 30,
          minDurationSeconds: 1,
        },
        {
          id: "seedance-1.5",
          name: "Seedance 1.5 — smooth motion",
          type: "text-to-video",
          resolutions: ["480p", "720p", "1080p"],
          aspectRatios: ["16:9", "9:16", "1:1"],
          maxDurationSeconds: 30,
          minDurationSeconds: 1,
        },
        {
          id: "flux-schnell",
          name: "Flux Schnell — fast image draft",
          type: "text-to-image",
          resolutions: ["640px", "1k", "2k", "4k"],
          aspectRatios: ["16:9", "9:16", "1:1"],
          maxDurationSeconds: 0,
          minDurationSeconds: 0,
        },
        {
          id: "flux-2-klein",
          name: "Flux 2 Klein — concise image work",
          type: "text-to-image",
          resolutions: ["640px", "1k", "2k", "4k"],
          aspectRatios: ["16:9", "9:16", "1:1"],
          maxDurationSeconds: 0,
          minDurationSeconds: 0,
        },
        {
          id: "z-image-turbo",
          name: "Z-Image Turbo — fast image draft",
          type: "text-to-image",
          resolutions: ["640px", "1k", "2k", "4k"],
          aspectRatios: ["16:9", "9:16", "1:1"],
          maxDurationSeconds: 0,
          minDurationSeconds: 0,
        },
      ],
      imageStyles: [
        "general",
        "ai photo generator",
        "ai illustration generator",
        "ai logo generator",
        "movie poster generator",
        "thumbnail maker",
      ],
    };
  }

  /**
   * Submit a text-to-video generation request
   */
  async submitTextToVideo(request: TextToVideoRequest): Promise<string> {
    try {
      const response = await this.client.post("/videos/generations", {
        prompt: request.prompt,
        model: request.model,
        resolution: request.resolution,
        aspectRatio: request.aspectRatio,
        durationSeconds: request.durationSeconds,
        generateAudio: request.generateAudio ?? false,
      });

      return response.data.id;
    } catch (error: any) {
      const message = error.response?.data?.message || error.message;
      throw new Error(`Magic Hour text-to-video failed: ${message}`);
    }
  }

  /**
   * Submit a text-to-image generation request
   */
  async submitTextToImage(request: TextToImageRequest): Promise<string> {
    try {
      const response = await this.client.post("/images/generations", {
        prompt: request.prompt,
        model: request.model,
        resolution: request.resolution,
        style: request.style,
      });

      return response.data.id;
    } catch (error: any) {
      const message = error.response?.data?.message || error.message;
      throw new Error(`Magic Hour text-to-image failed: ${message}`);
    }
  }

  /**
   * Submit an image-to-video generation request
   */
  async submitImageToVideo(request: ImageToVideoRequest): Promise<string> {
    try {
      const response = await this.client.post("/videos/generations", {
        imageUrl: request.imageUrl,
        prompt: request.prompt,
        model: request.model,
        resolution: request.resolution,
        aspectRatio: request.aspectRatio,
        durationSeconds: request.durationSeconds,
        generateAudio: request.generateAudio ?? false,
      });

      return response.data.id;
    } catch (error: any) {
      const message = error.response?.data?.message || error.message;
      throw new Error(`Magic Hour image-to-video failed: ${message}`);
    }
  }

  /**
   * Poll video generation status
   */
  async getVideoStatus(jobId: string): Promise<JobStatus> {
    try {
      const response = await this.client.get(`/videos/generations/${jobId}`);
      const data = response.data;

      return {
        id: jobId,
        status: data.status,
        result: data.status === "completed" ? { videoUrl: data.videoUrl } : undefined,
        error: data.error,
      };
    } catch (error: any) {
      throw new Error(`Failed to get video status: ${error.message}`);
    }
  }

  /**
   * Poll image generation status
   */
  async getImageStatus(jobId: string): Promise<JobStatus> {
    try {
      const response = await this.client.get(`/images/generations/${jobId}`);
      const data = response.data;

      return {
        id: jobId,
        status: data.status,
        result: data.status === "completed" ? { imageUrl: data.imageUrl } : undefined,
        error: data.error,
      };
    } catch (error: any) {
      throw new Error(`Failed to get image status: ${error.message}`);
    }
  }
}

export const magicHourClient = new MagicHourClient();
