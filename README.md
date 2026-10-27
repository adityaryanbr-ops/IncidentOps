# IncidentOps

Evidence-grounded field-report copilot for campus and infrastructure responders.

**Track:** Best Apps and Agents · Nebius x NVIDIA Global AI Hackathon  
**Team:** ASTRAX  
**License:** MIT

Upload a photo + short report → NVIDIA Nemotron models on **Nebius Token Factory** extract visual facts and plan next steps → **Tavily** pulls live context → IncidentOps drafts a sourced response brief, checklist, and exportable report.

## How we use Nebius + NVIDIA

All model inference goes through Nebius Token Factory (OpenAI-compatible):

| Step | Model ID | Role |
| --- | --- | --- |
| Vision extract | `nvidia/Nemotron-3.5-Super-VL` | Describe the scene, hazards, damaged objects, unknowns |
| Severity + search plan | `nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B` | Advisory severity + Tavily query plan |
| Response brief | `nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B` | Sourced checklist + markdown report |

- **Base URL:** `https://api.tokenfactory.nebius.com/v1/`
- **SDK:** OpenAI Python client pointed at Token Factory (`backend/app/clients/nebius.py`)
- **Not used:** Hugging Face / OpenRouter / external NIM for Nemotron (would not satisfy hackathon rules)

## How we use Tavily

At runtime the backend calls the Tavily Search API with queries produced by Nemotron Nano (weather, closures, nearby facilities). Sources are attached to the brief and shown in the UI (`backend/app/clients/tavily.py`).

## Architecture

```text
Next.js (port 3847)
   │ multipart upload
   ▼
FastAPI (port 8765)
   ├─ Nemotron 3.5 Super VL  → visual observations
   ├─ Nemotron 3 Nano        → severity + search queries
   ├─ Tavily Search API      → live sources
   └─ Nemotron 3 Nano        → final response brief
```

## Quick start

### 1. Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Set NEBIUS_API_KEY and TAVILY_API_KEY for live Nebius + Tavily calls.
# Without keys, ALLOW_DEMO_MODE=true runs a labeled local fallback.
uvicorn app.main:app --reload --host 0.0.0.0 --port 8765
```

### 2. Frontend

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev -- --port 3847
```

Open [http://127.0.0.1:3847](http://127.0.0.1:3847).

### Environment variables

See `.env.example`. Never commit real keys.

| Variable | Purpose |
| --- | --- |
| `NEBIUS_API_KEY` | Token Factory API key |
| `TAVILY_API_KEY` | Tavily Search API key |
| `NEXT_PUBLIC_API_BASE_URL` | Frontend → backend URL |

## Demo mode

If keys are missing, the API returns a clearly labeled **demo_mode** result so UI/dev work continues. For the hackathon submission and judging video, set real keys so the Nebius + Tavily path executes.

## Tests

```bash
cd backend
source .venv/bin/activate
pytest -q
```

## Repository layout

```text
backend/     FastAPI + Nebius/Tavily agent pipeline
frontend/    Next.js IncidentOps workspace
docs/        Architecture, demo script, Devpost draft
```

## Safety note

IncidentOps is an **advisory** copilot for infrastructure/campus response. It does not dispatch emergency services. Severity always requires human confirmation.
