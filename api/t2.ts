import "dotenv/config";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
export default function handler(req: any, res: any) {
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify({ ok: true, loaded: "t2" }));
}
