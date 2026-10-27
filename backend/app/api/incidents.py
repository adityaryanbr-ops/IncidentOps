from __future__ import annotations

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from app.agents.incident_pipeline import IncidentPipeline
from app.config import get_settings
from app.models.incident import PipelineResult
from app.services.image_validation import read_and_validate_image

router = APIRouter(prefix="/api/incidents", tags=["incidents"])


@router.post("/analyze", response_model=PipelineResult)
async def analyze_incident(
    image: UploadFile = File(...),
    report_text: str = Form(...),
    location: str = Form(...),
    transcript: str | None = Form(default=None),
    latitude: float | None = Form(default=None),
    longitude: float | None = Form(default=None),
) -> PipelineResult:
    settings = get_settings()
    if not report_text.strip() or not location.strip():
        raise HTTPException(status_code=400, detail="report_text and location are required.")

    image_bytes, mime = await read_and_validate_image(image, settings.max_image_bytes)
    pipeline = IncidentPipeline(settings)

    try:
        return await pipeline.run(
            image_bytes=image_bytes,
            mime=mime,
            report_text=report_text.strip(),
            location=location.strip(),
            transcript=(transcript or "").strip() or None,
            latitude=latitude,
            longitude=longitude,
        )
    except HTTPException:
        raise
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(
            status_code=502,
            detail=f"Incident analysis failed: {exc}",
        ) from exc
