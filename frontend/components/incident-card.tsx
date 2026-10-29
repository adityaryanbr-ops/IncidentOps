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
      aria-pressed={!!active}
      onClick={onSelect}
      className={`incident-row w-full p-4 text-left transition-colors duration-200 ${
        active
          ? "border-[var(--signal)] bg-[var(--accent)] text-[var(--ink)] "
          : "border-[var(--line)] bg-[var(--card)] text-[var(--ink)] hover:border-[var(--signal)]"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className={`text-base tracking-normal ${active ? "text-[var(--signal)]" : "text-[var(--muted)]"}`}>
            {new Date(incident.savedAt).toLocaleString()}
          </p>
          <h3 className="mt-2 font-display text-xl leading-tight">
            {incident.report.title}
          </h3>
        </div>
        <SeverityBadge severity={incident.report.severity} />
      </div>
      <p className={`mt-3 line-clamp-2 text-lg ${active ? "text-[var(--signal)]" : "text-[var(--muted)]"}`}>
        {incident.report.location}
      </p>
    </button>
  );
}
