# Werkbank — AI Video Generator

Turn one topic into a scene-by-scene storyboard (via Groq) and generate each
scene as a short video (via a Kling-compatible video generation API).
Built for German SMBs and marketers who need short ad/social clips fast, in
their own language.

## How it works

1. You give it a topic ("Eroeffnung unseres neuen Cafes in Aachen").
2. Groq writes a scene-by-scene storyboard: narration + a detailed visual
   prompt per scene.
3. You review/edit the storyboard.
4. Each scene is submitted to a video generation API (Kling 3.0 or any
   Kling-compatible gateway) and polled until the clip is ready.

## Quick Start

### Backend

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # fill in GROQ_* and KLING_* values
uvicorn main:app --reload
```

### Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local   # point NEXT_PUBLIC_API_BASE at your backend
npm run dev
```

Open http://localhost:3000.

## Configuration

**Groq** (storyboard generation): set `GROQ_PROXY_URL` to your own Cloudflare
Worker proxy (recommended, keeps the API key server-side) or set
`GROQ_API_KEY` to call Groq directly.

**Video generation**: `KLING_API_BASE_URL` + `KLING_API_KEY` point at any
provider that implements the async submit/poll pattern
(`POST /videos/generations` → `GET /videos/generations/{id}`). This works with
the official Kling API or a pay-as-you-go gateway (fal.ai, Renderful,
Evolink, Atlas Cloud, etc.) without changing any code — only the base URL,
key, and `KLING_MODEL` name.

## Architecture

```
frontend/         Next.js 15 app (storyboard editor + generation UI)
backend/
  main.py         FastAPI routes: /api/script, /api/generate, /api/status/{id}
  groq_client.py  Storyboard generation via Groq
  kling_client.py Video job submit/poll against a Kling-compatible API
  schemas.py      Request/response models
  config.py       Env var configuration
```

## Roadmap

- [ ] Stitch generated scene clips into one final video (ffmpeg)
- [ ] Persist storyboards/jobs (SQLite/Postgres) instead of in-memory state
- [ ] User accounts + saved projects
- [ ] DSGVO-compliant storage for generated media (EU region)
