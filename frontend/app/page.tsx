"use client";

import { useEffect, useState } from "react";
import { IncidentCard } from "@/components/incident-card";
import { IncidentForm } from "@/components/incident-form";
import { IncidentReportView } from "@/components/incident-report";
import { getHealth } from "@/lib/api";
import { loadIncidents, saveIncident } from "@/lib/storage";
import type { PipelineResult, SavedIncident } from "@/lib/types";
import Image from "next/image";
import { IncidentCategories } from "@/components/incident-categories";
import type { IncidentCategory } from "@/lib/incident-categories";
import { ScrollReveal } from "@/components/scroll-reveal";
import { ArrowRight, ArrowUpRight, Activity, Aperture, Layers3, ScanLine, ShieldAlert, Sun, Moon } from "lucide-react";

export default function HomePage() {
  const [lightTheme, setLightTheme] = useState(false);
  const [incidentCategory, setIncidentCategory] = useState<IncidentCategory | null>(null);
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
    if (performance.getEntriesByType("navigation")[0] instanceof PerformanceNavigationTiming &&
        (performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming).type === "reload") {
      history.scrollRestoration = "manual";
      if (location.hash) history.replaceState(history.state, "", location.pathname + location.search);
      window.scrollTo({ top: 0, behavior: "instant" });
    }
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

  const status = healthError ? "API offline" : !health ? "Connecting" : health.demo_mode || !health.nebius_configured || !health.tavily_configured ? "Demo environment" : "Live environment";

  return (
    <div className="site" data-theme={lightTheme ? "light" : "dark"}>
      <a href="#workspace" className="skip-link">Skip to workspace</a>
      <nav className="topbar page-width" aria-label="Main navigation">
        <a href="#" className="brand"><Aperture aria-hidden="true" /><span>Incident<span className="brand-ops">Ops</span></span></a>
        <div className="nav-links"><a href="#approach">The approach</a><a href="#workspace">Workspace</a><a href="#trace-anchor">Response brief <ArrowUpRight size={14} /></a></div>
        <button className="theme-button" type="button" aria-label={lightTheme ? "Use dark theme" : "Use light theme"} onClick={() => setLightTheme(!lightTheme)}>{lightTheme ? <Moon size={18} /> : <Sun size={18} />}</button>
      </nav>
      <main className="page-width">
        <header className="opening">
          <div className="hero-atmosphere" aria-hidden="true"><Image src="/city-hero.png" alt="" fill priority sizes="100vw" className="hero-image" /></div>
          <div className="opening-copy">
            <div className="wordmark-mask"><h1 className="hero-title">IncidentOps<span className="wordmark-star" aria-hidden="true">*</span></h1></div>
            <div className="hero-summary"><p className="hero-description">A field photo. A clearer picture. Turn incident evidence into a response brief, grounded in what you can actually see.</p>
            <a href="#workspace" className="action-button">Open workspace <span className="button-orb"><ArrowRight size={20} /></span></a></div>
          </div>
        </header>
        <ScrollReveal>
          <section id="approach" className="approach-section">
            <h2>When the scene is uncertain,<br className="desktop-break" /> your next move shouldn’t be.</h2>
            <div className="approach-detail"><p>Start with the evidence. IncidentOps brings visual observations, severity assessment, and live context together in one response brief.</p><p>Built to inform the people on the ground.<br />Human judgment always comes first.</p></div>
          </section>
        </ScrollReveal>
        <IncidentCategories onChoose={setIncidentCategory} />
        <div className="runtime-strip">
          <div className="runtime-status"><Activity size={17} /><span>{status}</span></div>
          <details className="runtime-details"><summary>Connection details</summary><div><p>Address lookup: Photon / OpenStreetMap contributors.</p><p>{health?.vision_model || "nvidia/Nemotron-3.5-Super-VL"}</p><p>{health?.text_model || "nvidia/Nemotron-3_5-Lightning"}</p><p>{healthError || "Live analysis requires configured Nebius and Tavily API keys."}</p></div></details>
        </div>
        <ScrollReveal>
          <section id="workspace" className="workspace-section">
            <div className="workspace-heading"><h2>Report an incident</h2><p>Add a photo, a location and a short description.</p></div>
            <div className="workspace-grid">
              <section className="intake-panel">
                <div className="panel-heading"><ScanLine size={22} /><h3>Report details</h3></div>
                {incidentCategory ? <p className="intake-category">Reporting: <strong>{incidentCategory.title}</strong><a href="#incident-types">Change category <ArrowUpRight size={13} /></a></p> : null}
                <IncidentForm onResult={handleResult} busy={busy} setBusy={setBusy} />
                <div className="advisory"><ShieldAlert size={18} /><div><strong>Advisory only</strong><p>Review the advice before acting. IncidentOps does not dispatch emergency services.</p></div></div>
              </section>
              <section className="board-panel">
                <div className="panel-heading"><Layers3 size={22} /><h3>Recent incidents</h3><span className="saved-count">{incidents.length} saved locally</span></div>
                {incidents.length === 0 ? (
                  <div className="empty-board"><div className="empty-icon"><Layers3 size={30} strokeWidth={1.3} /></div><h4>A clearer picture starts<br />with one report.</h4><p>Your analyzed incidents will appear here.</p><a href="#report">Start with a field report <ArrowUpRight size={16} /></a></div>
                ) : <div className="incident-list">{incidents.map((incident) => <IncidentCard key={incident.id} incident={incident} active={active?.id === incident.id} onSelect={() => setActive(incident)} />)}</div>}
                <div className="board-note"><ShieldAlert size={16} /><span>Saved on this device. Review every recommendation.</span></div>
              </section>
            </div>
          </section>
        </ScrollReveal>
        <ScrollReveal>
          <section id="trace-anchor" className="response-section">
            {active ? <IncidentReportView result={active} /> : <div className="response-empty"><div><h2>From evidence to action.</h2><p>Your sourced brief, response checklist, and execution trace will appear here after analysis.</p></div><div className="response-path"><span>Observe</span><ArrowUpRight /><span>Assess</span><ArrowUpRight /><span>Respond</span></div></div>}
          </section>
        </ScrollReveal>
      </main>
      <footer className="page-width footer"><a className="brand" href="#"><Aperture size={20} /><span>IncidentOps</span></a><p>Better evidence. More informed decisions.</p><span>Human judgment comes first.</span></footer>
    </div>
  );
}
