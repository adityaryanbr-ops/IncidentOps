import type { SavedIncident } from "./types";

const KEY = "incidentops.saved.v1";

export function loadIncidents(): SavedIncident[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedIncident[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveIncident(incident: SavedIncident): SavedIncident[] {
  const existing = loadIncidents().filter((item) => item.id !== incident.id);
  const next = [incident, ...existing].slice(0, 24);
  window.localStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

export function removeIncident(id: string): SavedIncident[] {
  const next = loadIncidents().filter((item) => item.id !== id);
  window.localStorage.setItem(KEY, JSON.stringify(next));
  return next;
}
