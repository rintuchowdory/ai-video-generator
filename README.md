# Werkbank — AI Video Generator

Werkbank turns one marketing topic into an editable scene-by-scene storyboard, then helps a team create short video assets from either text prompts or image references. It is designed for German and English social-media and advertising workflows, with a FastAPI backend that keeps provider credentials server-side and a Next.js editor for reviewing every scene before generation.

> **Important:** This repository does not contain an API key. Generate your own Magic Hour key in the [Developer Hub][1], place it in `backend/.env`, and never add it to a `NEXT_PUBLIC_*` variable or commit it to Git.

## What Changed

| Area | Previous behavior | Updated behavior |
| --- | --- | --- |
| Video defaults | Requested `kling-3.0` at `480p`, a combination Magic Hour does not document as compatible. | Defaults to **LTX 2.3 at 480p**, then exposes validated model, resolution, duration, aspect-ratio, and audio controls. |
| Video tools | Text-to-video only, with a hard-coded 16:9 output. | Text-to-video, text-to-image reference generation, image upload, and image-to-video workflows. |
| Job handling | The browser chose a generic status call and polling intervals were never cleaned up. | The backend records each project type; the browser uses cleanup-aware retry polling and displays provider errors. |
| Error handling | Missing provider configuration failed ambiguously. | The API returns explicit setup guidance for missing Groq or Magic Hour credentials. |
| Upload safety | No image input path. | Uploads are size-limited, pass through the backend, and receive short-lived opaque asset references. |
| Configuration | Legacy `KLING_*` naming implied a generic provider despite using Magic Hour-specific endpoints. | Uses `MAGIC_HOUR_*` settings, with read-only fallbacks for existing legacy environment variables. |

Magic Hour documents bearer-token authentication, asynchronous project IDs, text-to-video, image-to-video, image generation, and file uploads. Its documented models, allowed durations, audio support, and resolutions vary by model and account tier; Werkbank rejects incompatible pairs before submitting a billable request. [2] [3] [4]

## Features

| Workflow | What it does |
| --- | --- |
| **Storyboard** | Uses Groq to turn one topic into editable narration, visual prompts, and scene durations. |
| **Text-to-video** | Submits one reviewed scene at a time with a validated video model, resolution, ratio, duration, and optional audio. |
| **Text-to-image** | Generates a visual reference from a scene prompt, with an allow-listed image model and style choice. |
| **Image-to-video** | Animates an uploaded image or a completed in-app reference image with a motion prompt. |
| **Job status** | Polls the correct provider project type and renders finished video or image output in the browser. |
| **Safe uploads** | Sends images through the backend to Magic Hour storage; the browser never receives the provider API key. |

## Prerequisites

| Requirement | Purpose |
| --- | --- |
| Python 3.11+ | FastAPI backend |
| Node.js 20+ | Next.js frontend |
| Groq API key or Groq proxy URL | Storyboard generation |
| Magic Hour API key | Image and video generation |

Magic Hour’s quick-start material describes introductory and claimable credits for new accounts, but those are limited promotional credits rather than unlimited free API access. Check the provider dashboard for the current balance and model availability before generating media. [5]

## Setup

### 1. Configure the backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

Edit `backend/.env` and set the required secrets locally:

```dotenv
# Either use a server-side proxy …
GROQ_PROXY_URL=https://your-groq-proxy.example

# … or call Groq from the backend directly.
# GROQ_API_KEY=your_groq_key

MAGIC_HOUR_API_KEY=your_magic_hour_key
ALLOWED_ORIGINS=http://localhost:3000
```

Start the API:

```bash
uvicorn main:app --reload
```

### 2. Configure the frontend

```bash
cd ../frontend
npm ci
cp .env.local.example .env.local
npm run dev
```

The default local frontend URL is `http://localhost:3000`, while the default backend URL is `http://localhost:8000`. For a deployed frontend, set `NEXT_PUBLIC_API_BASE` to the public backend URL and update `ALLOWED_ORIGINS` on the backend to include the deployed frontend origin.

## Media Settings and Free-Tier-Safe Start

The interface starts with **LTX 2.3 at 480p**, which Magic Hour documents as supported on its free tier. **Kling 3.0 is selectable**, but it requires at least 720p according to the current API reference; the backend validates this before a request is submitted. [2]

| Use case | Recommended initial setting | Notes |
| --- | --- | --- |
| Fast low-cost tests | LTX 2.3, 480p, 3–5 seconds | Good for testing the full pipeline before spending more credits. |
| Cinematic scene draft | Kling 3.0, 720p, 5 seconds | Requires a compatible plan and sufficient credits. |
| Scene reference | Default image model, 640px | Creates an image that can be reviewed before animation. |
| Social vertical video | 9:16 | Use text-to-video for direct ratio control; image-to-video follows the input image geometry. |

## API Surface

| Route | Method | Purpose |
| --- | --- | --- |
| `/api/capabilities` | `GET` | Returns the server allow-list of supported models, resolutions, durations, styles, and ratios. |
| `/api/script` | `POST` | Creates an editable Groq storyboard. |
| `/api/generate` | `POST` | Starts text-to-video jobs for reviewed scenes. |
| `/api/images/generate` | `POST` | Starts a text-to-image reference job. |
| `/api/assets/images` | `POST` | Uploads an image for image-to-video; accepts multipart form data. |
| `/api/videos/from-image` | `POST` | Starts an image-to-video job from an uploaded asset or generated image. |
| `/api/status/{job_id}` | `GET` | Polls a project that was created in the current backend process. |

## Validation

The current revision has been verified with the following commands:

```bash
# Backend API contracts
cd backend
source .venv/bin/activate
python -m unittest discover -s tests -v

# Frontend type-check and production build
cd ../frontend
npm run build
```

The backend tests cover the free-tier-safe capabilities response, rejection of the invalid Kling 3.0 + 480p combination, explicit missing-key errors, and protection against polling unknown jobs. The frontend production build completed successfully.

## Current Limitations

Werkbank deliberately keeps job metadata and temporary image references in memory. A backend restart prevents status lookup for prior jobs, and it expires temporary image references after one hour by default. Magic Hour handles its own provider-side retention; production deployments should add persistent project storage and object storage before supporting long-lived customer projects. Magic Hour also offers webhooks for video and image completion, which are preferable to client polling in a publicly deployed production service. [6]

## Suggested Next Milestones

| Priority | Improvement |
| --- | --- |
| High | Persist users, projects, jobs, and provider metadata in a database. |
| High | Store completed media in an application-controlled object store and refresh expiring provider URLs. |
| Medium | Add webhook verification and event-driven project updates for a public deployment. |
| Medium | Add clip stitching, captions, branding, and final export. |
| Medium | Add authentication, usage limits, and an audit trail before sharing the application with customers. |

## References

[1]: https://magichour.ai/developer "Magic Hour Developer Hub"
[2]: https://docs.magichour.ai/api-reference/video-projects/text-to-video "Magic Hour Text-to-Video API Reference"
[3]: https://docs.magichour.ai/api-reference/video-projects/image-to-video "Magic Hour Image-to-Video API Reference"
[4]: https://docs.magichour.ai/api-reference/image-projects/ai-image-generator "Magic Hour AI Image Generator API Reference"
[5]: https://docs.magichour.ai/get-started/quick-start "Magic Hour Quick Start"
[6]: https://docs.magichour.ai/integration/webhook/overview "Magic Hour Webhook Overview"
