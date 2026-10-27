"use client";

import { Button } from "@/components/ui/button";
import { ExecutionTrace } from "@/components/execution-trace";
import { SeverityBadge } from "@/components/severity-badge";
import { SourceList } from "@/components/source-list";
import { downloadMarkdown, printReport } from "@/lib/export";
import type { PipelineResult } from "@/lib/types";
import { Download, Printer } from "lucide-react";

export function IncidentReportView({ result }: { result: PipelineResult }) {
  const { report, visual, assessment, trace, models_used, nebius_base_url, demo_mode } =
    result;

  return (
    <div className="space-y-8 print:space-y-4" id="incident-report">
      <header className="rounded-[1.6rem] border border-[var(--line)] bg-white/80 p-6 shadow-[0_24px_60px_rgba(15,40,45,0.08)] backdrop-blur">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <p className="section-kicker">Response brief</p>
            <h2 className="mt-2 font-display text-3xl tracking-tight text-[var(--ink)] md:text-4xl">
              {report.title}
            </h2>
            <p className="mt-3 text-[var(--muted)]">{report.location}</p>
          </div>
          <div className="flex flex-col items-end gap-3">
            <SeverityBadge severity={report.severity} />
            <p className="text-sm text-[var(--muted)]">
              confidence {(report.severity_confidence * 100).toFixed(0)}%
            </p>
            <div className="flex gap-2 print:hidden">
              <Button
                variant="outline"
                onClick={() => downloadMarkdown(report)}
                className="gap-2"
              >
                <Download className="size-4" />
                Markdown
              </Button>
              <Button onClick={printReport} className="gap-2">
                <Printer className="size-4" />
                Print / PDF
              </Button>
            </div>
          </div>
        </div>

        {report.emergency_notice ? (
          <div className="mt-5 rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-950">
            {report.emergency_notice}
          </div>
        ) : null}
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-[1.4rem] border border-[var(--line)] bg-white/75 p-5">
          <p className="section-kicker">Observed facts</p>
          <ul className="mt-3 space-y-2 text-sm leading-relaxed text-[var(--ink)]">
            {report.observed_facts.map((item) => (
              <li key={item}>• {item}</li>
            ))}
          </ul>
          <p className="mt-4 text-sm text-[var(--muted)]">{visual.summary}</p>
        </section>

        <section className="rounded-[1.4rem] border border-[var(--line)] bg-white/75 p-5">
          <p className="section-kicker">Inferences & unknowns</p>
          <ul className="mt-3 space-y-2 text-sm leading-relaxed text-[var(--ink)]">
            {report.inferences.map((item) => (
              <li key={item}>• {item}</li>
            ))}
          </ul>
          <ul className="mt-4 space-y-2 text-sm text-amber-900">
            {report.unknowns.map((item) => (
              <li key={item}>? {item}</li>
            ))}
          </ul>
        </section>
      </div>

      <section className="rounded-[1.4rem] border border-[var(--line)] bg-white/75 p-5">
        <p className="section-kicker">Immediate actions</p>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-relaxed">
          {report.immediate_actions.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ol>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {report.checklist.map((item) => (
            <div
              key={`${item.priority}-${item.action}`}
              className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-800">
                {item.priority} · {item.owner_hint}
              </p>
              <p className="mt-2 text-sm font-medium text-[var(--ink)]">
                {item.action}
              </p>
              <p className="mt-2 text-xs text-[var(--muted)]">{item.rationale}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-[1.4rem] border border-[var(--line)] bg-white/75 p-5">
        <p className="section-kicker">Live context via Tavily</p>
        <p className="mt-2 text-sm text-[var(--muted)]">
          {report.live_context_summary}
        </p>
        <p className="mt-3 text-xs uppercase tracking-[0.14em] text-[var(--muted)]">
          Planned queries · {assessment.search_queries.join(" | ") || "n/a"}
        </p>
        <div className="mt-4">
          <SourceList sources={report.sources} />
        </div>
      </section>

      <section className="rounded-[1.4rem] border border-amber-200 bg-amber-50/80 p-5">
        <p className="section-kicker">Human verification</p>
        <ul className="mt-3 space-y-2 text-sm text-amber-950">
          {report.human_verification_required.map((item) => (
            <li key={item}>• {item}</li>
          ))}
        </ul>
      </section>

      <div className="print:hidden">
        <ExecutionTrace
          steps={trace}
          models={models_used}
          baseUrl={nebius_base_url}
          demoMode={demo_mode}
        />
      </div>
    </div>
  );
}
