"use client";

import { useEffect, useState } from "react";
import { getOfficialHelplines } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { ExecutionTrace } from "@/components/execution-trace";
import { SourceList } from "@/components/source-list";
import { downloadMarkdown, printReport } from "@/lib/export";
import type { PipelineResult, Severity, OfficialHelplineResult } from "@/lib/types";
import { Download, Printer, MapPin, ShieldCheck, TriangleAlert, Phone, Eye, ListChecks, CircleHelp, ArrowUpRight } from "lucide-react";

const SEVERITY: Record<Severity, { label: string; description: string }> = {
  low: { label: "Low priority", description: "Review the scene and arrange follow-up." },
  medium: { label: "Needs attention", description: "Review the risks and next steps before proceeding." },
  high: { label: "High priority", description: "Review the immediate risks promptly. Keep a safe distance." },
  critical: { label: "Urgent review", description: "If anyone is in immediate danger, contact local emergency services." },
};

export function IncidentReportView({ result }: { result: PipelineResult }) {
  const { report: originalReport, visual, assessment, trace, models_used, nebius_base_url, demo_mode } = result;
  const [directory, setDirectory] = useState<{ id: string; value: OfficialHelplineResult } | null>(null);
  const [lookup, setLookup] = useState<{ id: string; state: "loading" | "failed" | "idle" } | null>(null);
  const [attempt, setAttempt] = useState(0);
  const hasContacts = Boolean(originalReport.helplines?.length);

  useEffect(() => {
    if (hasContacts) return;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    let disposed = false;
    setLookup({ id: result.id, state: "loading" });
    getOfficialHelplines(originalReport.location, `${originalReport.category} ${originalReport.title}`, controller.signal)
      .then(value => {
        if (disposed) return;
        setDirectory({ id: result.id, value });
        setLookup({ id: result.id, state: "idle" });
      })
      .catch(() => { if (!disposed) setLookup({ id: result.id, state: "failed" }); })
      .finally(() => clearTimeout(timer));
    return () => { disposed = true; clearTimeout(timer); controller.abort(); };
  }, [result.id, originalReport.location, originalReport.category, originalReport.title, hasContacts, attempt]);

  const update = directory && directory.id === result.id ? directory.value : null;
  const report = update?.helplines.length ? {
    ...originalReport,
    helplines: update.helplines,
    helpline_status: update.helpline_status,
    helpline_lookup_state: update.helpline_lookup_state,
    markdown_report: (originalReport.markdown_report || "").replace(/\n\n## Helplines\n[\s\S]*$/, "") + update.markdown_section,
  } : originalReport;
  const lookupState = lookup && lookup.id === result.id ? lookup.state : "idle";
  const severity = SEVERITY[report.severity];

  return (
    <article className="response-brief" id="incident-report" data-severity={report.severity}>
      <header className="brief-heading">
        <div><p className="brief-eyebrow">Your incident brief{demo_mode ? " · Demo" : ""}</p><h2>{report.title}</h2><p className="brief-location"><MapPin size={19} aria-hidden="true" />{report.location}</p></div>
        <div className="brief-export print:hidden">
          <Button variant="outline" disabled={lookupState === "loading"} onClick={() => downloadMarkdown(report)}><Download size={18} aria-hidden="true" /> Save report</Button>
          <Button variant="outline" disabled={lookupState === "loading"} onClick={printReport}><Printer size={18} aria-hidden="true" /> Print / PDF</Button>
        </div>
      </header>

      <div className="brief-severity">
        <TriangleAlert size={28} aria-hidden="true" />
        <div><strong>{severity.label}</strong><p>{report.emergency_notice || severity.description}</p></div>
        <span className="brief-rating">Advisory severity: {report.severity}</span>
      </div>
      <p className="brief-advisory">Check the scene and confirm the advice before acting. IncidentOps does not dispatch help.</p>

      <nav className="brief-jump print:hidden" aria-label="Report sections"><a href="#report-actions">Next steps</a><a href="#report-contacts">Helplines</a><a href="#report-evidence">Evidence & sources</a></nav>

      <div className="brief-main">
        <section id="report-actions" className="brief-actions" aria-labelledby="actions-title">
          <div className="brief-section-heading"><ShieldCheck size={24} aria-hidden="true" /><h3 id="actions-title">Do this first</h3></div>
          {report.immediate_actions.length ? <ol className="action-steps">{report.immediate_actions.map((action, index) => <li key={`${index}-${action}`}><span className="action-step-number" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span><p>{action}</p></li>)}</ol> : <p className="brief-muted">No immediate actions were provided. Confirm the situation with a qualified responder.</p>}
          {report.checklist.length ? <details className="brief-disclosure"><summary><ListChecks size={20} aria-hidden="true" />Full handoff checklist</summary><ol className="handoff-list">{report.checklist.map((item, index) => <li key={`${item.priority}-${index}`} data-priority={item.priority}><span className="handoff-priority">{item.priority}</span><div><strong>{item.action}</strong><p>{item.owner_hint} · {item.rationale}</p></div></li>)}</ol></details> : null}
        </section>

        <aside id="report-contacts" className="brief-contacts" aria-labelledby="helplines-title">
          <div className="brief-section-heading"><Phone size={24} aria-hidden="true" /><h3 id="helplines-title">Get the right help</h3></div>
          {(report.helplines || []).length ? <p className="brief-muted">Check who the service covers before calling.</p> : null}
          <div className="contact-directory">{(report.helplines || []).map(contact => <div key={`${contact.phone}-${contact.service}`} className="contact-entry"><h4>{contact.service}</h4><p className="contact-provenance">{contact.source_kind === "official_directory" ? "Official emergency directory" : "Source-backed live lookup"}</p><a href={`tel:${contact.phone.replace(/[^+0-9]/g, "")}`} className="contact-number">{contact.phone}<ArrowUpRight size={22} aria-hidden="true" /></a><p>{contact.purpose}</p><p className="contact-area">Serving: {contact.jurisdiction}</p>{contact.last_reviewed ? <p className="contact-reviewed">Reference checked: {contact.last_reviewed}. Availability is not monitored.</p> : null}<a href={contact.source_url} target="_blank" rel="noreferrer" className="contact-source">Check source <ArrowUpRight size={16} aria-hidden="true" /></a></div>)}</div>
          {!hasContacts ? <div className="contact-recovery print:hidden">
            {lookupState === "loading" ? <p role="status">Checking official emergency numbers…</p> : <button type="button" className="location-button" onClick={() => setAttempt(value => value + 1)}>Check official numbers again</button>}
            {lookupState === "failed" ? <p role="alert">The contact lookup could not connect. Try again; this does not mean emergency services are unavailable.</p> : null}
          </div> : null}
          {update && !update.helplines.length ? <p className="contact-status">{update.helpline_status}</p> : null}
          <p className="contact-status">{report.helpline_status || "This saved report has no sourced helpline directory. Analyze the incident again to look up contacts for its location."}</p>
        </aside>
      </div>

      <section id="report-evidence" className="brief-evidence" aria-labelledby="evidence-title">
        <div className="brief-section-heading"><Eye size={24} aria-hidden="true" /><h3 id="evidence-title">What we know</h3></div>
        {report.observed_facts.length ? <ul className="evidence-facts">{report.observed_facts.map((fact, index) => <li key={`${index}-${fact}`}>{fact}</li>)}</ul> : <p>{visual.summary}</p>}
        {report.unknowns.length ? <div className="brief-unknowns"><h4><CircleHelp size={20} aria-hidden="true" />Still unconfirmed</h4><ul>{report.unknowns.map((unknown, index) => <li key={`${index}-${unknown}`}>{unknown}</li>)}</ul></div> : null}
        {report.inferences.length ? <details className="brief-disclosure"><summary>Possible explanations</summary><p className="brief-muted">These are inferences, not confirmed facts.</p><ul className="evidence-facts">{report.inferences.map((inference, index) => <li key={`${index}-${inference}`}>{inference}</li>)}</ul></details> : null}
        {report.human_verification_required.length ? <div className="brief-verification"><ShieldCheck size={23} aria-hidden="true" /><div><h4>Before you act</h4><ul>{report.human_verification_required.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}</ul></div></div> : null}
      </section>

      <details className="brief-disclosure brief-sources"><summary>Supporting sources & context <span>{report.sources.length} sources</span></summary><p className="brief-muted">{report.live_context_summary}</p><SourceList sources={report.sources} /></details>
      <details className="brief-disclosure print:hidden"><summary>How this report was built</summary><p className="brief-muted">AI confidence: {(report.severity_confidence * 100).toFixed(0)}%. This is a model estimate, not a confirmed risk measurement.</p><p className="brief-muted">{assessment?.rationale}</p><ExecutionTrace steps={trace} models={models_used} baseUrl={nebius_base_url} demoMode={demo_mode} /></details>
    </article>
  );
}
