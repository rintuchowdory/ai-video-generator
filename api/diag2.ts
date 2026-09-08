import type { IncomingMessage, ServerResponse } from "http";

/**
 * Temporary diagnostic: statically imports the real app (same import chain as
 * the API function) and reports whether createApp() succeeds, plus which env
 * vars are present (names only).
 */
import "dotenv/config";
import { createApp } from "../server/_core/app";

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const report: Record<string, unknown> = {
    moduleLoaded: true,
    env: {
      node: process.version,
      hasSupabaseDbUrl: !!process.env.SUPABASE_DB_URL,
      hasGroqKey: !!process.env.GROQ_API_KEY,
      hasMagicHourKey: !!process.env.MAGIC_HOUR_API_KEY,
      hasForgeApiUrl: !!process.env.BUILT_IN_FORGE_API_URL,
      nodeEnv: process.env.NODE_ENV ?? null,
    },
  };
  try {
    const app = createApp();
    report.createApp = "ok";
    void app;
  } catch (e) {
    const err = e as Error;
    report.createApp = `${err.name}: ${err.message}\n${(err.stack ?? "").split("\n").slice(0, 8).join("\n")}`;
  }
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(report, null, 2));
}
