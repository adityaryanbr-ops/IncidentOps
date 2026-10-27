from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import health, incidents
from app.config import get_settings

settings = get_settings()

app = FastAPI(
    title="IncidentOps API",
    description=(
        "Evidence-grounded field incident copilot powered by Nebius Token Factory "
        "(NVIDIA Nemotron) and Tavily live search."
    ),
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list or ["*"],
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(incidents.router)
