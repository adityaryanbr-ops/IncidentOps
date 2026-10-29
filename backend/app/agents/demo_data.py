from __future__ import annotations

from app.models.incident import (
    ChecklistItem,
    ContextSource,
    IncidentReport,
    SeverityAssessment,
    VisualObservation,
)


def demo_visual(location: str, report_text: str) -> VisualObservation:
    return VisualObservation(
        summary=(
            f"Demo visual pass for {location}: apparent infrastructure disruption "
            "with debris and restricted access indicators visible in the sample photo."
        ),
        hazards=["debris in walkway", "possible trip hazard", "partial access obstruction"],
        damaged_objects=["barrier/fence segment", "pavement surface disruption"],
        people_or_vehicles=["no clear injured persons identified in demo sample"],
        environmental_conditions=["daytime outdoor scene", "wet or stained surface possible"],
        observed_facts=[
            "Pathway or roadway surface appears disrupted.",
            "Temporary or damaged barriers are visible.",
            f"Reporter states: {report_text[:180]}",
        ],
        unknowns=[
            "Exact structural integrity cannot be confirmed from a single photo.",
            "Whether utilities are affected is unknown.",
            "Crowd density beyond the frame is unknown.",
        ],
        confidence=0.62,
    )


def demo_assessment(location: str) -> SeverityAssessment:
    return SeverityAssessment(
        severity="high",
        confidence=0.71,
        rationale=(
            "Visible access obstruction and debris create immediate pedestrian risk. "
            "Human confirmation is required before escalating response."
        ),
        category="infrastructure_damage",
        search_queries=[
            f"current weather and travel hazards near {location}",
            f"emergency facilities and road closures near {location}",
        ],
        immediate_risks=["trip/fall risk", "blocked egress", "secondary vehicle conflict"],
    )


def demo_sources(location: str) -> list[ContextSource]:
    return [
        ContextSource(
            title="Local weather advisory (demo)",
            url="https://example.com/demo-weather",
            snippet=f"Demo weather context for {location}: gusty winds and wet surfaces may worsen debris hazards.",
            query=f"current weather and travel hazards near {location}",
        ),
        ContextSource(
            title="Nearby facilities overview (demo)",
            url="https://example.com/demo-facilities",
            snippet=f"Demo facilities context for {location}: campus safety desk and nearest urgent care listed for responders.",
            query=f"emergency facilities and road closures near {location}",
        ),
    ]


def demo_report(
    *,
    location: str,
    report_text: str,
    visual: VisualObservation,
    assessment: SeverityAssessment,
    sources: list[ContextSource],
) -> IncidentReport:
    title = f"Advisory incident near {location}"
    markdown = f"""# {title}

**Advisory severity:** {assessment.severity.upper()} (confidence {assessment.confidence:.0%})
**Category:** {assessment.category}
**Location:** {location}

## Observed facts
{chr(10).join(f'- {fact}' for fact in visual.observed_facts)}

## Inferences
- Access should be treated as restricted until cleared by on-site staff.
- Weather/live context may increase secondary risk around debris.

## Live context
{chr(10).join(f'- [{s.title}]({s.url}): {s.snippet}' for s in sources)}

## Immediate actions
1. Establish a temporary perimeter and divert pedestrians.
2. Photograph wider scene and note utility markers.
3. Confirm whether vehicles can safely pass.
4. Escalate to facilities/campus safety for structural assessment.

## Unknowns
{chr(10).join(f'- {u}' for u in visual.unknowns)}

> Demo mode: Nebius/Tavily keys were not configured, so this brief used the local fallback.
Reporter note: {report_text}
"""
    return IncidentReport(
        title=title,
        severity=assessment.severity,
        severity_confidence=assessment.confidence,
        category=assessment.category,
        location=location,
        observed_facts=visual.observed_facts,
        inferences=[
            "Access likely needs temporary restriction pending inspection.",
            "Secondary pedestrian risk is elevated if weather is wet or windy.",
        ],
        unknowns=visual.unknowns,
        immediate_actions=[
            "Establish temporary perimeter and divert pedestrians.",
            "Capture wider-scene photos and utility markers.",
            "Confirm vehicle passability and notify facilities.",
        ],
        checklist=[
            ChecklistItem(
                priority="P1",
                action="Secure the immediate area and prevent pedestrian entry through debris.",
                owner_hint="First on-scene responder",
                rationale="Visible obstruction creates immediate trip/fall risk.",
            ),
            ChecklistItem(
                priority="P2",
                action="Notify facilities/campus safety for structural and utilities review.",
                owner_hint="Shift lead",
                rationale="Single-image evidence cannot confirm structural integrity.",
            ),
            ChecklistItem(
                priority="P3",
                action="Log weather/closure sources and attach them to the incident record.",
                owner_hint="Incident scribe",
                rationale="Live context should remain auditable for handoff.",
            ),
        ],
        live_context_summary=(
            "Demo live context suggests monitoring weather and nearby response facilities "
            "while the scene is secured."
        ),
        sources=sources,
        human_verification_required=[
            "Confirm severity on site before escalating.",
            "Verify no medical emergencies beyond the camera frame.",
            "Do not treat this output as automated emergency dispatch.",
        ],
        emergency_notice=(
            "If anyone is injured or there is an immediate life-safety risk, "
            "contact local emergency services now."
        ),
        markdown_report=markdown,
    )
