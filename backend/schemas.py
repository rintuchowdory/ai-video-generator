from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, model_validator


AspectRatio = Literal["16:9", "9:16", "1:1"]
VideoResolution = Literal["480p", "720p", "1080p", "4k"]
ImageResolution = Literal["640px", "1k", "2k", "4k"]
VideoModel = Literal[
    "default",
    "ltx-2.3",
    "wan-2.2",
    "kling-3.0",
    "seedance-1.5",
    "seedance-2.0-mini",
    "seedance-2.0",
]
ImageModel = Literal["default", "flux-schnell", "flux-2-klein", "z-image-turbo"]
ImageStyleTool = Literal[
    "general",
    "ai-photo-generator",
    "ai-illustration-generator",
    "ai-logo-generator",
    "movie-poster-generator",
    "thumbnail-maker",
]
ProjectKind = Literal["video", "image"]
Workflow = Literal["text-to-video", "image-to-video", "text-to-image"]
JobStatus = Literal["queued", "processing", "completed", "failed"]


VIDEO_MODEL_OPTIONS: dict[str, dict[str, object]] = {
    "default": {
        "label": "Best available (free-tier safe)",
        "resolutions": ("480p", "720p"),
        "durations": tuple(range(1, 31)),
        "audio": True,
    },
    "ltx-2.3": {
        "label": "LTX 2.3 — fast iteration",
        "resolutions": ("480p", "720p", "1080p"),
        "durations": (1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 15, 20, 25, 30),
        "audio": True,
    },
    "wan-2.2": {
        "label": "Wan 2.2 — motion and camera control",
        "resolutions": ("480p", "720p", "1080p"),
        "durations": (3, 4, 5, 6, 7, 8, 9, 10, 15),
        "audio": False,
    },
    "kling-3.0": {
        "label": "Kling 3.0 — cinematic quality",
        "resolutions": ("720p", "1080p", "4k"),
        "durations": tuple(range(3, 16)),
        "audio": True,
    },
    "seedance-1.5": {
        "label": "Seedance 1.5 — smooth motion",
        "resolutions": ("480p", "720p", "1080p"),
        "durations": tuple(range(4, 13)),
        "audio": True,
    },
    "seedance-2.0-mini": {
        "label": "Seedance 2.0 Mini — fast and consistent",
        "resolutions": ("480p", "720p"),
        "durations": tuple(range(4, 16)),
        "audio": True,
    },
    "seedance-2.0": {
        "label": "Seedance 2.0 — enhanced reference control",
        "resolutions": ("480p", "720p"),
        "durations": tuple(range(4, 16)),
        "audio": True,
    },
}


class ScriptRequest(BaseModel):
    topic: str = Field(..., min_length=3, max_length=2_000, description="What the video should be about")
    language: Literal["de", "en"] = "de"
    scene_count: int = Field(4, ge=1, le=8)
    tone: str = Field("professional", min_length=2, max_length=120, description="e.g. professional, playful, urgent")


class Scene(BaseModel):
    index: int = Field(ge=0)
    narration: str = Field(min_length=1, max_length=2_000)
    visual_prompt: str = Field(min_length=3, max_length=4_000)
    duration_seconds: int = Field(5, ge=1, le=60)


class ScriptResponse(BaseModel):
    topic: str
    language: str
    scenes: list[Scene]


class GenerationOptions(BaseModel):
    aspect_ratio: AspectRatio = "16:9"
    model: VideoModel = "ltx-2.3"
    resolution: VideoResolution = "480p"
    audio: bool = False

    @model_validator(mode="after")
    def validate_model_compatibility(self):
        capabilities = VIDEO_MODEL_OPTIONS[self.model]
        if self.resolution not in capabilities["resolutions"]:
            resolutions = ", ".join(capabilities["resolutions"])
            raise ValueError(f"{self.model} supports these resolutions: {resolutions}")
        if self.audio and not capabilities["audio"]:
            raise ValueError(f"{self.model} does not support generated audio")
        return self


class GenerateRequest(BaseModel):
    scenes: list[Scene] = Field(min_length=1, max_length=8)
    options: GenerationOptions = Field(default_factory=GenerationOptions)

    @model_validator(mode="after")
    def validate_scene_durations(self):
        allowed_durations = VIDEO_MODEL_OPTIONS[self.options.model]["durations"]
        invalid_durations = [
            scene.duration_seconds
            for scene in self.scenes
            if scene.duration_seconds not in allowed_durations
        ]
        if invalid_durations:
            supported = ", ".join(str(item) for item in allowed_durations)
            raise ValueError(
                f"The selected model supports these scene durations (seconds): {supported}. "
                f"Invalid values: {', '.join(str(item) for item in invalid_durations)}"
            )
        return self


class ImageGenerationRequest(BaseModel):
    prompt: str = Field(min_length=3, max_length=4_000)
    name: str | None = Field(default=None, max_length=120)
    aspect_ratio: AspectRatio = "16:9"
    model: ImageModel = "default"
    resolution: ImageResolution = "640px"
    style_tool: ImageStyleTool = "general"


class ImageToVideoRequest(BaseModel):
    asset_id: str | None = Field(default=None, min_length=8, max_length=128)
    image_project_id: str | None = Field(default=None, min_length=8, max_length=128)
    prompt: str = Field(min_length=3, max_length=4_000)
    name: str | None = Field(default=None, max_length=120)
    options: GenerationOptions = Field(default_factory=GenerationOptions)
    duration_seconds: int = Field(5, ge=1, le=60)

    @model_validator(mode="after")
    def validate_input_and_duration(self):
        if bool(self.asset_id) == bool(self.image_project_id):
            raise ValueError("Provide exactly one of asset_id or image_project_id")
        allowed_durations = VIDEO_MODEL_OPTIONS[self.options.model]["durations"]
        if self.duration_seconds not in allowed_durations:
            supported = ", ".join(str(item) for item in allowed_durations)
            raise ValueError(
                f"The selected model supports these durations (seconds): {supported}"
            )
        return self


class SceneJob(BaseModel):
    scene_index: int | None = None
    job_id: str
    kind: ProjectKind
    workflow: Workflow
    status: JobStatus = "queued"
    video_url: str | None = None
    image_urls: list[str] = Field(default_factory=list)
    error: str | None = None


class GenerateResponse(BaseModel):
    jobs: list[SceneJob]


class StatusResponse(BaseModel):
    job_id: str
    kind: ProjectKind
    workflow: Workflow
    status: JobStatus
    video_url: str | None = None
    image_urls: list[str] = Field(default_factory=list)
    error: str | None = None


class UploadImageResponse(BaseModel):
    asset_id: str
    filename: str
    expires_at: datetime


class ProviderModelOption(BaseModel):
    id: str
    label: str
    resolutions: list[str]
    durations: list[int]
    supports_audio: bool


class ProviderCapabilitiesResponse(BaseModel):
    provider: Literal["magic-hour"] = "magic-hour"
    video_models: list[ProviderModelOption]
    image_models: list[ProviderModelOption]
    image_style_tools: list[ImageStyleTool]
    aspect_ratios: list[AspectRatio]
