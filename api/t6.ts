import "dotenv/config";
import "../server/db";
export default function handler(req: any, res: any) {
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify({ ok: true, loaded: "t6" }));
}
