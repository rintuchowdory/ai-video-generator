import httpx
from fastapi import HTTPException

import config


async def submit_video_job(prompt: str, duration_seconds: int, aspect_ratio: str) -> str:
    """Submit a text-to-video generation job. Returns the provider's job/request id."""
    url = f"{config.KLING_API_BASE_URL}/videos/generations"
    headers = {
        "Authorization": f"Bearer {config.KLING_API_KEY}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": config.KLING_MODEL,
        "prompt": prompt,
        "duration": duration_seconds,
        "aspect_ratio": aspect_ratio,
    }

    async with httpx.AsyncClient(timeout=30) as client:
        try:
            resp = await client.post(url, headers=headers, json=payload)
            resp.raise_for_status()
        except httpx.HTTPError as e:
            raise HTTPException(status_code=502, detail=f"Video job submission failed: {e}")

    data = resp.json()
    job_id = data.get("id") or data.get("request_id") or data.get("task_id")
    if not job_id:
        raise HTTPException(status_code=502, detail=f"No job id in provider response: {data}")
    return job_id


async def poll_video_job(job_id: str) -> dict:
    """Check job status. Returns {"status": ..., "video_url": ..., "error": ...}."""
    url = f"{config.KLING_API_BASE_URL}/videos/generations/{job_id}"
    headers = {"Authorization": f"Bearer {config.KLING_API_KEY}"}

    async with httpx.AsyncClient(timeout=30) as client:
        try:
            resp = await client.get(url, headers=headers)
            resp.raise_for_status()
        except httpx.HTTPError as e:
            raise HTTPException(status_code=502, detail=f"Status check failed: {e}")

    data = resp.json()
    raw_status = str(data.get("status", "")).lower()

    status_map = {
        "queued": "queued",
        "pending": "queued",
        "processing": "processing",
        "running": "processing",
        "completed": "completed",
        "succeeded": "completed",
        "failed": "failed",
        "error": "failed",
    }
    status = status_map.get(raw_status, "processing")

    video_url = None
    output = data.get("output") or {}
    media = output.get("media_url") if isinstance(output, dict) else None
    if isinstance(media, list) and media:
        video_url = media[0]
    elif isinstance(media, str):
        video_url = media
    elif data.get("video_url"):
        video_url = data["video_url"]

    return {
        "status": status,
        "video_url": video_url,
        "error": data.get("error"),
    }
