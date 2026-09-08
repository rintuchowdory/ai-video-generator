import "dotenv/config";
import { Pool } from "pg";
export default function handler(req: any, res: any) {
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify({ ok: true, loaded: "t4" }));
}
