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

### Voice reports

Voice reports use browser microphone recording (`MediaRecorder`) and a local
multilingual Whisper base model on the API server. No speech-service API key is
needed. Audio is processed in memory and is not saved. Microphone access still
requires permission and HTTPS (localhost is supported).

After installing `requirements.txt`, provision the model before first use:

```sh
python -c 'from app.services.transcription import speech_model; speech_model()'
```

This downloads the model into `backend/.models/` (ignored by Git). Subsequent
transcriptions run locally. Each recording is limited to 60 seconds and 5 MB.
Review the transcript before analysis; speech recognition can make mistakes.
For a deployed server, provision the model during setup and retain this directory
between restarts. CPU transcription takes longer than real-time dictation.

### Location recovery

Device location may fail in embedded browsers or when Location Services cannot
provide a position. Enter a street/landmark, city and country, then use **Find
address** to confirm a geocoder match. The report retains the matched place name
and marks these coordinates approximate. No IP-based position is substituted.

### Incident helplines

Live analysis searches for incident-specific and general emergency contacts in the
reported area. Coordinate-only reports first attempt reverse geocoding to establish
a jurisdiction. A separate structured extraction identifies the service, number,
purpose, jurisdiction, source URL and supporting quote. The server requires the
number and quote in retrieved evidence from supported government/public emergency
authority hosts; third-party directories and unsupported numbers are excluded.
Contact prose is rendered from this directory in the site, print view and Markdown.

Not every jurisdiction/authority domain is supported. Commercial utility-only
websites are currently excluded. If evidence or location is insufficient, the
report explicitly says no suitable number was confirmed. Demo mode never fabricates
contacts. Existing saved reports need reanalysis to populate the new directory.

### Reliable helpline recovery

Reports no longer rely on model extraction alone for known national emergency
references. A reviewed India directory supplies ERSS 112, plus fire/rescue 101 for
fire/smoke incidents, only when India is explicitly established in the incident
location. Public sources: https://112.gov.in/, https://112.gov.in/about, and
https://indore.nic.in/en/helpline/ for the Indore district fire reference. References
were reviewed on 2026-10-28; telephone reachability is not monitored.

Live Indian contact searches restrict results to gov.in and nic.in authorities.
An administrative/training-office telephone is not treated as an emergency contact
merely because it appears on a government site. Untrusted model metadata cannot
claim a manually reviewed directory entry. Search/extraction errors are recorded
in the execution trace and distinguished from missing country or absent evidence.

POST `/api/incidents/helplines/official` accepts `{location, category}` and returns
reviewed references without external network calls or AI inference. The frontend
uses this endpoint to recover contacts for saved reports with an empty directory;
recovered numbers are included in Markdown downloads and printed reports. The
original saved record is not silently rewritten. Explicit retry is available if
the API is offline. Print layout places contacts before the action list.

The reviewed fallback currently covers India only. Other countries continue to
use sourced live lookup; the app never infers a default country from device locale,
IP address, or an unqualified place name. Unknown countries do not receive India's
numbers. Public emergency references do not establish live station availability.
