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

# --- Video generation (Magic Hour API — supports Kling 3.0 and other models) ---
# Free tier: sign up at https://magichour.ai/developer, no credit card required.
KLING_API_BASE_URL = os.getenv("KLING_API_BASE_URL", "https://api.magichour.ai/v1")
KLING_API_KEY = os.getenv("KLING_API_KEY", "")
KLING_MODEL = os.getenv("KLING_MODEL", "kling-3.0")
KLING_RESOLUTION = os.getenv("KLING_RESOLUTION", "480p")  # 480p is the free-tier default

# --- App ---
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")
