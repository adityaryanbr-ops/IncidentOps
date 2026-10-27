# IncidentOps API

FastAPI backend for IncidentOps.

## Run locally

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# add NEBIUS_API_KEY and TAVILY_API_KEY for live mode
uvicorn app.main:app --reload --host 0.0.0.0 --port 8765
```

Health check: `GET http://127.0.0.1:8765/health`

Analyze: `POST /api/incidents/analyze` (multipart: `image`, `report_text`, `location`)
