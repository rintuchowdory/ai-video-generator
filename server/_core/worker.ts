import { httpServerHandler } from "cloudflare:node";
import { createApp } from "./app";

/**
 * Entry for Cloudflare Workers (see wrangler.jsonc).
 *
 * Express is wired through the official cloudflare:node httpServerHandler:
 * the app listens on an in-process port and the handler adapts incoming
 * fetch() requests to Node-style req/res objects.
 *
 * The frontend (dist/public) is served by the static assets binding;
 * only /api/* reaches this worker (run_worker_first).
 *
 * This file is pre-bundled by scripts.build:cloudflare (esbuild) into
 * worker-dist/worker.js, and wrangler uploads it with no_bundle.
 */
const app = createApp();
app.listen(3000);

export default httpServerHandler({ port: 3000 });
