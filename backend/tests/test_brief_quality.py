from app.agents.brief_quality import salvage_report
from app.clients.nebius import parse_json_object
from app.models.incident import IncidentReport, SeverityAssessment, VisualObservation


def _visual() -> VisualObservation:
    return VisualObservation(
        summary="A white SUV is engulfed in flames on a paved road. Thick black smoke is rising.",
        hazards=["flames", "thick black smoke"],
        confidence=0.8,
    )


def _assessment() -> SeverityAssessment:
    return SeverityAssessment(
        severity="low",
        confidence=0.4,
        rationale="empty payload provided, no data to repair",
        category="vehicle fire",
        search_queries=["vehicle fire"],
    )


def _report() -> IncidentReport:
    return IncidentReport(
        title="Low priority note",
        severity="low",
        severity_confidence=0.2,
        category="vehicle fire",
        location="Hyderabad, India",
        observed_facts=[],
        inferences=["empty_payload"],
        unknowns=[],
        immediate_actions=[],
        checklist=[],
        live_context_summary="empty payload provided, no data to repair",
        sources=[],
        human_verification_required=["empty_payload"],
        markdown_report="",
    )


def test_empty_draft_does_not_become_low_priority_advice():
    report = salvage_report(_report(), visual=_visual(), assessment=_assessment())
    assert report.severity == "high"
    assert report.immediate_actions
    assert "empty_payload" not in " ".join(report.immediate_actions + report.human_verification_required)
    assert "no data to repair" not in report.live_context_summary
    assert "engulfed" in report.observed_facts[0]


def test_ordinary_scene_keeps_its_actions_and_severity():
    visual = VisualObservation(summary="A fence panel is lying across a walkway.", confidence=0.7)
    assessment = SeverityAssessment(
        severity="low",
        confidence=0.6,
        rationale="Debris is a trip hazard, not an active emergency.",
        category="obstruction",
    )
    report = _report().model_copy(
        update={
            "severity": "low",
            "observed_facts": ["A fence panel blocks the walkway."],
            "inferences": [],
            "immediate_actions": ["Keep pedestrians off the panel."],
            "live_context_summary": "No closure notice was found.",
            "human_verification_required": ["Confirm the path is still blocked."],
        }
    )
    salvaged = salvage_report(report, visual=visual, assessment=assessment)
    assert salvaged.severity == "low"
    assert salvaged.immediate_actions == ["Keep pedestrians off the panel."]


def test_json_parser_rejects_an_empty_payload_and_reads_fenced_objects():
    assert parse_json_object("") is None
    assert parse_json_object("{}") is None
    assert parse_json_object('```json\n{"severity": "high"}\n```') == {"severity": "high"}
    leaked = '<think>{"severity": "low"}</think>{"severity": "high", "action": "Stay back"}'
    assert parse_json_object(leaked) == {"severity": "high", "action": "Stay back"}
    assert parse_json_object('{"severity": "critical\'}</think>{", "action": "wait"}') is None
