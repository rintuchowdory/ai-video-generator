import "dotenv/config";
import { createApp } from "../server/_core/app";

const app = createApp();

/**
 * Vercel routes every /api/* request to this Express application. Storage URLs
 * are rewritten from /manus-storage/* to /api/manus-storage/* and normalized
 * back before Express handles them.
 */
export default function handler(req: any, res: any) {
  if (typeof req.url === "string" && req.url.startsWith("/api/manus-storage/")) {
    req.url = req.url.slice(4);
  }
  return app(req, res);
}
