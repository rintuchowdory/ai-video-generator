# Vercel + Supabase Deployment

This application uses a Vite frontend, a Node/tRPC API, and Drizzle ORM against PostgreSQL. Deploy it on Vercel; GitHub Pages is static-only and cannot run `/api/trpc`, database queries, or the storage proxy.

## 1. Vercel project settings

Use the repository root as the **Root Directory** and configure:

| Setting | Value |
|---|---|
| Framework Preset | `Vite` |
| Build Command | `pnpm build` |
| Output Directory | `dist/public` |
| Install Command | `pnpm install --frozen-lockfile` |

The Vercel adapter in `api/[...path].ts` runs the Express/tRPC backend. The SPA fallback in `vercel.json` keeps `/dashboard` and `/project/...` routes from returning 404.

## 2. Supabase database connection

Create or select a Supabase project, then open **Connect → Connection string**. Use the **Transaction pooler** URI for serverless Vercel deployments. It normally looks like this:

```env
SUPABASE_DB_URL=postgresql://postgres.<project-ref>:[DATABASE-PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres
```

Set `SUPABASE_DB_URL` for Production, Preview, and Development in Vercel. `DATABASE_URL` remains supported as a fallback for local development. Do not commit the URI or database password.

> A value beginning with `sb_secret_` is a Supabase API secret key, not a PostgreSQL connection URI. It cannot replace `SUPABASE_DB_URL`. Keep it private and rotate it if it was exposed. The current server does not need that API key for Drizzle database access.

## 3. Apply the schema

From a trusted environment with `SUPABASE_DB_URL` set, run:

```bash
pnpm install --frozen-lockfile
pnpm db:push
```

This generates/applies the PostgreSQL baseline migration in `drizzle/0000_*.sql`. The migration creates the enum types and the `users`, `projects`, `scenes`, `jobs`, and `assets` tables. Do not run the old MySQL migrations; they were replaced by this PostgreSQL baseline.

For Vercel, apply the migration once from a local machine or CI job using the same Supabase connection URI. Vercel serverless functions should only execute application queries at runtime.

## 4. Other environment variables

Configure these server-side variables in Vercel:

```env
GROQ_API_KEY=gsk_...
MAGIC_HOUR_API_KEY=mhk_live_...
```

Uploads, audio, image-to-video, and other Manus-backed features additionally require:

```env
BUILT_IN_FORGE_API_URL=https://...
BUILT_IN_FORGE_API_KEY=...
```

The anonymous workspace uses a random HTTP-only `werkbank_guest_id` cookie. No OAuth or login variable is required.

## 5. Validate the deployment

After Vercel deploys, check the API endpoint:

```text
https://YOUR-VERCEL-DOMAIN.vercel.app/api/trpc/provider.capabilities?batch=1&input=%7B%220%22%3A%7B%22json%22%3Anull%7D%7D
```

It should return JSON. If it returns HTML, the deployment is still static-only or the API function was not included.
