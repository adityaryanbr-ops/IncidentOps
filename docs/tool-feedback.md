# Feedback on Nebius / NVIDIA / Tavily tools

## What worked well
- Token Factory’s OpenAI-compatible API made integration fast (`base_url` swap).
- Having both a VL model (`Nemotron-3.5-Super-VL`) and a fast text model (`Nemotron-3_5-Lightning`) on one platform enabled a clean multi-step agent without juggling providers.
- Model catalog markdown/JSON made ID confirmation straightforward.

## Friction
- Structured JSON quality varies by model; we needed schema prompts + a repair pass.
- Account/credit onboarding can block teams early (country billing gaps noted in FAQs)—document this for hackathon participants more loudly.
- Latency of vision + two text calls + search needs first-class streaming/progress UX.

## Wish list
- First-class “agent loop” examples in the Token Factory cookbook with VL + tools + JSON schema.
- Clearer per-model tags for vision + JSON + tool-calling support in the catalog UI.
- Built-in request tracing IDs surfaced in the API response for demo videos.
