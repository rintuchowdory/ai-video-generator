# Publish Readiness

The application now starts directly in an **anonymous browser workspace**. Visitors do not need a Manus account or any other login. A random HTTP-only cookie maps a browser to its private set of projects, jobs, and uploaded assets.

The app must run on a Node-capable host because its tRPC backend stores projects and keeps provider credentials server-side. The repository includes a Vercel adapter in `api/[...path].ts`; publishing only `dist/public` (for example through GitHub Pages) is unsupported and causes `/api/trpc` to return the Vite HTML fallback instead of JSON.

Before publishing, configure the Supabase PostgreSQL connection URI as `SUPABASE_DB_URL`, plus `MAGIC_HOUR_API_KEY` and `GROQ_API_KEY` in the hosting provider. See [VERCEL_DEPLOY.md](./VERCEL_DEPLOY.md) for the required Vercel settings, migration command, and optional upload-storage configuration. A `sb_secret_...` API key is not a database connection URI and is not used by Drizzle.
