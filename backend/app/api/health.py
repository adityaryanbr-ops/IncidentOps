from fastapi import APIRouter

from app.config import get_settings

router = APIRouter(tags=["health"])


@router.get("/health")
async def health() -> dict:
    settings = get_settings()
    return {
        "status": "ok",
        "service": "incidentops-api",
        "demo_mode": settings.demo_mode,
        "nebius_base_url": settings.nebius_base_url,
        "vision_model": settings.vision_model,
        "text_model": settings.text_model,
        "nebius_configured": bool(settings.nebius_api_key),
        "tavily_configured": bool(settings.tavily_api_key),
    }
