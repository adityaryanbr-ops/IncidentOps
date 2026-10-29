from __future__ import annotations

import asyncio
import json
import re
from functools import partial
import uuid
from typing import Any

from pydantic import ValidationError

from app.agents import demo_data, prompts
from app.clients.nebius import NebiusClient
from app.clients.tavily import TavilySearchClient
from app.config import Settings
from app.models.incident import (
    ContextSource,
    IncidentReport,
    HelplineDirectory,
    PipelineResult,
    SeverityAssessment,
    VisualObservation,
)
from app.services.trace import TraceCollector
from app.services.helplines import supported_helplines, helpline_markdown, resolve_incident_area, remove_contact_prose, official_helplines, merge_helplines


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

        location = await resolve_incident_area(location, latitude, longitude)
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
            f"{assessment.category} {report_text[:160]} safety advisories near {location}",
        ]

        has_area = not bool(re.fullmatch(r"[\d\s,+.\-]+", location))
        contact_queries = [
            f"{location} official emergency services telephone number",
            f"{location} {assessment.category} {report_text[:120]} official helpline reporting phone number",
        ] if has_area else []

        sources = []
        contact_search_failed = False
        with trace.step(
            "tavily_search",
            "Tavily",
            f"Runtime search for {len(queries) + len(contact_queries)} context and helpline queries",
        ) as meta:
            loop = asyncio.get_running_loop()
            for query in queries:
                try:
                    batch = await loop.run_in_executor(None, self.tavily.search, query)
                    sources.extend(batch)
                except Exception:
                    contact_search_failed = True
            for query in contact_queries:
                try:
                    batch = await loop.run_in_executor(None, partial(self.tavily.search, query, contacts=True))
                    sources.extend(batch)
                except Exception:
                    # Keep the report available if a contact search fails; never replace missing numbers with guesses.
                    contact_search_failed = True
                    continue
            meta["detail"] = f"Retrieved {len(sources)} sources including dedicated helpline searches"
            if contact_search_failed:
                meta["status"] = "error"
                meta["detail"] += "; a contact search failed; checking official references"

        contacts = []
        contact_extraction_failed = False
        with trace.step("helpline_lookup", "Nebius Token Factory", "Extract source-backed incident contacts", model=self.settings.text_model) as contact_meta:
            try:
                if not has_area:
                    raise ValueError("The incident jurisdiction could not be resolved")
                directory_raw = await self.nebius.text_json(
                    system=prompts.HELPLINES_SYSTEM,
                    user_text=f"Location: {location}\nIncident: {report_text}\nAssessment: {assessment.model_dump_json()}\nSources: {json.dumps([s.model_dump() for s in sources])}",
                    schema=_schema(HelplineDirectory),
                    schema_name="helpline_directory",
                )
                directory = await self._parse_model(HelplineDirectory, directory_raw, schema_name="helpline_directory")
                contacts = supported_helplines(directory.helplines, sources)
            except Exception:
                contact_extraction_failed = True
                contact_meta["status"] = "error" if has_area else "skipped"
                contact_meta["detail"] = "Live directory extraction failed; checking official reference contacts" if has_area else "Incident country could not be resolved"
        live_contacts = contacts
        official = official_helplines(location, assessment.category + " " + report_text)
        contacts = merge_helplines(official, live_contacts)
        if live_contacts:
            contact_state = "found"
            contact_status = "Official reference numbers and source-backed live contacts. Check the service jurisdiction and purpose before calling. No services have been dispatched."
        elif official:
            contact_state = "official_fallback"
            contact_status = "Local contacts could not be confirmed. Official emergency numbers for the stated country are shown below; local station availability has not been checked. No services have been dispatched."
        elif not has_area:
            contact_state = "location_required"
            contact_status = "The country could not be resolved from these coordinates. Add the incident city and country to look up the right contacts."
        elif contact_search_failed or contact_extraction_failed:
            contact_state = "lookup_failed"
            contact_status = "Live contact lookup failed. This does not mean emergency services are unavailable. Try again or consult the official emergency authority for the incident country."
        else:
            contact_state = "not_found"
            contact_status = "No suitable local contact was found in the retrieved evidence. Include the incident country and check the official emergency authority."
        for contact in official:
            sources.append(ContextSource(title=contact.service + " — official directory", url=contact.source_url, snippet=contact.evidence_quote, query="Reviewed official emergency reference"))

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
                    helplines_json=json.dumps([c.model_dump() for c in contacts]),
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
            report.live_context_summary = remove_contact_prose(report.live_context_summary)
            report.immediate_actions = [remove_contact_prose(action) for action in report.immediate_actions]
            if report.severity in {"high", "critical"} and not report.emergency_notice:
                report.emergency_notice = "If anyone is in immediate danger, contact emergency services using the helpline section. Do not wait for AI confirmation."
            if report.emergency_notice:
                report.emergency_notice = remove_contact_prose(report.emergency_notice)
            report.helplines = contacts
            report.helpline_status = contact_status
            report.helpline_lookup_state = contact_state
            if not report.sources:
                report.sources = sources
            report.sources = list({source.url: source for source in [*report.sources, *sources]}.values())
            report.markdown_report = self._fallback_markdown(report)
            # Render contacts from checked structured data, independent of the model's prose.
            report.markdown_report += helpline_markdown(contacts, contact_status)

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

        report.helpline_lookup_state = "demo"
        report.helpline_status = "Demo mode: live helpline lookup is disabled. No real emergency phone numbers are supplied."
        report.markdown_report += helpline_markdown([], report.helpline_status)
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
        sections = [
            f"# {report.title}\n\n**Severity:** {report.severity} ({report.severity_confidence:.0%})\n**Location:** {report.location}",
            "## Observed facts\n" + "\n".join(f"- {x}" for x in report.observed_facts),
            "## Inferences\n" + "\n".join(f"- {x}" for x in report.inferences),
            "## Unknowns\n" + "\n".join(f"- {x}" for x in report.unknowns),
            "## Immediate actions\n" + "\n".join(f"- {x}" for x in report.immediate_actions),
            "## Checklist\n" + "\n".join(f"- {x.priority}: {x.action} ({x.owner_hint}) — {x.rationale}" for x in report.checklist),
            "## Live context\n" + report.live_context_summary,
            "## Human verification\n" + "\n".join(f"- {x}" for x in report.human_verification_required),
            "## Sources\n" + "\n".join(f"- [{x.title}]({x.url})" for x in report.sources),
        ]
        if report.emergency_notice:
            sections.insert(1, report.emergency_notice)
        return "\n\n".join(sections)
