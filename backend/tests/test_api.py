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
            "resolved_location": "Austin, Texas, United States",
            "latitude": "30.27",
            "longitude": "-97.74",
        },
        files={"image": ("scene.png", _png_bytes(), "image/png")},
    )
    assert res.status_code == 200
    body = res.json()
    assert "geocoder match: Austin, Texas, United States" in body["report"]["location"]
    assert body["demo_mode"] is True
    assert body["report"]["severity"] in {"low", "medium", "high", "critical"}
    assert body["trace"]
    assert body["nebius_base_url"].startswith("https://api.tokenfactory.nebius.com")


def test_checklist_priorities():
    import pytest
    from pydantic import ValidationError
    from app.models.incident import ChecklistItem

    for priority in ("P1", "P2", "P3"):
        assert ChecklistItem(priority=priority, action="Act", rationale="Safety").priority == priority
    with pytest.raises(ValidationError):
        ChecklistItem(priority="P0", action="Act", rationale="Safety")


def test_location_uses_ai_query_and_geocoder(monkeypatch):
    from app.api.incidents import NebiusClient
    import httpx

    monkeypatch.setenv("FORCE_DEMO_MODE", "false")
    monkeypatch.setenv("NEBIUS_API_KEY", "test")
    get_settings.cache_clear()

    async def normalize(self, **kwargs):
        return {"query": "London, United Kingdom"}

    class Response:
        def raise_for_status(self):
            pass

        def json(self):
            return {"features": [{"geometry": {"coordinates": [-0.12, 51.5]}}]}

    async def search(self, url, **kwargs):
        assert kwargs["params"]["q"] == "London, United Kingdom"
        return Response()

    monkeypatch.setattr(NebiusClient, "text_json", normalize)
    monkeypatch.setattr(httpx.AsyncClient, "get", search)
    res = TestClient(app).get("/api/incidents/location", params={"q": "London UK"})
    assert res.status_code == 200
    assert res.json()["features"][0]["geometry"]["coordinates"] == [-0.12, 51.5]
