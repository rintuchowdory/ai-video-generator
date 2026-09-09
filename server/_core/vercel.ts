import "dotenv/config";
import { createApp } from "./app";

const app = createApp();

/**
 * Entry for the Vercel serverless function. This file is pre-bundled by the
 * build script (see package.json "build") into api/index.js so that all
 * server/ sources are inlined and only node_modules remain external.
 * Vercel routes every /api/* request here via the
 * { "source": "/api/(.*)", "destination": "/api" } rewrite in vercel.json.
 */
export default function handler(req: any, res: any) {
  if (typeof req.url === "string" && req.url.startsWith("/api/manus-storage/")) {
    // Storage URLs arrive rewritten from /manus-storage/* — normalize back.
    req.url = req.url.slice(4);
  }
  return app(req, res);
}
