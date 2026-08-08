import os
import sys
import unittest
from pathlib import Path

from fastapi.testclient import TestClient

BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))

# Ensure the test suite never uses a real credential from a developer shell.
os.environ["MAGIC_HOUR_API_KEY"] = ""
os.environ["KLING_API_KEY"] = ""

from main import app, job_registry  # noqa: E402


VALID_SCENE = {
    "index": 0,
    "narration": "A welcoming cafe opens its doors.",
    "visual_prompt": "Warm cinematic morning exterior of a new neighborhood cafe, slow dolly in, golden sunlight.",
    "duration_seconds": 5,
}


class ApiContractTests(unittest.TestCase):
    def setUp(self):
        job_registry.clear()
        self.client = TestClient(app)

    def test_capabilities_include_free_tier_safe_default(self):
        response = self.client.get("/api/capabilities")
        self.assertEqual(response.status_code, 200)
        video_models = response.json()["video_models"]
        ltx = next(model for model in video_models if model["id"] == "ltx-2.3")
        self.assertIn("480p", ltx["resolutions"])
        self.assertIn(5, ltx["durations"])

    def test_incompatible_kling_resolution_is_rejected_before_submission(self):
        response = self.client.post(
            "/api/generate",
            json={
                "scenes": [VALID_SCENE],
                "options": {
                    "aspect_ratio": "16:9",
                    "model": "kling-3.0",
                    "resolution": "480p",
                    "audio": False,
                },
            },
        )
        self.assertEqual(response.status_code, 422)
        self.assertIn("kling-3.0 supports these resolutions", response.text)

    def test_missing_magic_hour_key_returns_actionable_error(self):
        response = self.client.post(
            "/api/generate",
            json={
                "scenes": [VALID_SCENE],
                "options": {
                    "aspect_ratio": "16:9",
                    "model": "ltx-2.3",
                    "resolution": "480p",
                    "audio": False,
                },
            },
        )
        self.assertEqual(response.status_code, 503)
        self.assertIn("MAGIC_HOUR_API_KEY", response.text)

    def test_status_for_unknown_project_is_not_exposed(self):
        response = self.client.get("/api/status/not-created-here")
        self.assertEqual(response.status_code, 404)
        self.assertIn("current server session", response.text)


if __name__ == "__main__":
    unittest.main()
