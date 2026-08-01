# Werkbank — AI Video Generator

Turn one topic into a scene-by-scene storyboard (via Groq) and generate each
scene as a short video (via Magic Hour / Kling 3.0).
Built for German SMBs and marketers who need short ad/social clips fast, in
their own language.

## How it works

1. You give it a topic ("Eroeffnung unseres neuen Cafes in Aachen").
2. Groq (free, open-source Llama 3.3 70B) writes a scene-by-scene storyboard:
   narration + a detailed visual prompt per scene.
3. You review/edit the storyboard.
4. Each scene is submitted to Magic Hour's video generation API (Kling 3.0)
   and polled until the clip is ready.

## Quick Start

### 1. Get free API keys

Both services offer free tiers — no credit card required:

| Service | Purpose | Sign up |
|---------|---------|---------|
| Groq | Storyboard generation (Llama 3.3 70B) | https://console.groq.com/keys |
| Magic Hour | Video generation (Kling 3.0) | https://magichour.ai/developer |

### 2. Backend

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # fill in GROQ_API_KEY and KLING_API_KEY
uvicorn main:app --reload
```

Check your setup at http://localhost:8000/api/health — it shows which keys
are configured and in what mode (direct vs proxy).

### 3. Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local   # point NEXT_PUBLIC_API_BASE at your backend
npm run dev
```

Open http://localhost:3000.

## Configuration

**Groq** (storyboard generation): set `GROQ_API_KEY` to call Groq directly
(recommended for getting started — free key from console.groq.com). For
production, set `GROQ_PROXY_URL` to your own Cloudflare Worker proxy instead,
so the raw key never lives in the backend.

**Video generation**: `KLING_API_BASE_URL` + `KLING_API_KEY` point at Magic
Hour's API. Free tier limits resolution to 576px; set `KLING_RESOLUTION=480p`
to stay within the free tier.

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | API status |
| `/api/health` | GET | Shows which API keys are configured |
| `/api/script` | POST | Generate a storyboard from a topic |
| `/api/generate` | POST | Submit video generation jobs for each scene |
| `/api/status/{job_id}` | GET | Poll a single video job's status |

## Architecture

```
frontend/         Next.js 15 app (storyboard editor + generation UI)
backend/
  main.py         FastAPI routes: /api/health, /api/script, /api/generate, /api/status/{id}
  groq_client.py  Storyboard generation via Groq (free, open-source Llama models)
  kling_client.py Video job submit/poll against Magic Hour API
  schemas.py      Request/response models
  config.py       Env var configuration + helper checks
```

## Roadmap

- [ ] Stitch generated scene clips into one final video (ffmpeg)
- [ ] Persist storyboards/jobs (SQLite/Postgres) instead of in-memory state
- [ ] User accounts + saved projects
- [ ] DSGVO-compliant storage for generated media (EU region)
