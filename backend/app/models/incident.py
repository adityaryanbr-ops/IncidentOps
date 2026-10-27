from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


Severity = Literal["low", "medium", "high", "critical"]


class VisualObservation(BaseModel):
    summary: str
    hazards: list[str] = Field(default_factory=list)
    damaged_objects: list[str] = Field(default_factory=list)
    people_or_vehicles: list[str] = Field(default_factory=list)
    environmental_conditions: list[str] = Field(default_factory=list)
    observed_facts: list[str] = Field(default_factory=list)
    unknowns: list[str] = Field(default_factory=list)
    confidence: float = Field(ge=0.0, le=1.0, default=0.6)


class SeverityAssessment(BaseModel):
    severity: Severity
    confidence: float = Field(ge=0.0, le=1.0)
    rationale: str
    category: str
    search_queries: list[str] = Field(default_factory=list, max_length=3)
    immediate_risks: list[str] = Field(default_factory=list)


class ContextSource(BaseModel):
    title: str
    url: str
    snippet: str
    query: str


class ChecklistItem(BaseModel):
    priority: Literal["P0", "P1", "P2"]
    action: str
    owner_hint: str = "On-site responder"
    rationale: str


class IncidentReport(BaseModel):
    title: str
    severity: Severity
    severity_confidence: float
    category: str
    location: str
    observed_facts: list[str]
    inferences: list[str]
    unknowns: list[str]
    immediate_actions: list[str]
    checklist: list[ChecklistItem]
    live_context_summary: str
    sources: list[ContextSource]
    human_verification_required: list[str]
    emergency_notice: str | None = None
    markdown_report: str


class TraceStep(BaseModel):
    step: str
    provider: str
    detail: str
    model: str | None = None
    latency_ms: int | None = None
    status: Literal["ok", "skipped", "error", "demo"] = "ok"


class PipelineResult(BaseModel):
    id: str
    demo_mode: bool
    report: IncidentReport
    visual: VisualObservation
    assessment: SeverityAssessment
    trace: list[TraceStep]
    models_used: list[str]
    nebius_base_url: str
