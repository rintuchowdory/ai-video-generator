from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from secrets import token_urlsafe

from . import config


@dataclass(frozen=True)
class UploadedAsset:
    asset_id: str
    filename: str
    provider_file_path: str
    expires_at: datetime


class AssetStore:
    """Minimal in-memory lookup for short-lived Magic Hour input assets."""

    def __init__(self) -> None:
        self._assets: dict[str, UploadedAsset] = {}

    def put(self, *, filename: str, provider_file_path: str) -> UploadedAsset:
        self.prune()
        asset = UploadedAsset(
            asset_id=token_urlsafe(24),
            filename=filename,
            provider_file_path=provider_file_path,
            expires_at=datetime.now(UTC) + timedelta(seconds=config.ASSET_TTL_SECONDS),
        )
        self._assets[asset.asset_id] = asset
        return asset

    def get(self, asset_id: str) -> UploadedAsset | None:
        self.prune()
        return self._assets.get(asset_id)

    def prune(self) -> None:
        now = datetime.now(UTC)
        expired = [asset_id for asset_id, asset in self._assets.items() if asset.expires_at <= now]
        for asset_id in expired:
            self._assets.pop(asset_id, None)


asset_store = AssetStore()
