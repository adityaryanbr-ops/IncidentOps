# IncidentOps — Devpost write-up

Repo: https://github.com/adityaryanbr-ops/IncidentOps (public, MIT, `main`)
Deadline: Fri 30 Oct 2026, 10:00 AM PT (10:30 PM IST).

## Project name
IncidentOps

## Tagline
Turn a field photo and a short note into a sourced, human-verified response brief: Nemotron on Nebius Token Factory reads the scene and drafts the brief, and Tavily adds live public context.

## Track
**Best Apps and Agents.** This is a multi-step app that uses Nemotron models through Nebius Token Factory. Coding & Agentic Engineering does not fit (it does not write or run code). Personal AI and Physical AI do not fit (no persistent assistant, no hardware).

Bonus: **Best Use of Tavily.** Tavily is called on every live analysis, not as an optional tool the model may skip. Rules allow one Overall or Track award, plus one Bonus.

## Inspiration
Campus and infrastructure responders, facilities teams, and people who spot a hazard often have only a photo and a rushed note. Turning that into something someone can act on takes time, and a confident but ungrounded answer can do harm. IncidentOps keeps a line between what is visible, what is inferred, and what is unknown, pulls in current public information, and leaves the decision to a person.

## What it does
IncidentOps takes a photo, a location (typed address, coordinates, a geocoder-confirmed address, or device location), and a short description, optionally dictated by voice. It then:

1. Extracts visual evidence from the photo (scene summary, hazards, damaged objects, people or vehicles only if clearly present, conditions, observed facts, unknowns, and a confidence score) with `nvidia/Nemotron-3.5-Super-VL`.
2. Classifies an advisory severity (low, medium, high, or critical) and plans one or two focused web searches with `nvidia/Nemotron-3_5-Lightning`.
3. Calls Tavily at runtime for live public context (weather, closures, advisories, nearby facilities), plus dedicated searches for official emergency contacts when the incident area can be resolved.
4. Extracts helplines only when the number and a verbatim quote appear in retrieved evidence from supported government or public-authority hosts. For India, a reviewed official-directory fallback supplies 112, and 101 for fire or smoke incidents. Nothing is inferred from IP, locale, or model memory. Unknown countries get no default numbers.
5. Drafts a plain-English response brief with Lightning: title, observed facts versus inferences versus unknowns, immediate actions, a P1/P2/P3 checklist, a short live-context summary, human-verification items, and source links. High and critical severities always carry an emergency notice.
6. Shows an execution trace (step, provider, model ID, latency, and the Nebius base URL), saves incident cards in the browser, and exports Markdown or a print layout.

It is advisory only. It never dispatches emergency services and never claims anyone has been alerted. Three built-in sample incidents let anyone try it without a photo. Without API keys the app runs in a labelled demo mode with stub data.

## How we built it
- **Models, all via Nebius Token Factory** (OpenAI Python SDK, `base_url=https://api.tokenfactory.nebius.com/v1/`, JSON-schema responses):
  - `nvidia/Nemotron-3.5-Super-VL` for visual evidence.
  - `nvidia/Nemotron-3_5-Lightning` for severity and search planning, helpline extraction, the response brief, JSON repair, and optional location-query normalisation. Nebius retires `nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B` from Serverless on 9 Nov 2026, before judging, so Lightning is the text model.
- **Pipeline** (FastAPI, async): vision, then severity and search plan, then a deterministic Tavily search, then helpline extraction and validation, then the brief. Pydantic validates `VisualObservation`, `SeverityAssessment`, `HelplineDirectory`, and `IncidentReport`. Invalid JSON gets one repair call through Nebius.
- **Guardrails:** prompts separate evidence from inference. Sources are untrusted. Phone numbers are stripped from model prose and contacts render only from the checked directory. Contact hosts are allow-listed and the number must appear in the retrieved snippet. Demo mode is labelled.
- **Frontend:** Next.js 16, React 19, TypeScript, Tailwind CSS 4, shadcn/ui. Microphone recording, Photon/OpenStreetMap address search, `localStorage` cards, Markdown download, print layout.
- **Voice:** `faster-whisper` (Whisper base) runs on the API server. No speech API key. 60-second / 5 MB limit. Audio stays in memory.
- **Tests:** 22 pytest tests and 31 Node tests (categories, location, helplines, voice, scroll reveal).
- Built with Cursor and edited by ASTRAX.

## Challenges
- Reliable structured JSON from the models, handled with schema prompts, Pydantic, and a repair pass.
- Keeping observations, inferences, and unknowns separate so the brief does not exaggerate urgency.
- Making Tavily change the brief instead of sitting beside it.
- Emergency contacts: a wrong number is worse than none. The app shows that no suitable number was confirmed rather than guessing.
- Location entry when device geolocation fails, with approximate-location labelling and an address confirmation step.

## Accomplishments
- A full product flow (intake, analysis, brief, cards, export, empty, loading, and error states) on two NVIDIA Nemotron models through Token Factory, with a visible runtime trace.
- Helpline handling that does not fabricate contacts.
- Local voice transcription with no extra API key.
- A labelled demo mode for machines without keys.

A live local run on 29 Oct 2026 (keys set, demo mode off) analysed the walkway sample. The trace recorded `nvidia/Nemotron-3.5-Super-VL` for the photo, `nvidia/Nemotron-3_5-Lightning` for the severity plan, contact lookup, and brief, and an ok Tavily step.

## What we learned
- Token Factory's OpenAI-compatible API made the integration a base-URL change. A vision Nemotron and a fast text Nemotron on one platform were enough for a multi-step agent.
- Structured-output quality varies by model, so validation and repair matter more than prompt polish.
- For safety-adjacent tools, restraint is a feature: advisory only, citations, and "unknown" as a valid answer.

## What's next
- A hosted demo judges can open, with the same keys set on the server.
- Authenticated team workspaces and shared incident boards.
- Official-directory coverage beyond India. Other countries already rely on sourced live lookup.
- Offline capture with later sync for field devices.

## Built with
nebius-token-factory, nvidia-nemotron, nemotron-3.5-super-vl, nemotron-3.5-lightning, tavily, python, fastapi, pydantic, openai-python-sdk, typescript, next.js, react, tailwindcss, shadcn-ui, faster-whisper, openstreetmap-photon

## Feedback on Nebius, NVIDIA, and Tavily
Worked well: the OpenAI-compatible API, a vision model and a fast text model on one platform, and a catalog that made model IDs easy to confirm.

Friction: structured JSON quality varies by model, so we added schema prompts and a repair pass. Account and credit onboarding can block teams early. Vision plus several text calls plus search is slow enough that the UI needs a real progress state.

Wish list: a Token Factory cookbook example of a vision-plus-tools agent with JSON schema, per-model tags for vision, JSON, and tool-calling support, and request tracing IDs in API responses.

## Still needed before submit
- A hosted demo URL, free for judges through 15 Dec 2026, with `NEBIUS_API_KEY`, `TAVILY_API_KEY`, and `TEXT_MODEL=nvidia/Nemotron-3_5-Lightning` set on the server. Demo mode would show stub output.
- A public YouTube video under 3 minutes. `docs/demo-script.md` is the script. Show a live trace, not demo mode. A full analysis takes about two minutes, so start it early or trim the wait.
- Devpost team: add Aryan on the project page. Commits are from adityaryanbr-ops, Cursor Agent, and Aryan Shekhawat.
