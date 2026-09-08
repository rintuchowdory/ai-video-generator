import "dotenv/config";
import { createApp } from "../server/_core/app";

const app = createApp();

/**
 * Vercel routes every /api/* request to this function via the rewrite
 * { "source": "/api/(.*)", "destination": "/api" } in vercel.json.
 * The original request path is preserved in req.url, so Express sees
 * /api/trpc/... and /api/manus-storage/... as expected.
 */
export default function handler(req: any, res: any) {
  if (typeof req.url === "string" && req.url.startsWith("/api/manus-storage/")) {
    // Storage URLs arrive rewritten from /manus-storage/* — normalize back.
    req.url = req.url.slice(4);
  }
  return app(req, res);
}
