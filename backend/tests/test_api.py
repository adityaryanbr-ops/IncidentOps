import io

import pytest
from fastapi.testclient import TestClient
from PIL import Image

from app.config import get_settings
from app.main import app


@pytest.fixture(autouse=True)
def force_demo(monkeypatch):
    monkeypatch.setenv("FORCE_DEMO_MODE", "true")
    monkeypatch.setenv("ALLOW_DEMO_MODE", "true")
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


def _png_bytes() -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", (640, 480), color=(40, 60, 80)).save(buf, format="PNG")
    return buf.getvalue()


def test_health():
    client = TestClient(app)
    res = client.get("/health")
    assert res.status_code == 200
    body = res.json()
    assert body["status"] == "ok"
    assert "Nemotron" in body["vision_model"] or "nemotron" in body["vision_model"].lower()


def test_analyze_demo_mode():
    client = TestClient(app)
    res = client.post(
        "/api/incidents/analyze",
        data={
            "report_text": "Collapsed fencing blocking the north walkway near the stadium.",
            "location": "Campus North Gate, Austin TX",
        },
        files={"image": ("scene.png", _png_bytes(), "image/png")},
    )
    assert res.status_code == 200
    body = res.json()
    assert body["demo_mode"] is True
    assert body["report"]["severity"] in {"low", "medium", "high", "critical"}
    assert body["trace"]
    assert body["nebius_base_url"].startswith("https://api.tokenfactory.nebius.com")
