from __future__ import annotations

import base64
import json
import re
from typing import Any

from openai import AsyncOpenAI

from app.config import Settings


def _without_reasoning(text: str) -> str:
    """Lightning sometimes leaves a reasoning block in the answer channel."""
    cleaned = re.sub(r"<think>.*?</think>", " ", text, flags=re.IGNORECASE | re.DOTALL)
    parts = re.split(r"</think>", cleaned, flags=re.IGNORECASE)
    return parts[-1].strip()


def _contains_reasoning_leak(value: Any) -> bool:
    if isinstance(value, str):
        return "<think>" in value.lower() or "</think>" in value.lower()
    if isinstance(value, dict):
        return any(_contains_reasoning_leak(item) for item in value.values())
    if isinstance(value, list):
        return any(_contains_reasoning_leak(item) for item in value)
    return False


def parse_json_object(text: str) -> dict[str, Any] | None:
    """Pull the answer JSON out of a model reply, ignoring an empty or leaked draft."""
    raw = _without_reasoning(text or "")
    if not raw or raw in {"{}", "null"}:
        return None
    fenced = re.sub(r"^```(?:json)?\s*|\s*```$", "", raw, flags=re.IGNORECASE).strip()
    decoder = json.JSONDecoder()
    start = 0
    found: dict[str, Any] | None = None
    while True:
        brace = fenced.find("{", start)
        if brace < 0:
            return found
        try:
            value, length = decoder.raw_decode(fenced[brace:])
        except json.JSONDecodeError:
            start = brace + 1
            continue
        if isinstance(value, dict) and value and not _contains_reasoning_leak(value):
            found = value
            start = brace + length
            continue
        start = brace + 1


class NebiusClient:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.client = AsyncOpenAI(
            base_url=settings.nebius_base_url,
            api_key=settings.nebius_api_key or "missing",
        )

    async def vision_json(
        self,
        *,
        system: str,
        user_text: str,
        image_bytes: bytes,
        mime: str,
        schema: dict[str, Any],
    ) -> dict[str, Any]:
        b64 = base64.b64encode(image_bytes).decode("ascii")
        data_url = f"data:{mime};base64,{b64}"
        completion = await self.client.chat.completions.create(
            model=self.settings.vision_model,
            temperature=0.2,
            response_format={
                "type": "json_schema",
                "json_schema": {
                    "name": "visual_observation",
                    "schema": schema,
                    "strict": False,
                },
            },
            messages=[
                {"role": "system", "content": system},
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": user_text},
                        {"type": "image_url", "image_url": {"url": data_url}},
                    ],
                },
            ],
        )
        content = completion.choices[0].message.content or "{}"
        return json.loads(content)

    async def text_json(
        self,
        *,
        system: str,
        user_text: str,
        schema: dict[str, Any],
        schema_name: str,
    ) -> dict[str, Any]:
        messages = [
            {"role": "system", "content": system},
            {"role": "user", "content": user_text},
        ]
        parsed: dict[str, Any] | None = None
        for _ in range(2):
            completion = await self.client.chat.completions.create(
                model=self.settings.text_model,
                temperature=0.2,
                max_completion_tokens=12000,
                response_format={
                    "type": "json_schema",
                    "json_schema": {
                        "name": schema_name,
                        "schema": schema,
                        "strict": False,
                    },
                },
                messages=messages,
            )
            message = completion.choices[0].message
            parsed = parse_json_object(message.content or "") or parse_json_object(
                getattr(message, "reasoning_content", None) or ""
            )
            if parsed is not None:
                return parsed
        raise ValueError(f"{schema_name} returned no JSON")

    async def repair_json(
        self,
        *,
        schema_name: str,
        schema: dict[str, Any],
        broken: str,
        instruction: str,
    ) -> dict[str, Any]:
        if not broken.strip() or broken.strip() in {"{}", "null"}:
            raise ValueError(f"{schema_name} had an empty payload to repair")
        return await self.text_json(
            system=(
                "You repair malformed JSON so it matches the required schema. "
                "Return only valid JSON. Do not invent facts beyond the broken payload."
            ),
            user_text=f"{instruction}\n\nBroken payload:\n{broken}",
            schema=schema,
            schema_name=schema_name,
        )
