import httpx
from fastapi import HTTPException

import config


async def submit_video_job(prompt: str, duration_seconds: int, aspect_ratio: str) -> str:
    """Submit a text-to-video generation job to Magic Hour. Returns the project id."""
    url = f"{config.KLING_API_BASE_URL}/text-to-video"
    headers = {
        "Authorization": f"Bearer {config.KLING_API_KEY}",
        "Content-Type": "application/json",
        "Accept": "application/json",
    }
    payload = {
        "name": f"Werkbank scene ({prompt[:40]})",
        "end_seconds": duration_seconds,
        "aspect_ratio": aspect_ratio,
        "resolution": config.KLING_RESOLUTION,
        "model": config.KLING_MODEL,
        "audio": False,
        "style": {"prompt": prompt},
    }

    async with httpx.AsyncClient(timeout=30) as client:
        try:
            resp = await client.post(url, headers=headers, json=payload)
            resp.raise_for_status()
        except httpx.HTTPError as e:
            detail = getattr(e, "response", None)
            body = detail.text if detail is not None else ""
            raise HTTPException(status_code=502, detail=f"Video job submission failed: {e} {body}")

    data = resp.json()
    job_id = data.get("id")
    if not job_id:
        raise HTTPException(status_code=502, detail=f"No project id in provider response: {data}")
    return job_id


async def poll_video_job(job_id: str) -> dict:
    """Check job status. Returns {"status": ..., "video_url": ..., "error": ...}."""
    url = f"{config.KLING_API_BASE_URL}/video-projects/{job_id}"
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
        "draft": "queued",
        "queued": "queued",
        "pending": "queued",
        "processing": "processing",
        "rendering": "processing",
        "complete": "completed",
        "completed": "completed",
        "error": "failed",
        "failed": "failed",
    }
    status = status_map.get(raw_status, "processing")

    video_url = None
    downloads = data.get("downloads") or []
    if downloads and isinstance(downloads, list):
        video_url = downloads[0].get("url")

    return {
        "status": status,
        "video_url": video_url,
        "error": data.get("error"),
    }
