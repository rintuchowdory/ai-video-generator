from __future__ import annotations

import mimetypes
from pathlib import PurePosixPath
from typing import Any

import httpx
from fastapi import HTTPException

import config


_STATUS_MAP = {
    "draft": "queued",
    "queued": "queued",
    "pending": "queued",
    "processing": "processing",
    "rendering": "processing",
    "complete": "completed",
    "completed": "completed",
    "error": "failed",
    "failed": "failed",
    "canceled": "failed",
    "cancelled": "failed",
}


class MagicHourClient:
    """Small server-side adapter for Magic Hour's asynchronous media APIs."""

    def __init__(self) -> None:
        self.base_url = config.MAGIC_HOUR_API_BASE_URL

    @staticmethod
    def _require_configuration() -> None:
        if not config.magic_hour_is_configured():
            raise HTTPException(
                status_code=503,
                detail=(
                    "Magic Hour is not configured. Set MAGIC_HOUR_API_KEY in the backend "
                    ".env file and restart the API."
                ),
            )

    @staticmethod
    def _provider_error(context: str, error: httpx.HTTPError) -> HTTPException:
        response = getattr(error, "response", None)
        if response is None:
            return HTTPException(status_code=502, detail=f"Magic Hour {context} failed: {error}")

        body = response.text.strip().replace("\n", " ")[:800]
        return HTTPException(
            status_code=502,
            detail=f"Magic Hour {context} failed ({response.status_code}): {body or response.reason_phrase}",
        )

    def _headers(self) -> dict[str, str]:
        self._require_configuration()
        return {
            "Authorization": f"Bearer {config.MAGIC_HOUR_API_KEY}",
            "Accept": "application/json",
            "Content-Type": "application/json",
        }

    @staticmethod
    def _project_id(data: dict[str, Any], workflow: str) -> str:
        project_id = data.get("id")
        if not isinstance(project_id, str) or not project_id:
            raise HTTPException(
                status_code=502,
                detail=f"Magic Hour {workflow} response did not include a project id.",
            )
        return project_id

    async def _post_json(self, path: str, payload: dict[str, Any], context: str) -> dict[str, Any]:
        async with httpx.AsyncClient(timeout=httpx.Timeout(60.0, connect=15.0)) as client:
            try:
                response = await client.post(
                    f"{self.base_url}{path}",
                    headers=self._headers(),
                    json=payload,
                )
                response.raise_for_status()
            except httpx.HTTPError as error:
                raise self._provider_error(context, error) from error

        try:
            data = response.json()
        except ValueError as error:
            raise HTTPException(
                status_code=502,
                detail=f"Magic Hour {context} returned invalid JSON.",
            ) from error
        if not isinstance(data, dict):
            raise HTTPException(status_code=502, detail=f"Magic Hour {context} returned an unexpected response.")
        return data

    async def submit_text_to_video(
        self,
        *,
        prompt: str,
        duration_seconds: int,
        aspect_ratio: str,
        model: str,
        resolution: str,
        audio: bool,
        name: str | None = None,
    ) -> str:
        payload = {
            "name": name or f"Werkbank text-to-video ({prompt[:48]})",
            "end_seconds": duration_seconds,
            "aspect_ratio": aspect_ratio,
            "resolution": resolution,
            "model": model,
            "audio": audio,
            "style": {"prompt": prompt},
        }
        return self._project_id(
            await self._post_json("/text-to-video", payload, "text-to-video submission"),
            "text-to-video",
        )

    async def submit_text_to_image(
        self,
        *,
        prompt: str,
        aspect_ratio: str,
        model: str,
        resolution: str,
        style_tool: str,
        name: str | None = None,
    ) -> str:
        payload = {
            "name": name or f"Werkbank scene image ({prompt[:48]})",
            "image_count": 1,
            "model": model,
            "aspect_ratio": aspect_ratio,
            "resolution": resolution,
            "style": {"prompt": prompt, "tool": style_tool},
        }
        return self._project_id(
            await self._post_json("/ai-image-generator", payload, "text-to-image submission"),
            "text-to-image",
        )

    async def submit_image_to_video(
        self,
        *,
        image_file_path: str,
        prompt: str,
        duration_seconds: int,
        model: str,
        resolution: str,
        audio: bool,
        name: str | None = None,
    ) -> str:
        payload = {
            "name": name or f"Werkbank image-to-video ({prompt[:48]})",
            "end_seconds": duration_seconds,
            "assets": {"image_file_path": image_file_path},
            "resolution": resolution,
            "model": model,
            "audio": audio,
            "style": {"prompt": prompt},
        }
        return self._project_id(
            await self._post_json("/image-to-video", payload, "image-to-video submission"),
            "image-to-video",
        )

    async def poll_project(self, *, project_id: str, kind: str) -> dict[str, Any]:
        if kind not in {"video", "image"}:
            raise HTTPException(status_code=400, detail="Unsupported media project type.")

        self._require_configuration()
        path = f"/{kind}-projects/{project_id}"
        async with httpx.AsyncClient(timeout=httpx.Timeout(30.0, connect=15.0)) as client:
            try:
                response = await client.get(f"{self.base_url}{path}", headers=self._headers())
                response.raise_for_status()
            except httpx.HTTPError as error:
                raise self._provider_error("status check", error) from error

        try:
            data = response.json()
        except ValueError as error:
            raise HTTPException(status_code=502, detail="Magic Hour status response was not valid JSON.") from error
        if not isinstance(data, dict):
            raise HTTPException(status_code=502, detail="Magic Hour status response was unexpected.")

        raw_status = str(data.get("status", "")).lower()
        status = _STATUS_MAP.get(raw_status, "processing")
        downloads = data.get("downloads") or []
        urls: list[str] = []
        if isinstance(downloads, list):
            for item in downloads:
                if isinstance(item, dict) and isinstance(item.get("url"), str):
                    urls.append(item["url"])

        error_value = data.get("error")
        if isinstance(error_value, dict):
            error_message = error_value.get("message") or str(error_value)
        elif error_value is None:
            error_message = None
        else:
            error_message = str(error_value)

        return {
            "status": status,
            "video_url": urls[0] if kind == "video" and urls else None,
            "image_urls": urls if kind == "image" else [],
            "error": error_message,
        }

    async def upload_image(self, *, filename: str, content: bytes, content_type: str | None) -> str:
        """Upload an image to Magic Hour storage and return its provider file path."""
        self._require_configuration()
        extension = PurePosixPath(filename).suffix.lower().lstrip(".")
        if extension not in {"png", "jpg", "jpeg", "webp", "avif", "bmp", "tiff", "tif", "heic", "heif", "jfif", "jp2"}:
            raise HTTPException(status_code=422, detail="Unsupported image extension.")

        upload_payload = {"items": [{"type": "image", "extension": extension}]}
        upload_data = await self._post_json("/files/upload-urls", upload_payload, "asset upload URL request")
        items = upload_data.get("items")
        if not isinstance(items, list) or not items or not isinstance(items[0], dict):
            raise HTTPException(status_code=502, detail="Magic Hour did not return an upload target for the image.")

        upload_url = items[0].get("upload_url")
        file_path = items[0].get("file_path")
        if not isinstance(upload_url, str) or not isinstance(file_path, str):
            raise HTTPException(status_code=502, detail="Magic Hour returned an incomplete image upload target.")

        async with httpx.AsyncClient(timeout=httpx.Timeout(90.0, connect=15.0), follow_redirects=True) as client:
            try:
                upload_response = await client.put(
                    upload_url,
                    content=content,
                    headers={"Content-Type": content_type or mimetypes.guess_type(filename)[0] or "application/octet-stream"},
                )
                upload_response.raise_for_status()
            except httpx.HTTPError as error:
                raise self._provider_error("image upload", error) from error
        return file_path

    async def prepare_generated_image(self, image_project_id: str) -> str:
        """Fetch a completed provider image and re-upload it as an input image asset."""
        image_status = await self.poll_project(project_id=image_project_id, kind="image")
        if image_status["status"] != "completed":
            raise HTTPException(
                status_code=409,
                detail="The selected generated image is not ready to animate yet.",
            )
        image_urls = image_status["image_urls"]
        if not image_urls:
            raise HTTPException(status_code=502, detail="The completed image project did not include a download URL.")

        image_url = image_urls[0]
        async with httpx.AsyncClient(timeout=httpx.Timeout(60.0, connect=15.0), follow_redirects=True) as client:
            try:
                response = await client.get(image_url)
                response.raise_for_status()
            except httpx.HTTPError as error:
                raise self._provider_error("generated image download", error) from error

        path_extension = PurePosixPath(httpx.URL(image_url).path).suffix.lower().lstrip(".")
        content_type = response.headers.get("content-type", "").split(";", 1)[0].strip()
        content_extension = mimetypes.guess_extension(content_type or "")
        extension = path_extension or (content_extension or ".png").lstrip(".")
        return await self.upload_image(
            filename=f"generated-image.{extension}",
            content=response.content,
            content_type=content_type or None,
        )


magic_hour = MagicHourClient()
