# Devpost description draft

## Track
Best Apps and Agents

## Inspiration
Campus and infrastructure responders often receive a single photo and a rushed note. Critical minutes are spent rewriting that into something actionable. We wanted an agent that respects evidence boundaries, pulls live context, and drafts a brief a human can trust enough to verify—not a black-box severity oracle.

## What it does
IncidentOps accepts an incident photo, location, and report text. It:
- extracts visual facts with NVIDIA Nemotron 3.5 Super VL on Nebius Token Factory
- classifies advisory severity and plans searches with Nemotron 3 Nano
- calls Tavily at runtime for weather/closures/facilities context
- drafts a sourced response brief, checklist, and exportable Markdown/PDF printout
- shows a runtime execution trace proving Nebius + Tavily calls

## How we built it
- Backend: FastAPI + OpenAI Python SDK pointed at `https://api.tokenfactory.nebius.com/v1/`
- Frontend: Next.js + TypeScript + Tailwind + shadcn/ui
- Structured JSON schemas with Pydantic validation and one repair pass
- Local demo fallback when keys are missing (labeled), live path for submission

## Challenges
- Keeping multimodal structured output reliable
- Separating observations from inferences so the product stays operationally honest
- Making Tavily materially affect the brief instead of looking bolted on
- Fitting a convincing Nebius proof into a sub-3-minute video

## Accomplishments
- End-to-end agent loop with two Nemotron models via Nebius only
- Runtime Tavily enrichment with visible sources
- Complete product UX: intake, cards, report, export, empty/loading/error states

## What’s next
- Optional Nebius Serverless Job for async batch intake
- Authenticated team workspaces
- Voice transcription
- Offline capture with later sync for edge/field devices

## Built with
Nebius Token Factory, NVIDIA Nemotron, Tavily, FastAPI, Next.js, OpenAI Python SDK
