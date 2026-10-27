from __future__ import annotations

from tavily import TavilyClient

from app.config import Settings
from app.models.incident import ContextSource


class TavilySearchClient:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.client = TavilyClient(api_key=settings.tavily_api_key or "missing")

    def search(self, query: str, *, max_results: int = 4) -> list[ContextSource]:
        response = self.client.search(
            query=query,
            search_depth="basic",
            include_answer=True,
            max_results=max_results,
        )
        sources: list[ContextSource] = []
        answer = response.get("answer")
        if answer:
            sources.append(
                ContextSource(
                    title="Tavily answer summary",
                    url="https://tavily.com/",
                    snippet=str(answer)[:600],
                    query=query,
                )
            )
        for item in response.get("results", [])[:max_results]:
            sources.append(
                ContextSource(
                    title=item.get("title") or "Untitled source",
                    url=item.get("url") or "",
                    snippet=(item.get("content") or "")[:500],
                    query=query,
                )
            )
        return sources
