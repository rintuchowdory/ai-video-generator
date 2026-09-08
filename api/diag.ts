import type { IncomingMessage, ServerResponse } from "http";

/**
 * Temporary diagnostic endpoint that progressively imports the server modules
 * and reports which one fails. Used to pinpoint the Vercel FUNCTION_INVOCATION_FAILED.
 */
export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const steps: Record<string, string> = {};

  const tryImport = async (name: string, loader: () => Promise<unknown>) => {
    try {
      await loader();
      steps[name] = "ok";
    } catch (e) {
      steps[name] = `${(e as Error)?.name ?? "Error"}: ${(e as Error)?.message ?? String(e)}\n${((e as Error)?.stack ?? "").split("\n").slice(0, 6).join("\n")}`;
    }
  };

  await tryImport("dotenv", () => import("dotenv/config"));
  await tryImport("express", () => import("express"));
  await tryImport("env", () => import("../server/_core/env"));
  await tryImport("security", () => import("../server/_core/security"));
  await tryImport("storageProxy", () => import("../server/_core/storageProxy"));
  await tryImport("context", () => import("../server/_core/context"));
  await tryImport("routers", () => import("../server/routers"));
  await tryImport("app-module", () => import("../server/_core/app"));
  await tryImport("createApp-call", async () => {
    const mod = await import("../server/_core/app");
    const app = mod.createApp();
    // simulate invoking the express app like the real handler does
    return app;
  });
  await tryImport("groq-client", () => import("../server/groq_client"));
  await tryImport("magic-hour-client", () => import("../server/magic_hour_client"));

  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(steps, null, 2));
}
