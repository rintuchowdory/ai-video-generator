import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
export default function handler(req: any, res: any) {
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify({ ok: true, loaded: "t5" }));
}
