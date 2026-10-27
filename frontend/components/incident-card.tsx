"use client";

import { SeverityBadge } from "@/components/severity-badge";
import type { SavedIncident } from "@/lib/types";

export function IncidentCard({
  incident,
  active,
  onSelect,
}: {
  incident: SavedIncident;
  active?: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full rounded-2xl border p-4 text-left transition duration-300 ${
        active
          ? "border-teal-700 bg-teal-950 text-teal-50 shadow-[0_18px_40px_rgba(8,47,47,0.28)]"
          : "border-[var(--line)] bg-white/75 text-[var(--ink)] hover:-translate-y-0.5 hover:border-teal-600/40"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className={`text-xs uppercase tracking-[0.16em] ${active ? "text-teal-200" : "text-[var(--muted)]"}`}>
            {new Date(incident.savedAt).toLocaleString()}
          </p>
          <h3 className="mt-2 font-display text-xl leading-tight">
            {incident.report.title}
          </h3>
        </div>
        <SeverityBadge severity={incident.report.severity} />
      </div>
      <p className={`mt-3 line-clamp-2 text-sm ${active ? "text-teal-100/90" : "text-[var(--muted)]"}`}>
        {incident.report.location}
      </p>
    </button>
  );
}
