# Repository Repair Summary

## What was fixed

The project previously deployed only the Vite static bundle. Requests to `/api/trpc` therefore reached the single-page-app fallback and returned `index.html`, which caused the browser error stating that the API returned HTML instead of JSON. The repository now includes `api/[...path].ts`, a Vercel serverless adapter that runs the shared Express/tRPC application for every `/api/*` request. The Vercel configuration keeps the Vite frontend output in `dist/public` and rewrites the existing `/manus-storage/*` URLs to the server endpoint.

Manus OAuth has been removed from the running application. Instead, the server creates a random, HTTP-only `werkbank_guest_id` cookie for each browser and maps it to a database user record such as `guest:<uuid>`. Existing ownership checks still scope projects, generation jobs, and uploaded assets to that guest workspace. Visitors can now start at the landing page, open the dashboard, create a project, and use the generation workflow without an account or sign-in redirect.

## Hosting requirement

This is not a static-only application. GitHub Pages cannot run its API, database access, or server-side provider credentials. The committed root `index.html` has been replaced with a concise migration notice so the old static site no longer presents the broken app. Deploy the repository through Vercel, using the settings in [VERCEL_DEPLOY.md](./VERCEL_DEPLOY.md).

| Required server-side variable | Purpose |
|---|---|
| `DATABASE_URL` | Stores anonymous workspaces, projects, scenes, jobs, and asset metadata. |
| `GROQ_API_KEY` | Generates storyboards. |
| `MAGIC_HOUR_API_KEY` | Creates and checks image/video generation jobs. |

Uploads and image-to-video also require the existing Manus storage configuration described in the deployment guide. No API key is exposed to the browser.

## Privacy behavior

The guest workspace is private to the browser that holds the random cookie. It is not a user account: clearing site data, changing browser, or using a private window creates a new workspace and cannot restore earlier guest projects. A production deployment that needs cross-device recovery should use a separate, intentionally designed account or export mechanism rather than silently reintroducing OAuth.

## Validation completed

The repair was verified locally with the following commands:

```bash
pnpm check
pnpm build
pnpm test
```

All checks passed. The test suite contains an HTTP-level regression test that starts the Express application, calls `/api/trpc/provider.capabilities`, verifies a JSON response, and verifies that a guest-workspace cookie is issued.
