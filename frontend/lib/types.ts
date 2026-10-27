export type Severity = "low" | "medium" | "high" | "critical";

export type TraceStep = {
  step: string;
  provider: string;
  detail: string;
  model?: string | null;
  latency_ms?: number | null;
  status: "ok" | "skipped" | "error" | "demo";
};

export type ContextSource = {
  title: string;
  url: string;
  snippet: string;
  query: string;
};

export type ChecklistItem = {
  priority: "P0" | "P1" | "P2";
  action: string;
  owner_hint: string;
  rationale: string;
};

export type IncidentReport = {
  title: string;
  severity: Severity;
  severity_confidence: number;
  category: string;
  location: string;
  observed_facts: string[];
  inferences: string[];
  unknowns: string[];
  immediate_actions: string[];
  checklist: ChecklistItem[];
  live_context_summary: string;
  sources: ContextSource[];
  human_verification_required: string[];
  emergency_notice?: string | null;
  markdown_report: string;
};

export type VisualObservation = {
  summary: string;
  hazards: string[];
  damaged_objects: string[];
  people_or_vehicles: string[];
  environmental_conditions: string[];
  observed_facts: string[];
  unknowns: string[];
  confidence: number;
};

export type PipelineResult = {
  id: string;
  demo_mode: boolean;
  report: IncidentReport;
  visual: VisualObservation;
  assessment: {
    severity: Severity;
    confidence: number;
    rationale: string;
    category: string;
    search_queries: string[];
    immediate_risks: string[];
  };
  trace: TraceStep[];
  models_used: string[];
  nebius_base_url: string;
};

export type SavedIncident = PipelineResult & {
  savedAt: string;
  previewDataUrl?: string;
  reportText: string;
};

export type SampleIncident = {
  id: string;
  title: string;
  location: string;
  reportText: string;
  imagePath: string;
  latitude?: number;
  longitude?: number;
};
