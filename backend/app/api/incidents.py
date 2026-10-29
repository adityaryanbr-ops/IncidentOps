from __future__ import annotations

import asyncio
import httpx
from fastapi import APIRouter, File, Form, HTTPException, Query, UploadFile

from app.agents.incident_pipeline import IncidentPipeline
from app.clients.nebius import NebiusClient
from app.config import get_settings
from app.models.incident import PipelineResult, OfficialHelplineResult
from app.models.requests import OfficialHelplineRequest
from app.services.helplines import official_helplines, helpline_markdown
from app.services.image_validation import read_and_validate_image
from app.services.transcription import transcribe_audio
from starlette.concurrency import run_in_threadpool

router = APIRouter(prefix="/api/incidents", tags=["incidents"])


@router.post("/helplines/official", response_model=OfficialHelplineResult)
async def lookup_official_helplines(request: OfficialHelplineRequest):
    # This lookup stays local: no report text, precise coordinates or API keys are sent externally.
    contacts = official_helplines(request.location, request.category)
    if contacts:
        state = "official_fallback"
        message = "Official emergency numbers for the stated country. Local station availability has not been checked. No services have been dispatched."
    else:
        state = "not_found"
        message = "No reviewed national directory is available for this location. Include the incident country and run a live analysis for local contacts."
    return OfficialHelplineResult(helplines=contacts, helpline_lookup_state=state, helpline_status=message, markdown_section=helpline_markdown(contacts, message))


@router.post("/transcribe")
async def transcribe_report(audio: UploadFile = File(...)):
    if audio.content_type not in {"audio/webm", "audio/ogg", "audio/mp4", "audio/wav", "audio/mpeg", "video/mp4"}:
        raise HTTPException(415, "Use a microphone recording in WebM, MP4, Ogg, WAV or MP3 format.")
    content = await audio.read(5 * 1024 * 1024 + 1)
    if not content:
        raise HTTPException(400, "The recording is empty. Record your report again.")
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(413, "Keep the recording under 5 MB and 60 seconds.")
    try:
        return {"text": await run_in_threadpool(transcribe_audio, content)}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(503, "Local transcription is unavailable. Try again after the speech model has loaded.") from exc


@router.get("/location")
async def lookup_location(q: str = Query(min_length=3, max_length=300)):
    settings = get_settings()
    if settings.nebius_api_key and not settings.force_demo_mode:
        try:
            result = await asyncio.wait_for(NebiusClient(settings).text_json(
                system=("Normalize a location for a geocoding search. Preserve the user's place, "
                        "city, state and country. Do not guess or add missing details. "
                        "Return the original text if uncertain. Return JSON matching the schema."),
                user_text=q,
                schema={"type": "object", "properties": {"query": {"type": "string"}}, "required": ["query"]},
                schema_name="location_query",
            ), timeout=2)
            normalized = result.get("query")
            if isinstance(normalized, str) and 3 <= len(normalized.strip()) <= 300:
                q = normalized.strip()
        except Exception:
            pass  # Keep the user's original location if AI normalization is unavailable.
    try:
        async with httpx.AsyncClient(timeout=15, headers={"User-Agent": "IncidentOps/1.0 (https://github.com/adityaryanbr-ops/IncidentOps)"}) as client:
            response = await client.get("https://photon.komoot.io/api/", params={"q": q, "limit": 1})
            response.raise_for_status()
            return response.json()
    except (httpx.HTTPError, ValueError) as exc:
        raise HTTPException(status_code=502, detail="Location lookup is unavailable. Please try again.") from exc


@router.post("/analyze", response_model=PipelineResult)
async def analyze_incident(
    image: UploadFile = File(...),
    report_text: str = Form(...),
    location: str = Form(...),
    transcript: str | None = Form(default=None),
    latitude: float | None = Form(default=None),
    longitude: float | None = Form(default=None),
    resolved_location: str | None = Form(default=None),
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
            location=(f"{location.strip()} (geocoder match: {resolved_location.strip()}, approximate)"
                      if resolved_location and latitude is not None and longitude is not None
                      else location.strip()),
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
