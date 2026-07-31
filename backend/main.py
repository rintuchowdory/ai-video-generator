from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import config
import groq_client
import kling_client
from schemas import (
    ScriptRequest, ScriptResponse, Scene,
    GenerateRequest, GenerateResponse, SceneJob,
    StatusResponse,
)

app = FastAPI(title="AI Video Generator", version="0.2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=config.ALLOWED_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {"message": "AI Video Generator API", "status": "ok"}


@app.post("/api/script", response_model=ScriptResponse)
async def create_script(req: ScriptRequest):
    """Turn a single topic into a scene-by-scene storyboard via Groq."""
    raw_scenes = await groq_client.generate_storyboard(
        topic=req.topic,
        language=req.language,
        scene_count=req.scene_count,
        tone=req.tone,
    )
    scenes = [
        Scene(
            index=i,
            narration=s.get("narration", ""),
            visual_prompt=s.get("visual_prompt", ""),
            duration_seconds=s.get("duration_seconds", 5),
        )
        for i, s in enumerate(raw_scenes)
    ]
    return ScriptResponse(topic=req.topic, language=req.language, scenes=scenes)


@app.post("/api/generate", response_model=GenerateResponse)
async def generate_videos(req: GenerateRequest):
    """Submit one video generation job per scene to the Kling-compatible provider."""
    jobs: list[SceneJob] = []
    for scene in req.scenes:
        job_id = await kling_client.submit_video_job(
            prompt=scene.visual_prompt,
            duration_seconds=scene.duration_seconds,
            aspect_ratio=req.aspect_ratio,
        )
        jobs.append(SceneJob(scene_index=scene.index, job_id=job_id, status="queued"))
    return GenerateResponse(jobs=jobs)


@app.get("/api/status/{job_id}", response_model=StatusResponse)
async def check_status(job_id: str):
    """Poll a single scene's video generation job."""
    result = await kling_client.poll_video_job(job_id)
    return StatusResponse(
        job_id=job_id,
        status=result["status"],
        video_url=result["video_url"],
        error=result["error"],
    )
