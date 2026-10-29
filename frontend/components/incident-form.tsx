"use client";

import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { SAMPLE_INCIDENTS } from "@/lib/samples";
import type { PipelineResult, SampleIncident } from "@/lib/types";
import { VoiceInput } from "@/components/voice-input";
import { getDeviceLocation, locationErrorMessage, parseCoordinates } from "@/lib/location";
import { analyzeIncident, API_BASE } from "@/lib/api";
import { ArrowUpRight, LoaderCircle, LocateFixed, ScanLine, Upload } from "lucide-react";

const STAGES = [
  "Validating evidence",
  "Nemotron Super VL visual extract",
  "Nemotron Lightning severity plan",
  "Tavily live context",
  "Drafting response brief",
];

export function IncidentForm({
  onResult,
  busy,
  setBusy,
}: {
  onResult: (result: PipelineResult, previewDataUrl?: string) => void;
  busy: boolean;
  setBusy: (value: boolean) => void;
}) {
  const [reportText, setReportText] = useState(SAMPLE_INCIDENTS[0].reportText);
  const [location, setLocation] = useState(SAMPLE_INCIDENTS[0].location);
  const [locating, setLocating] = useState(false);
  const [locationAccuracy, setLocationAccuracy] = useState<number | null>(null);
  const [transcript, setTranscript] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>(SAMPLE_INCIDENTS[0].imagePath);
  const [error, setError] = useState<string | null>(null);
  const [stageIndex, setStageIndex] = useState(0);
  const [listening, setListening] = useState(false);
  const [resolvedAddress, setResolvedAddress] = useState<string | null>(null);

  const progress = useMemo(
    () => Math.min(100, ((stageIndex + 1) / STAGES.length) * 100),
    [stageIndex],
  );

  useEffect(() => {
    void applySample(SAMPLE_INCIDENTS[0]);
  }, []);

  async function applySample(sample: SampleIncident) {
    setReportText(sample.reportText);
    setTranscript("");
    setLocation(sample.location);
    setResolvedAddress(null);
    setLocationAccuracy(null);
    setPreview(sample.imagePath);
    try {
      const res = await fetch(sample.imagePath);
      if (!res.ok) throw new Error("Sample photo could not load. Choose a photo to continue.");
      const blob = await res.blob();
      setFile(new File([blob], `${sample.id}.png`, { type: blob.type || "image/png" }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sample photo could not load.");
    }
  }

  async function useCurrentLocation() {
    setError(null);
    if (window.isSecureContext === false) {
      setError("Location requires HTTPS or localhost. Open this app securely, or enter an address or coordinates.");
      return;
    }
    if (!navigator.geolocation) {
      setError("Location is unavailable in this browser. Try your regular browser, or enter an address or coordinates.");
      return;
    }
    setLocating(true);
    try {
      const { coords } = await getDeviceLocation(navigator.geolocation);
      parseCoordinates(`${coords.latitude}, ${coords.longitude}`);
      if (!Number.isFinite(coords.latitude) || !Number.isFinite(coords.longitude)) throw new Error("Invalid device coordinates");
      setLocation(`${coords.latitude.toFixed(6)}, ${coords.longitude.toFixed(6)}`);
      setResolvedAddress(null);
      setLocationAccuracy(Math.round(coords.accuracy));
    } catch (err) {
      setError(locationErrorMessage(err as GeolocationPositionError));
    } finally {
      setLocating(false);
    }
  }

  async function lookupAddress() {
    const params = new URLSearchParams({ q: location.trim(), limit: "1" });
    const response = await fetch(`${API_BASE}/api/incidents/location?${params}`);
    if (!response.ok) throw new Error("Location lookup is unavailable. Use your current location or paste coordinates instead.");
    const data = await response.json();
    const match = data.features?.[0];
    const coordinates = match?.geometry?.coordinates;
    if (!Array.isArray(coordinates) || coordinates.length < 2 ||
        !Number.isFinite(coordinates[0]) || !Number.isFinite(coordinates[1]) ||
        Math.abs(coordinates[0]) > 180 || Math.abs(coordinates[1]) > 90) {
      throw new Error("Location not found. Add the city and country, use your current location, or paste coordinates.");
    }
    const matchedLocation = [match.properties?.name, match.properties?.city, match.properties?.state, match.properties?.country].filter(Boolean).join(", ");
    if (!matchedLocation || !window.confirm(`Location match: ${matchedLocation}. Use this approximate location?`)) {
      throw new Error("Location not confirmed. Edit the address or use coordinates.");
    }
    return { latitude: coordinates[1] as number, longitude: coordinates[0] as number, name: matchedLocation };
  }

  async function findAddress() {
    setError(null);
    setLocating(true);
    try {
      if (parseCoordinates(location)) return;
      const match = await lookupAddress();
      setLocation(`${match.latitude.toFixed(6)}, ${match.longitude.toFixed(6)}`);
      setResolvedAddress(match.name);
      setLocationAccuracy(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Address lookup failed. Add the city and country and try again.");
    } finally {
      setLocating(false);
    }
  }

  async function runAnalysis() {
    setError(null);
    if (listening || locating) return;
    const description = transcript.trim() || reportText.trim();
    if (!description || !location.trim()) {
      setError("Add a short note and the incident location.");
      return;
    }
    setBusy(true);
    setStageIndex(0);
    const timer = window.setInterval(() => {
      setStageIndex((current) => Math.min(current + 1, STAGES.length - 1));
    }, 900);

    try {
      const directCoordinates = parseCoordinates(location);
      let imageFile = file;
      if (!imageFile) {
        const res = await fetch(preview);
        if (!res.ok) throw new Error("Photo could not load. Choose a photo and try again.");
        const blob = await res.blob();
        imageFile = new File([blob], "sample.png", { type: blob.type || "image/png" });
      }
      const form = new FormData();
      form.append("image", imageFile);
      form.append("report_text", description);
      form.append("location", location.trim());
      if (transcript.trim()) form.append("transcript", transcript.trim());

      if (directCoordinates) {
        form.append("latitude", String(directCoordinates.latitude));
        form.append("longitude", String(directCoordinates.longitude));
        if (resolvedAddress) form.append("resolved_location", resolvedAddress);
      } else {
        const match = await lookupAddress();
        form.append("latitude", String(match.latitude));
        form.append("longitude", String(match.longitude));
        form.append("resolved_location", match.name);
      }
      const result = await analyzeIncident(form);
      setStageIndex(STAGES.length - 1);
      onResult(result, preview.startsWith("data:") ? preview : undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      window.clearInterval(timer);
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void runAnalysis();
      }}
      className="incident-form space-y-5"
    >
      <div className="space-y-2">
        <p className="text-lg font-medium">Choose an example</p>
        <p className="text-base leading-relaxed text-[var(--muted)]">
          Demo locations are in Austin.
        </p>
      <div className="sample-buttons">
        {SAMPLE_INCIDENTS.map((sample) => (
          <button
            key={sample.id}
            aria-pressed={preview === sample.imagePath}
            disabled={busy || locating || listening}
            type="button"
            onClick={() => applySample(sample)}
            className="rounded-full border border-[var(--line)] bg-[var(--card)] px-3 py-1.5 text-base font-medium text-[var(--ink)] transition hover:border-[var(--signal)] hover:text-[var(--signal)]"
          >
            {sample.title}
          </button>
        ))}
      </div>
      </div>

      <div className="intake-fields grid gap-5">
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Label htmlFor="location">Incident location</Label>
              <button type="button" disabled={busy || locating || listening} onClick={useCurrentLocation} className="location-button">
                {locating ? <LoaderCircle size={15} className="animate-spin" /> : <LocateFixed size={15} />}
                {locating ? "Finding location…" : "Use my location"}
              </button>
            </div>
            <Input
              id="location"
              value={location}
              onChange={(e) => { setLocation(e.target.value); setLocationAccuracy(null); setResolvedAddress(null); }}
              disabled={busy || locating || listening}
              required
              aria-describedby="location-help"
              placeholder="Address with city, or latitude, longitude"
            />
            <button type="button" className="location-button" disabled={busy || locating || listening || location.trim().length < 3} onClick={() => void findAddress()}>Find address</button>
            <p id="location-help" className="text-base leading-relaxed text-[var(--muted)]">
              At the scene? Use your location. Otherwise enter an address with city and country, then select Find address.
            </p>
            {resolvedAddress ? <p role="status" className="text-base text-[var(--muted)]">Address match: {resolvedAddress}. Coordinates are approximate.</p> : null}
            {locationAccuracy !== null ? <p role="status" className="text-base leading-relaxed text-[var(--muted)]">Device location captured. Approximate accuracy: {locationAccuracy} m. Check that this is the incident location.</p> : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="report">What happened?</Label>
            <Textarea
              id="report"
              value={reportText}
              onChange={(e) => setReportText(e.target.value)}
              required={!transcript.trim()}
              rows={2}
              aria-describedby="report-help"
              placeholder="e.g. A fallen fence is blocking the walkway."
            />
            <p id="report-help" className="text-base leading-relaxed text-[var(--muted)]">
              One sentence is enough. You can also speak below.
            </p>
          </div>
          <VoiceInput value={transcript} onChange={setTranscript} disabled={busy || locating} onListeningChange={setListening} />

        </div>

        <div className="space-y-3">
          <Label htmlFor="image">Evidence photo</Label>
          <label
            htmlFor="image"
            className="flex min-h-64 cursor-pointer flex-col overflow-hidden rounded-xl border border-dashed border-[var(--line)] bg-[var(--panel)]"
          >
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={preview}
                alt="Incident evidence preview"
                className="h-64 w-full object-cover"
              />
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-[var(--ink)]">
                <Upload className="size-6" />
                <span className="text-lg">Drop or choose a JPEG/PNG</span>
              </div>
            )}
          </label>
          <Input
            id="image"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="bg-[var(--card)]"
            onChange={(e) => {
              const next = e.target.files?.[0] || null;
              setFile(next);
              if (next) {
                const reader = new FileReader();
                reader.onload = () => setPreview(String(reader.result));
                reader.readAsDataURL(next);
              }
            }}
          />
        </div>
      </div>

      {busy ? (
        <div className="space-y-2 rounded-xl border border-[var(--line)] bg-[var(--card)] p-4">
          <div role="status" className="flex items-center gap-2 text-lg text-[var(--signal)]">
            <LoaderCircle className="size-4 animate-spin" />
            {STAGES[stageIndex]}<span className="text-base text-[var(--muted)]">Estimated stage</span>
          </div>
          <Progress value={progress} />
        </div>
      ) : null}

      {error ? (
        <div role="alert" className="rounded-xl border border-[var(--destructive)] bg-[var(--card)] px-4 py-3 text-lg text-[var(--destructive)]">
          {error}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={busy || locating || listening}
        className="action-button analyze-button"
      >
        {busy ? (
          <LoaderCircle className="size-4 animate-spin" />
        ) : (
          <ScanLine className="size-4" />
        )}
        Analyze incident <ArrowUpRight className="ml-auto size-5" />
      </button>
    </form>
  );
}
