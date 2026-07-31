import json
import httpx
from fastapi import HTTPException

import config

SYSTEM_PROMPT = {
    "de": (
        "Du bist ein Kreativdirektor fuer kurze Marketing- und Social-Media-Videos "
        "fuer deutsche KMUs. Erstelle ein Storyboard als JSON. "
        'Antworte NUR mit validem JSON in dieser Form: '
        '{"scenes": [{"narration": "...", "visual_prompt": "...", "duration_seconds": 5}]}. '
        "visual_prompt muss auf Englisch sein und detailliert genug fuer ein Text-zu-Video-Modell "
        "(Kamera, Bewegung, Licht, Stil). narration ist auf Deutsch."
    ),
    "en": (
        "You are a creative director for short marketing/social videos. "
        "Create a storyboard as JSON. Respond ONLY with valid JSON in this shape: "
        '{"scenes": [{"narration": "...", "visual_prompt": "...", "duration_seconds": 5}]}. '
        "visual_prompt must be detailed enough for a text-to-video model "
        "(camera movement, lighting, style). narration is in English."
    ),
}


async def generate_storyboard(topic: str, language: str, scene_count: int, tone: str) -> list[dict]:
    user_prompt = (
        f"Thema/Topic: {topic}\n"
        f"Anzahl Szenen/Scene count: {scene_count}\n"
        f"Ton/Tone: {tone}\n"
    )

    payload = {
        "model": config.GROQ_MODEL,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT[language]},
            {"role": "user", "content": user_prompt},
        ],
        "temperature": 0.7,
        "response_format": {"type": "json_object"},
    }

    url = config.GROQ_PROXY_URL or config.GROQ_API_URL
    headers = {"Content-Type": "application/json"}
    if not config.GROQ_PROXY_URL:
        # Talking to Groq directly requires the key here; a proxy (recommended)
        # holds the key server-side instead.
        headers["Authorization"] = f"Bearer {config.GROQ_API_KEY}"

    async with httpx.AsyncClient(timeout=60) as client:
        try:
            resp = await client.post(url, headers=headers, json=payload)
            resp.raise_for_status()
        except httpx.HTTPError as e:
            raise HTTPException(status_code=502, detail=f"Groq request failed: {e}")

    data = resp.json()
    try:
        content = data["choices"][0]["message"]["content"]
        parsed = json.loads(content)
        scenes = parsed["scenes"][:scene_count]
    except (KeyError, IndexError, json.JSONDecodeError) as e:
        raise HTTPException(status_code=502, detail=f"Could not parse Groq response: {e}")

    return scenes
