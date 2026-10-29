from __future__ import annotations

import re

from tavily import TavilyClient

from app.config import Settings
from app.models.incident import ContextSource


class TavilySearchClient:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.client = TavilyClient(api_key=settings.tavily_api_key or "missing")

    def search(self, query: str, *, max_results: int = 4, contacts: bool = False) -> list[ContextSource]:
        response = self.client.search(
            query=query,
            search_depth="advanced" if contacts else "basic",
            include_answer=False,
            max_results=max_results,
            **({"include_domains": ["gov.in", "nic.in"]} if contacts and re.search(r"\bindia\b", query, re.I) else {}),
        )
        sources: list[ContextSource] = []
        for item in response.get("results", [])[:max_results]:
            sources.append(
                ContextSource(
                    title=item.get("title") or "Untitled source",
                    url=item.get("url") or "",
                    snippet=(item.get("content") or "")[:4000 if contacts else 500],
                    query=query,
                )
            )
        return sources
