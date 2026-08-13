import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { groqClient } from "./groq_client";
import { magicHourClient } from "./magic_hour_client";
import { TRPCError } from "@trpc/server";
import { storagePut, storageGetSignedUrl } from "./storage";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // Provider capabilities
  provider: router({
    capabilities: publicProcedure.query(async () => {
      try {
        return await magicHourClient.getCapabilities();
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch provider capabilities",
        });
      }
    }),
  }),

  // Secure user assets: bytes arrive as base64 through tRPC and are stored in S3-backed storage.
  assets: router({
    upload: protectedProcedure
      .input(z.object({
        projectId: z.number().int().positive(),
        filename: z.string().min(1).max(255),
        mimeType: z.enum(["image/png", "image/jpeg", "image/webp", "image/avif", "audio/mpeg", "audio/mp3", "audio/wav", "audio/ogg", "audio/webm", "audio/mp4", "audio/m4a"]),
        dataBase64: z.string().min(1).max(12_000_000),
      }))
      .mutation(async ({ ctx, input }) => {
        const project = await db.getProjectById(input.projectId, ctx.user.id);
        if (!project) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
        }

        const payload = input.dataBase64.replace(/^data:[^;]+;base64,/, "");
        let data: Buffer;
        try {
          data = Buffer.from(payload, "base64");
        } catch {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Ungültige Medien-Daten" });
        }
        if (!data.length || data.length > 8 * 1024 * 1024) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Bild oder Audio darf höchstens 8 MB groß sein" });
        }

        const safeName = input.filename.replace(/[^a-zA-Z0-9._-]/g, "_");
        try {
          const stored = await storagePut(
            `users/${ctx.user.id}/projects/${input.projectId}/${safeName}`,
            data,
            input.mimeType,
          );
          const result = await db.createAsset({
            projectId: input.projectId,
            userId: ctx.user.id,
            assetKey: stored.key,
            url: stored.url,
            filename: safeName,
            mimeType: input.mimeType,
            sizeBytes: data.length,
          });
          return { success: true, assetId: Number((result as any).insertId), ...stored };
        } catch (error: any) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message || "Medien-Upload fehlgeschlagen" });
        }
      }),
  }),

  // Project management
  projects: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      try {
        return await db.getUserProjects(ctx.user.id);
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch projects",
        });
      }
    }),

    get: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        try {
          const project = await db.getProjectById(input.projectId, ctx.user.id);
          if (!project) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Project not found",
            });
          }
          return project;
        } catch (error) {
          if (error instanceof TRPCError) throw error;
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to fetch project",
          });
        }
      }),

    create: protectedProcedure
      .input(
        z.object({
          title: z.string().min(1),
          description: z.string().optional(),
          language: z.enum(["de", "en"]),
          topic: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        try {
          await db.createProject(ctx.user.id, input);
          // Get the created project
          const projects = await db.getUserProjects(ctx.user.id);
          const newProject = projects[0];
          return { success: true, projectId: newProject?.id || 0 };
        } catch (error) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to create project",
          });
        }
      }),

    update: protectedProcedure
      .input(
        z.object({
          projectId: z.number(),
          title: z.string().optional(),
          description: z.string().optional(),
          status: z.enum(["draft", "generating", "completed", "failed"]).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        try {
          const project = await db.getProjectById(input.projectId, ctx.user.id);
          if (!project) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Project not found",
            });
          }

          await db.updateProject(input.projectId, ctx.user.id, {
            title: input.title,
            description: input.description,
            status: input.status,
          });

          return { success: true };
        } catch (error) {
          if (error instanceof TRPCError) throw error;
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to update project",
          });
        }
      }),
  }),

  // Video reel feed
  jobs: router({
    videoReel: protectedProcedure.query(async ({ ctx }) => {
      try {
        return await db.getUserVideoReel(ctx.user.id);
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch video reel",
        });
      }
    }),
  }),

  // Scene management
  scenes: router({
    list: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        try {
          const project = await db.getProjectById(input.projectId, ctx.user.id);
          if (!project) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Project not found",
            });
          }
          return await db.getProjectScenes(input.projectId);
        } catch (error) {
          if (error instanceof TRPCError) throw error;
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to fetch scenes",
          });
        }
      }),

    update: protectedProcedure
      .input(
        z.object({
          sceneId: z.number(),
          projectId: z.number(),
          narration: z.string().optional(),
          visualPrompt: z.string().optional(),
          durationSeconds: z.number().optional(),
          model: z.string().optional(),
          resolution: z.string().optional(),
          aspectRatio: z.string().optional(),
          generateAudio: z.boolean().optional(),
          audioAssetId: z.number().int().positive().nullable().optional(),
          audioUrl: z.string().min(1).nullable().optional(),
          audioFilename: z.string().max(255).nullable().optional(),
          audioSyncMode: z.enum(["auto", "manual"]).optional(),
          audioOffsetSeconds: z.number().min(0).max(3600).optional(),
          audioTransitionSeconds: z.number().min(0).max(2).optional(),
          audioStartSeconds: z.number().min(0).max(3600).optional(),
          audioEndSeconds: z.number().min(0).max(3600).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        try {
          const project = await db.getProjectById(input.projectId, ctx.user.id);
          if (!project) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Project not found",
            });
          }

          const scene = await db.getSceneById(input.sceneId);
          if (!scene || scene.projectId !== input.projectId) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Scene not found",
            });
          }

          let audioPatch: { audioAssetId?: number | null; audioUrl?: string | null; audioFilename?: string | null } = {};
          if (input.audioAssetId !== undefined) {
            if (input.audioAssetId === null) {
              audioPatch = { audioAssetId: null, audioUrl: null, audioFilename: null };
            } else {
              const audioAsset = await db.getAssetById(input.audioAssetId, input.projectId, ctx.user.id);
              if (!audioAsset || !audioAsset.mimeType?.startsWith("audio/")) {
                throw new TRPCError({ code: "NOT_FOUND", message: "Audio-Asset not found" });
              }
              audioPatch = { audioAssetId: audioAsset.id, audioUrl: audioAsset.url, audioFilename: audioAsset.filename || "Audio-Spur" };
            }
          }

          await db.updateScene(input.sceneId, {
            narration: input.narration,
            visualPrompt: input.visualPrompt,
            durationSeconds: input.durationSeconds,
            model: input.model,
            resolution: input.resolution,
            aspectRatio: input.aspectRatio,
            generateAudio: input.generateAudio,
            audioSyncMode: input.audioSyncMode,
            audioOffsetSeconds: input.audioOffsetSeconds === undefined ? undefined : input.audioOffsetSeconds.toFixed(3),
            audioTransitionSeconds: input.audioTransitionSeconds === undefined ? undefined : input.audioTransitionSeconds.toFixed(3),
            audioStartSeconds: input.audioStartSeconds === undefined ? undefined : input.audioStartSeconds.toFixed(3),
            audioEndSeconds: input.audioEndSeconds === undefined ? undefined : input.audioEndSeconds.toFixed(3),
            ...audioPatch,
          });

          return { success: true };
        } catch (error) {
          if (error instanceof TRPCError) throw error;
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to update scene",
          });
        }
      }),
  }),

  // Storyboard generation
  storyboard: router({
    generate: protectedProcedure
      .input(
        z.object({
          projectId: z.number(),
          topic: z.string().min(1),
          language: z.enum(["de", "en"]),
        })
      )
      .mutation(async ({ ctx, input }) => {
        try {
          const project = await db.getProjectById(input.projectId, ctx.user.id);
          if (!project) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Project not found",
            });
          }

          // Update project status
          await db.updateProject(input.projectId, ctx.user.id, {
            status: "generating",
            topic: input.topic,
          });

          // Generate storyboard using Groq
          const storyboard = await groqClient.generateStoryboard(input.topic, input.language);

          // Create scenes in database
          for (const scene of storyboard.scenes) {
            await db.createScene(input.projectId, {
              sceneNumber: scene.sceneNumber,
              narration: scene.narration,
              visualPrompt: scene.visualPrompt,
              durationSeconds: 3,
              model: "ltx-2.3",
              resolution: "480p",
              aspectRatio: "16:9",
              generateAudio: false,
            });
          }

          // Update project status to completed
          await db.updateProject(input.projectId, ctx.user.id, {
            status: "completed",
          });

          return {
            success: true,
            scenes: storyboard.scenes,
          };
        } catch (error: any) {
          // Update project status to failed
          await db.updateProject(input.projectId, ctx.user.id, {
            status: "failed",
          });
          if (error instanceof TRPCError) throw error;

          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: error.message || "Failed to generate storyboard",
          });
        }
      }),
  }),

  // Video generation
  videos: router({
    generateTextToVideo: protectedProcedure
      .input(
        z.object({
          sceneId: z.number(),
          projectId: z.number(),
          prompt: z.string().min(1),
          model: z.string(),
          resolution: z.string(),
          aspectRatio: z.string(),
          durationSeconds: z.number(),
          generateAudio: z.boolean().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        try {
          const project = await db.getProjectById(input.projectId, ctx.user.id);
          if (!project) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Project not found",
            });
          }

          const scene = await db.getSceneById(input.sceneId);
          if (!scene || scene.projectId !== input.projectId) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Scene not found",
            });
          }

          // Submit video generation to Magic Hour
          const jobId = await magicHourClient.submitTextToVideo({
            prompt: input.prompt,
            model: input.model,
            resolution: input.resolution,
            aspectRatio: input.aspectRatio,
            durationSeconds: input.durationSeconds,
            generateAudio: input.generateAudio,
          });

          // Create job record
          await db.createJob({
            projectId: input.projectId,
            sceneId: input.sceneId,
            jobId,
            type: "text-to-video",
            metadata: {
              prompt: input.prompt,
              model: input.model,
              resolution: input.resolution,
            },
          });

          // Update scene with job ID
          await db.updateScene(input.sceneId, {
            videoJobId: jobId,
            videoStatus: "processing",
          });

          return { success: true, jobId };
        } catch (error: any) {
          if (error instanceof TRPCError) throw error;
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: error.message || "Failed to generate video",
          });
        }
      }),

    getStatus: protectedProcedure
      .input(z.object({ jobId: z.string() }))
      .query(async ({ ctx, input }) => {
        try {
          const job = await db.getJobById(input.jobId);
          if (!job) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Job not found",
            });
          }

          // Check authorization
          const project = await db.getProjectById(job.projectId, ctx.user.id);
          if (!project) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "Not authorized to access this job",
            });
          }

          // Poll status from Magic Hour
          const status = await magicHourClient.getVideoStatus(input.jobId);

          // Update job record if status changed
          if (status.status === "completed" && status.result?.videoUrl) {
            await db.updateJob(input.jobId, {
              status: "completed",
              resultUrl: status.result.videoUrl,
              completedAt: new Date(),
            });

            if (job.sceneId) {
              await db.updateScene(job.sceneId, {
                videoUrl: status.result.videoUrl,
                videoStatus: "completed",
              });
            }
          } else if (status.status === "failed") {
            await db.updateJob(input.jobId, {
              status: "failed",
              errorMessage: status.error,
            });

            if (job.sceneId) {
              await db.updateScene(job.sceneId, {
                videoStatus: "failed",
              });
            }
          }

          return status;
        } catch (error: any) {
          if (error instanceof TRPCError) throw error;
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to get video status",
          });
        }
      }),
  }),

  // Image generation
  images: router({
    generateTextToImage: protectedProcedure
      .input(
        z.object({
          sceneId: z.number().optional(),
          projectId: z.number(),
          prompt: z.string().min(1),
          model: z.string(),
          resolution: z.string(),
          style: z.string(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        try {
          const project = await db.getProjectById(input.projectId, ctx.user.id);
          if (!project) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Project not found",
            });
          }

          // Submit image generation to Magic Hour
          const jobId = await magicHourClient.submitTextToImage({
            prompt: input.prompt,
            model: input.model,
            resolution: input.resolution,
            style: input.style,
          });

          // Create job record
          await db.createJob({
            projectId: input.projectId,
            sceneId: input.sceneId,
            jobId,
            type: "text-to-image",
            metadata: {
              prompt: input.prompt,
              model: input.model,
              style: input.style,
            },
          });

          if (input.sceneId) {
            await db.updateScene(input.sceneId, {
              imageJobId: jobId,
              imageStatus: "processing",
            });
          }

          return { success: true, jobId };
        } catch (error: any) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: error.message || "Failed to generate image",
          });
        }
      }),

    generateImageToVideo: protectedProcedure
      .input(z.object({
        sceneId: z.number().int().positive(),
        projectId: z.number().int().positive(),
        assetId: z.number().int().positive(),
        prompt: z.string().min(1),
        model: z.string().min(1),
        resolution: z.string().min(1),
        aspectRatio: z.string().min(1),
        durationSeconds: z.number().int().min(1).max(30),
        generateAudio: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const project = await db.getProjectById(input.projectId, ctx.user.id);
        const scene = await db.getSceneById(input.sceneId);
        const asset = await db.getAssetById(input.assetId, input.projectId, ctx.user.id);
        if (!project || !scene || scene.projectId !== input.projectId || !asset) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Project, scene, or asset not found" });
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
            generateAudio: input.generateAudio,
          });
          await db.createJob({
            projectId: input.projectId,
            sceneId: input.sceneId,
            jobId,
            type: "image-to-video",
            metadata: { assetId: input.assetId, prompt: input.prompt, model: input.model, resolution: input.resolution },
          });
          await db.updateScene(input.sceneId, { videoJobId: jobId, videoStatus: "processing" });
          return { success: true, jobId };
        } catch (error: any) {
          if (error instanceof TRPCError) throw error;
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message || "Failed to animate image" });
        }
      }),

    getStatus: protectedProcedure
      .input(z.object({ jobId: z.string() }))
      .query(async ({ ctx, input }) => {
        try {
          const job = await db.getJobById(input.jobId);
          if (!job) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Job not found",
            });
          }

          // Check authorization
          const project = await db.getProjectById(job.projectId, ctx.user.id);
          if (!project) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "Not authorized to access this job",
            });
          }

          // Poll status from Magic Hour
          const status = await magicHourClient.getImageStatus(input.jobId);

          // Update job record if status changed
          if (status.status === "completed" && status.result?.imageUrl) {
            await db.updateJob(input.jobId, {
              status: "completed",
              resultUrl: status.result.imageUrl,
              completedAt: new Date(),
            });

            if (job.sceneId) {
              await db.updateScene(job.sceneId, {
                imageUrl: status.result.imageUrl,
                imageStatus: "completed",
              });
            }
          } else if (status.status === "failed") {
            await db.updateJob(input.jobId, {
              status: "failed",
              errorMessage: status.error,
            });

            if (job.sceneId) {
              await db.updateScene(job.sceneId, {
                imageStatus: "failed",
              });
            }
          }

          return status;
        } catch (error: any) {
          if (error instanceof TRPCError) throw error;
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to get image status",
          });
        }
      }),
  }),
});

export type AppRouter = typeof appRouter;
