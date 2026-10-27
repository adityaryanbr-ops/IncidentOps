from __future__ import annotations

import base64
import json
from typing import Any

from openai import AsyncOpenAI

from app.config import Settings


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
        completion = await self.client.chat.completions.create(
            model=self.settings.text_model,
            temperature=0.2,
            response_format={
                "type": "json_schema",
                "json_schema": {
                    "name": schema_name,
                    "schema": schema,
                    "strict": False,
                },
            },
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user_text},
            ],
        )
        content = completion.choices[0].message.content or "{}"
        return json.loads(content)

    async def repair_json(
        self,
        *,
        schema_name: str,
        schema: dict[str, Any],
        broken: str,
        instruction: str,
    ) -> dict[str, Any]:
        return await self.text_json(
            system=(
                "You repair malformed JSON so it matches the required schema. "
                "Return only valid JSON. Do not invent facts beyond the broken payload."
            ),
            user_text=f"{instruction}\n\nBroken payload:\n{broken}",
            schema=schema,
            schema_name=schema_name,
        )
