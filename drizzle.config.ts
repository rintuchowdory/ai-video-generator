import { defineConfig } from "drizzle-kit";

const connectionString = process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("SUPABASE_DB_URL or DATABASE_URL is required to run drizzle commands");
}
if (connectionString.startsWith("sb_")) {
  throw new Error("Use the Supabase PostgreSQL connection URI for SUPABASE_DB_URL/DATABASE_URL, not the sb_secret API key");
}

const migrationUrl = new URL(connectionString);
if (migrationUrl.protocol !== "postgres:" && migrationUrl.protocol !== "postgresql:") {
  throw new Error("SUPABASE_DB_URL/DATABASE_URL must be a PostgreSQL connection URI");
}
migrationUrl.searchParams.set("sslmode", "require");
migrationUrl.searchParams.set("uselibpqcompat", "true");

export default defineConfig({
  schema: "./drizzle/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: migrationUrl.toString(),
  },
});
