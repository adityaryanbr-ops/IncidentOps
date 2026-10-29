# IncidentOps architecture

```text
┌──────────────────────────┐
│  Next.js workspace UI    │
│  intake · cards · brief  │
└────────────┬─────────────┘
             │ multipart /api/incidents/analyze
┌────────────▼─────────────┐
│  FastAPI IncidentPipeline│
└──┬─────────┬─────────┬───┘
   │         │         │
   ▼         ▼         ▼
Nebius VL  Nebius Lightning  Tavily
Super VL   plan/brief        Search
```

## Data contracts

Validated with Pydantic:

1. `VisualObservation`
2. `SeverityAssessment`
3. `IncidentReport` (+ `ContextSource`, `ChecklistItem`)
4. `PipelineResult` including execution `trace`

## Design choices

- Deterministic Tavily invocation (not optional tool choice) to guarantee bonus eligibility.
- Evidence / inference / unknown separation for safer ops briefs.
- No server-side persistence of uploads; browser `localStorage` for demo cards.
- Demo fallback when keys are absent, labeled in API + UI.
