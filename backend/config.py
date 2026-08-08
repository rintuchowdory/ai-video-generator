import os
from dotenv import load_dotenv

load_dotenv()


# --- Groq (storyboard generation) ---
# Point this at your own Cloudflare Worker proxy so the real Groq key never
# reaches the browser. If no proxy is configured, the backend calls Groq
# directly with GROQ_API_KEY.
GROQ_PROXY_URL = os.getenv("GROQ_PROXY_URL", "")
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_API_URL = os.getenv("GROQ_API_URL", "https://api.groq.com/openai/v1/chat/completions")
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")

# --- Magic Hour media generation ---
# MAGIC_HOUR_* is the current configuration namespace. KLING_* values are
# honored as fallbacks to avoid breaking existing local deployments.
MAGIC_HOUR_API_BASE_URL = os.getenv(
    "MAGIC_HOUR_API_BASE_URL",
    os.getenv("KLING_API_BASE_URL", "https://api.magichour.ai/v1"),
).rstrip("/")
MAGIC_HOUR_API_KEY = os.getenv("MAGIC_HOUR_API_KEY", os.getenv("KLING_API_KEY", ""))

# Model, resolution, duration, and audio choices are validated per request.
# The browser receives only an allow-listed capabilities document; API keys
# and provider endpoints remain server-side.

# Limit image uploads before requesting a provider upload URL. This protects a
# small self-hosted deployment from accidental or hostile oversized uploads.
MAX_IMAGE_UPLOAD_BYTES = int(os.getenv("MAX_IMAGE_UPLOAD_BYTES", str(10 * 1024 * 1024)))
ASSET_TTL_SECONDS = int(os.getenv("ASSET_TTL_SECONDS", "3600"))

# --- App ---
ALLOWED_ORIGINS = [origin.strip() for origin in os.getenv(
    "ALLOWED_ORIGINS", "http://localhost:3000"
).split(",") if origin.strip()]


def magic_hour_is_configured() -> bool:
    """Return whether the backend can make authenticated Magic Hour requests."""
    return bool(MAGIC_HOUR_API_KEY)
