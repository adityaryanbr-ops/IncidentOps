# IncidentOps

Evidence-grounded field-report copilot for campus and infrastructure responders.

**Track:** Best Apps and Agents · Nebius x NVIDIA Global AI Hackathon  
**Team:** ASTRAX  
**License:** MIT

A responder uploads a photo, a location, and a short report. IncidentOps extracts visible facts, classifies advisory severity, pulls live public context, and drafts a sourced response brief with a checklist.

## Features

- Photo + text intake, with optional voice-note transcript and coordinates
- Three built-in sample incidents so the UI can be tried without hunting for a photo
- Visual evidence extraction with NVIDIA Nemotron 3.5 Super VL
- Severity plan and response brief with NVIDIA Nemotron 3.5 Lightning
- Runtime Tavily search for weather, closures, and nearby facilities
- Incident cards saved in the browser, Markdown download, and print-to-PDF
- Execution trace showing the Nebius base URL, model IDs, and Tavily step
- Labeled demo mode when API keys are not configured

This product is advisory only. It does not dispatch emergency services. Severity always needs a human to confirm it.

## Stack

| Piece | Choice |
| --- | --- |
| Language | TypeScript (UI), Python 3.12 (API) |
| Frontend | Next.js 16, React 19, Tailwind CSS 4, shadcn/ui |
| Frontend entry | `frontend/app/page.tsx` (Next.js App Router) |
| Backend | FastAPI, Uvicorn |
| Backend entry | `backend/app/main.py` (`app` object) |
| Models | OpenAI Python SDK pointed at Nebius Token Factory |
| Search | Tavily Python SDK |

## How Nebius and NVIDIA are used

Every model call goes to Nebius Token Factory. Hugging Face, OpenRouter, and NIM elsewhere are not used.

| Step | Model ID | Role |
| --- | --- | --- |
| Vision extract | `nvidia/Nemotron-3.5-Super-VL` | Scene, hazards, damaged objects, unknowns |
| Severity + search plan | `nvidia/Nemotron-3_5-Lightning` | Advisory severity and Tavily queries |
| Response brief | `nvidia/Nemotron-3_5-Lightning` | Sourced checklist and Markdown report |

- Base URL: `https://api.tokenfactory.nebius.com/v1/`
- Client: `backend/app/clients/nebius.py`
- Tavily client: `backend/app/clients/tavily.py`

```text
Next.js (port 3847)
   │ multipart upload
   ▼
FastAPI (port 8765)  →  backend/app/main.py
   ├─ Nemotron 3.5 Super VL  → visual observations
   ├─ Nemotron 3.5 Lightning → severity + search queries
   ├─ Tavily Search API      → live sources
   └─ Nemotron 3.5 Lightning → final response brief
```

## Prerequisites (Windows)

- Windows 10 or 11
- [Git for Windows](https://git-scm.com/download/win)
- [Node.js 20 or newer](https://nodejs.org/) (includes npm). This repo was verified with Node 22.
- [Python 3.12](https://www.python.org/downloads/windows/). During setup, enable **Add python.exe to PATH**.
- Two terminals (PowerShell or Command Prompt)
- Optional, for live inference: a [Nebius Token Factory](https://tokenfactory.nebius.com/) API key and a [Tavily](https://tavily.com/) API key

`uvloop` is Linux-only and is skipped automatically on Windows (`requirements.txt` uses an environment marker).

## Install on Windows

From the repository root in PowerShell:

```powershell
# Backend
cd backend
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
copy .env.example .env

# Frontend (new terminal, from the repository root)
cd frontend
copy .env.example .env.local
npm install
```

If PowerShell blocks activation, run this once in that window and try again:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
```

Command Prompt equivalent for the virtual environment:

```bat
cd backend
py -3.12 -m venv .venv
.venv\Scripts\activate.bat
python -m pip install --upgrade pip
pip install -r requirements.txt
copy .env.example .env
```

## Configuration

Copy examples and edit them locally. Do not commit real keys.

| Variable | Where | Purpose |
| --- | --- | --- |
| `NEBIUS_API_KEY` | `backend/.env` | Nebius Token Factory key. Required for live model calls. |
| `TAVILY_API_KEY` | `backend/.env` | Tavily Search key. Required for live web context. |
| `NEBIUS_BASE_URL` | `backend/.env` | Default `https://api.tokenfactory.nebius.com/v1/` |
| `VISION_MODEL` | `backend/.env` | Default `nvidia/Nemotron-3.5-Super-VL` |
| `TEXT_MODEL` | `backend/.env` | Default `nvidia/Nemotron-3_5-Lightning` |
| `CORS_ORIGINS` | `backend/.env` | Include `http://localhost:3847` |
| `ALLOW_DEMO_MODE` | `backend/.env` | `true` returns a labeled fallback when keys are missing |
| `FORCE_DEMO_MODE` | `backend/.env` | `true` always uses the fallback, even if keys exist |
| `NEXT_PUBLIC_API_BASE_URL` | `frontend/.env.local` | Backend URL. Use `http://127.0.0.1:8765` |

Root `.env.example` lists the same variables for reference. The running processes read `backend/.env` and `frontend/.env.local`.

Without both API keys, the API stays in **demo mode** and the UI says so. Live Nebius and Tavily calls start after the keys are set and the API process is restarted.

## Run locally on Windows

Terminal 1, API:

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
uvicorn app.main:app --reload --host 127.0.0.1 --port 8765
```

Terminal 2, UI:

```powershell
cd frontend
npm run dev
```

Open [http://127.0.0.1:3847](http://127.0.0.1:3847).

Health check: [http://127.0.0.1:8765/health](http://127.0.0.1:8765/health). `demo_mode` is `true` until both keys are present.

Production-style UI (after `npm install`):

```powershell
cd frontend
npm run build
npm run start
```

## Tests and checks

PowerShell, from `backend` with the virtual environment active:

```powershell
pytest -q
```

From `frontend`:

```powershell
npm run lint
npm run build
```

## Repository layout

```text
backend/     FastAPI app, Nebius + Tavily clients, pytest
frontend/    Next.js workspace
docs/        Architecture, demo script, Devpost draft, tool feedback
```

## macOS / Linux

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --host 127.0.0.1 --port 8765
```

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

## Publishing note

Do not commit `backend/.env`, `frontend/.env.local`, `backend/.venv`, `frontend/node_modules`, or `frontend/.next`. Those paths are gitignored.
