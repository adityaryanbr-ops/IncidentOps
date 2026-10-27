"use client";

import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { SAMPLE_INCIDENTS } from "@/lib/samples";
import type { PipelineResult, SampleIncident } from "@/lib/types";
import { analyzeIncident } from "@/lib/api";
import { LoaderCircle, Sparkles, Upload } from "lucide-react";

const STAGES = [
  "Validating evidence",
  "Nemotron Super VL visual extract",
  "Nemotron Nano severity plan",
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
  const [transcript, setTranscript] = useState("");
  const [latitude, setLatitude] = useState(
    SAMPLE_INCIDENTS[0].latitude?.toString() || "",
  );
  const [longitude, setLongitude] = useState(
    SAMPLE_INCIDENTS[0].longitude?.toString() || "",
  );
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>(SAMPLE_INCIDENTS[0].imagePath);
  const [error, setError] = useState<string | null>(null);
  const [stageIndex, setStageIndex] = useState(0);

  const progress = useMemo(
    () => Math.min(100, ((stageIndex + 1) / STAGES.length) * 100),
    [stageIndex],
  );

  useEffect(() => {
    void applySample(SAMPLE_INCIDENTS[0]);
  }, []);

  async function applySample(sample: SampleIncident) {
    setReportText(sample.reportText);
    setLocation(sample.location);
    setLatitude(sample.latitude?.toString() || "");
    setLongitude(sample.longitude?.toString() || "");
    setPreview(sample.imagePath);
    const res = await fetch(sample.imagePath);
    const blob = await res.blob();
    setFile(new File([blob], `${sample.id}.png`, { type: blob.type || "image/png" }));
  }

  async function runAnalysis() {
    setError(null);

    if (!reportText.trim() || !location.trim()) {
      setError("Location and field report are required.");
      return;
    }

    let imageFile = file;
    if (!imageFile) {
      const res = await fetch(preview);
      const blob = await res.blob();
      imageFile = new File([blob], "sample.png", { type: blob.type || "image/png" });
    }

    const form = new FormData();
    form.append("image", imageFile);
    form.append("report_text", reportText);
    form.append("location", location);
    if (transcript.trim()) form.append("transcript", transcript.trim());
    if (latitude.trim()) form.append("latitude", latitude.trim());
    if (longitude.trim()) form.append("longitude", longitude.trim());

    setBusy(true);
    setStageIndex(0);
    const timer = window.setInterval(() => {
      setStageIndex((current) => Math.min(current + 1, STAGES.length - 1));
    }, 900);

    try {
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
      className="space-y-5"
    >
      <div className="flex flex-wrap gap-2">
        {SAMPLE_INCIDENTS.map((sample) => (
          <button
            key={sample.id}
            type="button"
            onClick={() => applySample(sample)}
            className="rounded-full border border-[var(--line)] bg-white/70 px-3 py-1.5 text-xs font-medium text-[var(--ink)] transition hover:border-teal-700 hover:text-teal-900"
          >
            Sample · {sample.title}
          </button>
        ))}
      </div>

      <div className="grid gap-5 md:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              required
              placeholder="Campus North Gate, Austin, TX"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="report">Field report</Label>
            <Textarea
              id="report"
              value={reportText}
              onChange={(e) => setReportText(e.target.value)}
              required
              rows={6}
              placeholder="What happened, what you see, who is affected..."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="transcript">Voice transcript (optional)</Label>
            <Textarea
              id="transcript"
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              rows={3}
              placeholder="Paste a voice-note transcript if you have one"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="lat">Latitude</Label>
              <Input
                id="lat"
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                placeholder="30.2861"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lng">Longitude</Label>
              <Input
                id="lng"
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                placeholder="-97.7394"
              />
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <Label htmlFor="image">Evidence photo</Label>
          <label
            htmlFor="image"
            className="flex min-h-64 cursor-pointer flex-col overflow-hidden rounded-[1.4rem] border border-dashed border-teal-700/40 bg-[linear-gradient(160deg,#12343b_0%,#1f5b63_48%,#d8ece8_100%)]"
          >
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={preview}
                alt="Incident evidence preview"
                className="h-64 w-full object-cover"
              />
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-teal-50">
                <Upload className="size-6" />
                <span className="text-sm">Drop or choose a JPEG/PNG</span>
              </div>
            )}
          </label>
          <Input
            id="image"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="bg-white/80"
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
        <div className="space-y-2 rounded-2xl border border-[var(--line)] bg-white/80 p-4">
          <div className="flex items-center gap-2 text-sm text-teal-900">
            <LoaderCircle className="size-4 animate-spin" />
            {STAGES[stageIndex]}
          </div>
          <Progress value={progress} />
        </div>
      ) : null}

      {error ? (
        <div className="rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-950">
          {error}
        </div>
      ) : null}

      <button
        type="button"
        disabled={busy}
        onClick={() => void runAnalysis()}
        className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-primary px-6 text-sm font-medium text-primary-foreground transition hover:bg-primary/85 disabled:pointer-events-none disabled:opacity-50"
      >
        {busy ? (
          <LoaderCircle className="size-4 animate-spin" />
        ) : (
          <Sparkles className="size-4" />
        )}
        Analyze incident
      </button>
    </form>
  );
}
