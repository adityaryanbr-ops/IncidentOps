"use client";

import { useEffect, useState } from "react";
import { IncidentCard } from "@/components/incident-card";
import { IncidentForm } from "@/components/incident-form";
import { IncidentReportView } from "@/components/incident-report";
import { getHealth } from "@/lib/api";
import { loadIncidents, saveIncident } from "@/lib/storage";
import type { PipelineResult, SavedIncident } from "@/lib/types";
import { Activity, ShieldAlert } from "lucide-react";

export default function HomePage() {
  const [busy, setBusy] = useState(false);
  const [active, setActive] = useState<SavedIncident | null>(null);
  const [incidents, setIncidents] = useState<SavedIncident[]>([]);
  const [health, setHealth] = useState<{
    demo_mode?: boolean;
    vision_model?: string;
    text_model?: string;
    nebius_configured?: boolean;
    tavily_configured?: boolean;
  } | null>(null);
  const [healthError, setHealthError] = useState<string | null>(null);

  useEffect(() => {
    setIncidents(loadIncidents());
    getHealth()
      .then((body) => {
        setHealth(body);
        setHealthError(null);
      })
      .catch((err) => {
        setHealthError(err instanceof Error ? err.message : "API offline");
      });
  }, []);

  function handleResult(result: PipelineResult, previewDataUrl?: string) {
    const saved: SavedIncident = {
      ...result,
      savedAt: new Date().toISOString(),
      previewDataUrl,
      reportText: result.report.observed_facts[0] || result.report.title,
    };
    const next = saveIncident(saved);
    setIncidents(next);
    setActive(saved);
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-4 pb-16 pt-6 md:px-8">
      <header className="hero-shell fade-up mb-8 rounded-[2rem] px-6 py-8 text-teal-50 md:px-10 md:py-12">
        <div className="relative z-10 grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-200">
              ASTRAX · Best Apps and Agents
            </p>
            <h1 className="mt-4 font-display text-5xl leading-[0.92] md:text-7xl">
              IncidentOps
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-teal-50/85 md:text-lg">
              Turn a field photo and rough report into an evidence-grounded
              response brief — powered by NVIDIA Nemotron on Nebius Token Factory
              and live Tavily context.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href="#workspace"
                className="rounded-full bg-amber-300 px-5 py-2.5 text-sm font-semibold text-teal-950 transition hover:bg-amber-200"
              >
                Open workspace
              </a>
              <a
                href="#trace-anchor"
                className="rounded-full border border-teal-100/35 px-5 py-2.5 text-sm font-medium text-teal-50 transition hover:bg-white/10"
              >
                See Nebius runtime path
              </a>
            </div>
          </div>
          <div className="rounded-[1.4rem] border border-white/15 bg-black/20 p-5 backdrop-blur-sm">
            <div className="flex items-center gap-2 text-amber-200">
              <Activity className="size-4" />
              <span className="text-xs font-semibold uppercase tracking-[0.16em]">
                Runtime stack
              </span>
            </div>
            <div className="signal-line mt-3 w-full" />
            <ul className="mt-4 space-y-3 text-sm text-teal-50/90">
              <li>Nebius Token Factory · OpenAI-compatible API</li>
              <li>{health?.vision_model || "nvidia/Nemotron-3.5-Super-VL"}</li>
              <li>
                {health?.text_model || "nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B"}
              </li>
              <li>Tavily Search API for live operational context</li>
            </ul>
            <p className="mt-4 text-xs text-teal-100/75">
              {healthError
                ? `API status: ${healthError}`
                : !health
                  ? "Checking API…"
                  : health.demo_mode ||
                      !health.nebius_configured ||
                      !health.tavily_configured
                    ? "Demo mode active until NEBIUS_API_KEY and TAVILY_API_KEY are set."
                    : "Live keys detected — analyses will call Nebius + Tavily."}
            </p>
          </div>
        </div>
      </header>

      <div id="workspace" className="grid gap-8 lg:grid-cols-[0.92fr_1.08fr]">
        <section className="fade-up space-y-6 rounded-[1.8rem] border border-[var(--line)] bg-white/70 p-5 shadow-[0_18px_50px_rgba(16,38,43,0.06)] backdrop-blur md:p-6">
          <div>
            <p className="section-kicker">Intake</p>
            <h2 className="mt-2 font-display text-3xl text-[var(--ink)]">
              Capture the scene
            </h2>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Upload evidence, add location context, and let the agent loop
              classify severity, pull live sources, and draft the checklist.
            </p>
          </div>
          <IncidentForm onResult={handleResult} busy={busy} setBusy={setBusy} />

          <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-4">
            <div className="flex items-center gap-2 text-teal-900">
              <ShieldAlert className="size-4" />
              <p className="text-sm font-medium">Advisory only</p>
            </div>
            <p className="mt-2 text-sm text-[var(--muted)]">
              IncidentOps does not dispatch emergency services. Severity is an
              advisory for human confirmation.
            </p>
          </div>
        </section>

        <section className="space-y-6">
          <div className="rounded-[1.8rem] border border-[var(--line)] bg-white/70 p-5 backdrop-blur md:p-6">
            <div className="mb-4 flex items-end justify-between gap-3">
              <div>
                <p className="section-kicker">Ops board</p>
                <h2 className="mt-2 font-display text-3xl text-[var(--ink)]">
                  Incident cards
                </h2>
              </div>
              <p className="text-sm text-[var(--muted)]">
                {incidents.length} saved locally
              </p>
            </div>
            {incidents.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-[var(--line)] bg-[var(--panel)] px-4 py-8 text-sm text-[var(--muted)]">
                No incidents yet. Run a sample analysis to populate the board.
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {incidents.map((incident) => (
                  <IncidentCard
                    key={incident.id}
                    incident={incident}
                    active={active?.id === incident.id}
                    onSelect={() => setActive(incident)}
                  />
                ))}
              </div>
            )}
          </div>

          <div id="trace-anchor">
            {active ? (
              <IncidentReportView result={active} />
            ) : (
              <div className="rounded-[1.8rem] border border-dashed border-[var(--line)] bg-white/55 px-6 py-16 text-center">
                <p className="font-display text-2xl text-[var(--ink)]">
                  Waiting for first analysis
                </p>
                <p className="mx-auto mt-3 max-w-md text-sm text-[var(--muted)]">
                  Your sourced brief, checklist, and Nebius/Tavily execution
                  trace will appear here.
                </p>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
