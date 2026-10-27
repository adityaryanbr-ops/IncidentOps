from __future__ import annotations

import asyncio
import json
import uuid
from typing import Any

from pydantic import ValidationError

from app.agents import demo_data, prompts
from app.clients.nebius import NebiusClient
from app.clients.tavily import TavilySearchClient
from app.config import Settings
from app.models.incident import (
    IncidentReport,
    PipelineResult,
    SeverityAssessment,
    VisualObservation,
)
from app.services.trace import TraceCollector


def _schema(model: type) -> dict[str, Any]:
    return model.model_json_schema()


class IncidentPipeline:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.nebius = NebiusClient(settings)
        self.tavily = TavilySearchClient(settings)

    async def run(
        self,
        *,
        image_bytes: bytes,
        mime: str,
        report_text: str,
        location: str,
        transcript: str | None,
        latitude: float | None,
        longitude: float | None,
    ) -> PipelineResult:
        if self.settings.demo_mode:
            return await self._run_demo(
                report_text=report_text,
                location=location,
            )

        trace = TraceCollector()
        models_used = [self.settings.vision_model, self.settings.text_model]

        with trace.step(
            "vision_extract",
            "Nebius Token Factory",
            "Nemotron Super VL extracts visual evidence",
            model=self.settings.vision_model,
        ):
            visual_raw = await self.nebius.vision_json(
                system=prompts.VISION_SYSTEM,
                user_text=prompts.VISION_USER.format(
                    location=location,
                    report_text=report_text,
                    transcript=transcript or "(none)",
                ),
                image_bytes=image_bytes,
                mime=mime,
                schema=_schema(VisualObservation),
            )
            visual = await self._parse_model(
                VisualObservation,
                visual_raw,
                schema_name="visual_observation",
            )

        with trace.step(
            "severity_plan",
            "Nebius Token Factory",
            "Nemotron Nano classifies severity and plans searches",
            model=self.settings.text_model,
        ):
            assess_raw = await self.nebius.text_json(
                system=prompts.ASSESS_SYSTEM,
                user_text=prompts.ASSESS_USER.format(
                    location=location,
                    report_text=report_text,
                    visual_json=visual.model_dump_json(indent=2),
                ),
                schema=_schema(SeverityAssessment),
                schema_name="severity_assessment",
            )
            assessment = await self._parse_model(
                SeverityAssessment,
                assess_raw,
                schema_name="severity_assessment",
            )

        queries = assessment.search_queries[:2] or [
            f"current hazards and weather near {location}",
            f"road closures and emergency facilities near {location}",
        ]

        sources = []
        with trace.step(
            "tavily_search",
            "Tavily",
            f"Runtime search for {len(queries)} live-context queries",
        ) as meta:
            loop = asyncio.get_running_loop()
            for query in queries:
                batch = await loop.run_in_executor(None, self.tavily.search, query)
                sources.extend(batch)
            meta["detail"] = f"Retrieved {len(sources)} sources from {len(queries)} queries"

        coordinates = (
            f"{latitude},{longitude}" if latitude is not None and longitude is not None else "not provided"
        )

        with trace.step(
            "response_brief",
            "Nebius Token Factory",
            "Nemotron Nano drafts sourced response brief",
            model=self.settings.text_model,
        ):
            brief_raw = await self.nebius.text_json(
                system=prompts.BRIEF_SYSTEM,
                user_text=prompts.BRIEF_USER.format(
                    location=location,
                    coordinates=coordinates,
                    report_text=report_text,
                    visual_json=visual.model_dump_json(indent=2),
                    assessment_json=assessment.model_dump_json(indent=2),
                    sources_json=json.dumps([s.model_dump() for s in sources], indent=2),
                ),
                schema=_schema(IncidentReport),
                schema_name="incident_report",
            )
            report = await self._parse_model(
                IncidentReport,
                brief_raw,
                schema_name="incident_report",
            )
            if not report.sources:
                report.sources = sources
            if not report.markdown_report:
                report.markdown_report = self._fallback_markdown(report)

        return PipelineResult(
            id=str(uuid.uuid4()),
            demo_mode=False,
            report=report,
            visual=visual,
            assessment=assessment,
            trace=trace.steps,
            models_used=models_used,
            nebius_base_url=self.settings.nebius_base_url,
        )

    async def _parse_model(self, model: type, payload: dict[str, Any] | str, schema_name: str):
        if isinstance(payload, str):
            raw = payload
            data: Any = payload
        else:
            data = payload
            raw = json.dumps(payload)

        try:
            if isinstance(data, str):
                return model.model_validate_json(data)
            return model.model_validate(data)
        except (ValidationError, json.JSONDecodeError):
            repaired = await self.nebius.repair_json(
                schema_name=schema_name,
                schema=_schema(model),
                broken=raw,
                instruction=f"Repair into valid {schema_name} JSON.",
            )
            return model.model_validate(repaired)

    async def _run_demo(self, *, report_text: str, location: str) -> PipelineResult:
        trace = TraceCollector()
        with trace.step(
            "vision_extract",
            "Demo fallback",
            "No NEBIUS_API_KEY — using local visual stub",
            model=self.settings.vision_model,
            status="demo",
        ):
            await asyncio.sleep(0.15)
            visual = demo_data.demo_visual(location, report_text)

        with trace.step(
            "severity_plan",
            "Demo fallback",
            "No NEBIUS_API_KEY — using local severity stub",
            model=self.settings.text_model,
            status="demo",
        ):
            await asyncio.sleep(0.1)
            assessment = demo_data.demo_assessment(location)

        with trace.step(
            "tavily_search",
            "Demo fallback",
            "No TAVILY_API_KEY — using local source stubs",
            status="demo",
        ):
            await asyncio.sleep(0.08)
            sources = demo_data.demo_sources(location)

        with trace.step(
            "response_brief",
            "Demo fallback",
            "Assembled local response brief",
            model=self.settings.text_model,
            status="demo",
        ):
            report = demo_data.demo_report(
                location=location,
                report_text=report_text,
                visual=visual,
                assessment=assessment,
                sources=sources,
            )

        return PipelineResult(
            id=str(uuid.uuid4()),
            demo_mode=True,
            report=report,
            visual=visual,
            assessment=assessment,
            trace=trace.steps,
            models_used=[self.settings.vision_model, self.settings.text_model],
            nebius_base_url=self.settings.nebius_base_url,
        )

    @staticmethod
    def _fallback_markdown(report: IncidentReport) -> str:
        return (
            f"# {report.title}\n\n"
            f"**Severity:** {report.severity} ({report.severity_confidence:.0%})\n"
            f"**Location:** {report.location}\n\n"
            f"## Observed facts\n"
            + "\n".join(f"- {x}" for x in report.observed_facts)
            + "\n\n## Immediate actions\n"
            + "\n".join(f"- {x}" for x in report.immediate_actions)
        )
