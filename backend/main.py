from __future__ import annotations

from dataclasses import dataclass

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

import config
from asset_store import asset_store
import groq_client
from magic_hour_client import magic_hour
from schemas import (
    GenerateRequest,
    GenerateResponse,
    ImageGenerationRequest,
    ImageToVideoRequest,
    ProjectKind,
    ProviderCapabilitiesResponse,
    ProviderModelOption,
    Scene,
    SceneJob,
    ScriptRequest,
    ScriptResponse,
    StatusResponse,
    UploadImageResponse,
    VIDEO_MODEL_OPTIONS,
)


@dataclass(frozen=True)
class JobMetadata:
    kind: ProjectKind
    workflow: str
    scene_index: int | None = None


app = FastAPI(title="Werkbank AI Video Generator", version="0.3.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=config.ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
    max_age=600,
)

# The provider only returns a generic project ID. Retaining the project type on
# the backend prevents the browser from choosing arbitrary provider endpoints.
job_registry: dict[str, JobMetadata] = {}


def remember_job(job_id: str, *, kind: ProjectKind, workflow: str, scene_index: int | None = None) -> SceneJob:
    job_registry[job_id] = JobMetadata(kind=kind, workflow=workflow, scene_index=scene_index)
    return SceneJob(
        scene_index=scene_index,
        job_id=job_id,
        kind=kind,
        workflow=workflow,
        status="queued",
    )


@app.get("/")
def root():
    return {
        "message": "Werkbank AI Video Generator API",
        "status": "ok",
        "magic_hour_configured": config.magic_hour_is_configured(),
    }


@app.get("/api/capabilities", response_model=ProviderCapabilitiesResponse)
def get_capabilities():
    video_models = [
        ProviderModelOption(
            id=model_id,
            label=str(details["label"]),
            resolutions=list(details["resolutions"]),
            durations=list(details["durations"]),
            supports_audio=bool(details["audio"]),
        )
        for model_id, details in VIDEO_MODEL_OPTIONS.items()
    ]
    return ProviderCapabilitiesResponse(
        video_models=video_models,
        image_models=[
            ProviderModelOption(
                id="default",
                label="Best available",
                resolutions=["640px", "1k", "2k", "4k"],
                durations=[],
                supports_audio=False,
            ),
            ProviderModelOption(
                id="flux-schnell",
                label="Flux Schnell — fast image draft",
                resolutions=["640px", "1k", "2k"],
                durations=[],
                supports_audio=False,
            ),
            ProviderModelOption(
                id="flux-2-klein",
                label="Flux 2 Klein — concise image work",
                resolutions=["640px", "1k", "2k"],
                durations=[],
                supports_audio=False,
            ),
            ProviderModelOption(
                id="z-image-turbo",
                label="Z-Image Turbo — fast image draft",
                resolutions=["640px", "1k", "2k"],
                durations=[],
                supports_audio=False,
            ),
        ],
        image_style_tools=[
            "general",
            "ai-photo-generator",
            "ai-illustration-generator",
            "ai-logo-generator",
            "movie-poster-generator",
            "thumbnail-maker",
        ],
        aspect_ratios=["16:9", "9:16", "1:1"],
    )


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
            narration=str(scene.get("narration", "")).strip() or "Narration not supplied.",
            visual_prompt=str(scene.get("visual_prompt", "")).strip() or "Visual prompt not supplied.",
            duration_seconds=scene.get("duration_seconds", 5),
        )
        for i, scene in enumerate(raw_scenes)
        if isinstance(scene, dict)
    ]
    if not scenes:
        raise HTTPException(status_code=502, detail="Storyboard provider returned no usable scenes.")
    return ScriptResponse(topic=req.topic, language=req.language, scenes=scenes)


@app.post("/api/generate", response_model=GenerateResponse)
async def generate_videos(req: GenerateRequest):
    """Submit one text-to-video project for each reviewed storyboard scene."""
    jobs: list[SceneJob] = []
    for scene in req.scenes:
        job_id = await magic_hour.submit_text_to_video(
            prompt=scene.visual_prompt,
            duration_seconds=scene.duration_seconds,
            aspect_ratio=req.options.aspect_ratio,
            model=req.options.model,
            resolution=req.options.resolution,
            audio=req.options.audio,
            name=f"Werkbank scene {scene.index + 1}",
        )
        jobs.append(
            remember_job(
                job_id,
                kind="video",
                workflow="text-to-video",
                scene_index=scene.index,
            )
        )
    return GenerateResponse(jobs=jobs)


@app.post("/api/images/generate", response_model=SceneJob)
async def generate_image(req: ImageGenerationRequest):
    """Create a reference image that can later be animated into a video."""
    job_id = await magic_hour.submit_text_to_image(
        prompt=req.prompt,
        aspect_ratio=req.aspect_ratio,
        model=req.model,
        resolution=req.resolution,
        style_tool=req.style_tool,
        name=req.name,
    )
    return remember_job(job_id, kind="image", workflow="text-to-image")


@app.post("/api/assets/images", response_model=UploadImageResponse)
async def upload_image(file: UploadFile = File(...)):
    """Upload an image through the backend; provider credentials never reach the browser."""
    filename = file.filename or "image.png"
    content_type = file.content_type or ""
    if content_type and not content_type.startswith("image/"):
        raise HTTPException(status_code=422, detail="Only image files can be uploaded for image-to-video.")

    content = await file.read(config.MAX_IMAGE_UPLOAD_BYTES + 1)
    if not content:
        raise HTTPException(status_code=422, detail="The selected image file is empty.")
    if len(content) > config.MAX_IMAGE_UPLOAD_BYTES:
        limit_mb = config.MAX_IMAGE_UPLOAD_BYTES // (1024 * 1024)
        raise HTTPException(status_code=413, detail=f"Image must be no larger than {limit_mb} MB.")

    provider_file_path = await magic_hour.upload_image(
        filename=filename,
        content=content,
        content_type=content_type or None,
    )
    asset = asset_store.put(filename=filename, provider_file_path=provider_file_path)
    return UploadImageResponse(
        asset_id=asset.asset_id,
        filename=asset.filename,
        expires_at=asset.expires_at,
    )


@app.post("/api/videos/from-image", response_model=SceneJob)
async def generate_video_from_image(req: ImageToVideoRequest):
    """Animate an uploaded image or a completed in-app generated image."""
    if req.asset_id:
        asset = asset_store.get(req.asset_id)
        if asset is None:
            raise HTTPException(
                status_code=404,
                detail="The image reference expired. Upload the image again before generating the video.",
            )
        image_file_path = asset.provider_file_path
    else:
        image_file_path = await magic_hour.prepare_generated_image(req.image_project_id or "")

    job_id = await magic_hour.submit_image_to_video(
        image_file_path=image_file_path,
        prompt=req.prompt,
        duration_seconds=req.duration_seconds,
        model=req.options.model,
        resolution=req.options.resolution,
        audio=req.options.audio,
        name=req.name,
    )
    return remember_job(job_id, kind="video", workflow="image-to-video")


@app.get("/api/status/{job_id}", response_model=StatusResponse)
async def check_status(job_id: str):
    """Poll an in-app project without allowing the client to select a provider path."""
    metadata = job_registry.get(job_id)
    if metadata is None:
        raise HTTPException(
            status_code=404,
            detail="This project is not available in the current server session. Create a new job or add persistent storage.",
        )
    result = await magic_hour.poll_project(project_id=job_id, kind=metadata.kind)
    return StatusResponse(
        job_id=job_id,
        kind=metadata.kind,
        workflow=metadata.workflow,
        status=result["status"],
        video_url=result["video_url"],
        image_urls=result["image_urls"],
        error=result["error"],
    )
