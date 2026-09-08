import type { IncomingMessage, ServerResponse } from "http";

/**
 * Temporary diagnostic endpoint used to debug Vercel routing.
 * Returns exactly what the function sees: URL, method, and all request headers.
 */
export default function handler(req: IncomingMessage, res: ServerResponse) {
  const headers = req.headers as Record<string, unknown>;
  res.setHeader("Content-Type", "application/json");
  res.end(
    JSON.stringify(
      {
        url: req.url,
        method: req.method,
        headers,
        env: {
          node: process.version,
          vercelRegion: process.env.VERCEL_REGION ?? null,
        },
      },
      null,
      2,
    ),
  );
}
