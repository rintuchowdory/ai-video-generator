import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { configureSecurity } from "./security";
import { registerStorageProxy } from "./storageProxy";

/**
 * Shared HTTP application for local Node hosting and the Vercel serverless
 * adapter. API routes are registered before any frontend static fallback.
 */
export function createApp() {
  const app = express();

  configureSecurity(app);
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  registerStorageProxy(app);
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    }),
  );

  return app;
}
