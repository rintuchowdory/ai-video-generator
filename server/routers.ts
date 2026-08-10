import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { groqClient } from "./groq_client";
import { magicHourClient } from "./magic_hour_client";
import { TRPCError } from "@trpc/server";

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

          await db.updateScene(input.sceneId, {
            narration: input.narration,
            visualPrompt: input.visualPrompt,
            durationSeconds: input.durationSeconds,
            model: input.model,
            resolution: input.resolution,
            aspectRatio: input.aspectRatio,
            generateAudio: input.generateAudio,
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
