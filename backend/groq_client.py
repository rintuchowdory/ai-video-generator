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
    if not config.GROQ_PROXY_URL and not config.GROQ_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="Storyboard generation is not configured. Set GROQ_PROXY_URL or GROQ_API_KEY in backend/.env.",
        )

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
    headers = {"Content-Type": "application/json", "Accept": "application/json"}
    if not config.GROQ_PROXY_URL:
        headers["Authorization"] = f"Bearer {config.GROQ_API_KEY}"

    async with httpx.AsyncClient(timeout=httpx.Timeout(60.0, connect=15.0)) as client:
        try:
            response = await client.post(url, headers=headers, json=payload)
            response.raise_for_status()
        except httpx.HTTPError as error:
            provider_response = getattr(error, "response", None)
            detail = provider_response.text[:800] if provider_response is not None else str(error)
            raise HTTPException(status_code=502, detail=f"Groq storyboard request failed: {detail}") from error

    try:
        data = response.json()
        content = data["choices"][0]["message"]["content"]
        parsed = json.loads(content)
        scenes = parsed["scenes"]
    except (KeyError, IndexError, TypeError, ValueError, json.JSONDecodeError) as error:
        raise HTTPException(status_code=502, detail=f"Could not parse the storyboard provider response: {error}") from error

    if not isinstance(scenes, list):
        raise HTTPException(status_code=502, detail="Storyboard provider did not return a scenes array.")
    return [scene for scene in scenes if isinstance(scene, dict)][:scene_count]
