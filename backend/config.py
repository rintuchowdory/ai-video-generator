import os
from dotenv import load_dotenv

load_dotenv()


# --- Groq (script/storyboard generation) ---
# Point this at your own Cloudflare Worker proxy (e.g. groq-proxy.chowdoryrintu.workers.dev)
# so the real Groq key never lives in this backend. Falls back to calling Groq directly
# if GROQ_PROXY_URL isn't set.
GROQ_PROXY_URL = os.getenv("GROQ_PROXY_URL", "")
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_API_URL = os.getenv("GROQ_API_URL", "https://api.groq.com/openai/v1/chat/completions")
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")

# --- Video generation (Kling-compatible async gateway) ---
# Works with any provider that exposes an OpenAI-style async submit/poll pattern
# (official Kling API, or a gateway like fal.ai / Renderful / Evolink / Atlas Cloud).
# Swap KLING_API_BASE_URL + KLING_API_KEY to change provider without touching code.
KLING_API_BASE_URL = os.getenv("KLING_API_BASE_URL", "https://api.evolink.ai/v1")
KLING_API_KEY = os.getenv("KLING_API_KEY", "")
KLING_MODEL = os.getenv("KLING_MODEL", "kling-v3-text-to-video")

# --- App ---
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")
