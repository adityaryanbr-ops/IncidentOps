"""Keep a failed model draft from becoming the advice a person sees."""

from __future__ import annotations

import re

from app.models.incident import IncidentReport, SeverityAssessment, VisualObservation

_JUNK = re.compile(r"empty[_\s-]?payload|no data to repair", re.I)
_ACTIVE_HAZARD = re.compile(r"\b(engulfed|flames?|on fire|ablaze|explosion|blaze)\b", re.I)
_RANK = {"low": 0, "medium": 1, "high": 2, "critical": 3}


def is_junk(text: str) -> bool:
    return bool(_JUNK.search(text or ""))


def evidence_text(visual: VisualObservation) -> str:
    return " ".join(
        [
            visual.summary,
            *visual.hazards,
            *visual.observed_facts,
            *visual.damaged_objects,
            *visual.people_or_vehicles,
        ]
    )


def floor_severity(current: str, visual: VisualObservation) -> str:
    if _ACTIVE_HAZARD.search(evidence_text(visual)) and _RANK.get(current, 0) < _RANK["high"]:
        return "high"
    return current


def clean_lines(items: list[str]) -> list[str]:
    return [item.strip() for item in items if item and item.strip() and not is_junk(item)]


def fallback_actions(visual: VisualObservation, severity: str) -> list[str]:
    actions: list[str] = []
    if severity in {"high", "critical"}:
        actions.append("Stay back from the scene and keep other people away.")
        if _ACTIVE_HAZARD.search(evidence_text(visual)):
            actions.append("Do not approach the fire or try to put it out.")
        actions.append(
            "If someone may be in danger, use the helpline section. IncidentOps does not contact emergency services."
        )
    else:
        actions.append("Look at the scene from a safe distance and confirm the advice before acting.")
    return actions


def salvage_report(
    report: IncidentReport,
    *,
    visual: VisualObservation,
    assessment: SeverityAssessment,
) -> IncidentReport:
    severity = floor_severity(report.severity, visual)
    assessed = floor_severity(assessment.severity, visual)
    if _RANK.get(assessed, 0) > _RANK.get(severity, 0):
        severity = assessed

    facts = clean_lines(report.observed_facts) or clean_lines(visual.observed_facts)
    if not facts and visual.summary and not is_junk(visual.summary):
        facts = [visual.summary]

    actions = clean_lines(report.immediate_actions) or fallback_actions(visual, severity)
    summary = report.live_context_summary
    if not summary or is_junk(summary):
        summary = (
            "Public search results are context only. They are not confirmation that those pages describe this incident."
        )
    verification = clean_lines(report.human_verification_required) or [
        "Confirm what you can see at the scene before acting."
    ]
    notice = report.emergency_notice
    if notice and is_junk(notice):
        notice = None
    title = report.title.strip()
    if not title or is_junk(title):
        title = visual.summary[:90].strip() or "Incident brief"

    return report.model_copy(
        update={
            "title": title,
            "severity": severity,
            "observed_facts": facts,
            "inferences": clean_lines(report.inferences),
            "unknowns": clean_lines(report.unknowns),
            "immediate_actions": actions,
            "checklist": [item for item in report.checklist if not is_junk(item.action)],
            "live_context_summary": summary,
            "human_verification_required": verification,
            "emergency_notice": notice,
        }
    )
