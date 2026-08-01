import os
from dotenv import load_dotenv

load_dotenv()


# --- Groq (script/storyboard generation) ---
# Groq hosts open-source models (Llama 3.3 70B, etc.) and offers a FREE API key.
# Get yours at https://console.groq.com/keys — no credit card required.
#
# Two modes:
#   1. Direct (recommended for getting started): set GROQ_API_KEY and leave
#      GROQ_PROXY_URL empty. The key is sent directly to api.groq.com.
#   2. Proxy (for production): set GROQ_PROXY_URL to your own Cloudflare Worker
#      proxy so the real key never lives in this backend.
GROQ_PROXY_URL = os.getenv("GROQ_PROXY_URL", "")
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_API_URL = os.getenv("GROQ_API_URL", "https://api.groq.com/openai/v1/chat/completions")
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")

# --- Video generation (Magic Hour API — supports Kling 3.0 and other models) ---
# Free tier: sign up at https://magichour.ai/developer, no credit card required.
# Free users are limited to 576px resolution.
KLING_API_BASE_URL = os.getenv("KLING_API_BASE_URL", "https://api.magichour.ai/v1")
KLING_API_KEY = os.getenv("KLING_API_KEY", "")
KLING_MODEL = os.getenv("KLING_MODEL", "kling-3.0")
KLING_RESOLUTION = os.getenv("KLING_RESOLUTION", "480p")  # 480p works on free tier

# --- App ---
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")


def has_groq() -> bool:
    return bool(GROQ_PROXY_URL or GROQ_API_KEY)


def has_video() -> bool:
    return bool(KLING_API_KEY)
