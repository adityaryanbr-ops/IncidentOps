import type { PipelineResult } from "./types";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ||
  "http://127.0.0.1:8765";

export async function getHealth() {
  const res = await fetch(`${API_BASE}/health`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Health check failed (${res.status})`);
  }
  return res.json();
}

export async function analyzeIncident(form: FormData): Promise<PipelineResult> {
  const res = await fetch(`${API_BASE}/api/incidents/analyze`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) {
    let detail = `Analyze failed (${res.status})`;
    try {
      const body = await res.json();
      detail = body.detail || detail;
    } catch {
      // ignore
    }
    throw new Error(typeof detail === "string" ? detail : JSON.stringify(detail));
  }
  return res.json();
}

export { API_BASE };
