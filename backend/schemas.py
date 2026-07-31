from pydantic import BaseModel, Field
from typing import Literal


class ScriptRequest(BaseModel):
    topic: str = Field(..., min_length=3, description="What the video should be about")
    language: Literal["de", "en"] = "de"
    scene_count: int = Field(4, ge=1, le=8)
    tone: str = Field("professional", description="e.g. professional, playful, urgent")


class Scene(BaseModel):
    index: int
    narration: str
    visual_prompt: str
    duration_seconds: int = 5


class ScriptResponse(BaseModel):
    topic: str
    language: str
    scenes: list[Scene]


class GenerateRequest(BaseModel):
    scenes: list[Scene]
    aspect_ratio: Literal["16:9", "9:16", "1:1"] = "16:9"


class SceneJob(BaseModel):
    scene_index: int
    job_id: str
    status: Literal["queued", "processing", "completed", "failed"] = "queued"
    video_url: str | None = None
    error: str | None = None


class GenerateResponse(BaseModel):
    jobs: list[SceneJob]


class StatusResponse(BaseModel):
    job_id: str
    status: Literal["queued", "processing", "completed", "failed"]
    video_url: str | None = None
    error: str | None = None
