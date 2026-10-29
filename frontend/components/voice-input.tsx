"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, Square } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { API_BASE } from "@/lib/api";

export function VoiceInput({ value, onChange, disabled, onListeningChange }: {
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
  onListeningChange: (value: boolean) => void;
}) {
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const request = useRef<AbortController | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mounted = useRef(true);
  const [phase, setPhase] = useState<"idle" | "starting" | "recording" | "transcribing">("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (timer.current) clearTimeout(timer.current);
      if (recorder.current) {
        recorder.current.onstop = null;
        recorder.current.onerror = null;
        if (recorder.current.state === "recording") recorder.current.stop();
      }
      stream.current?.getTracks().forEach(track => track.stop());
      request.current?.abort();
    };
  }, []);

  function releaseMicrophone() {
    if (timer.current) clearTimeout(timer.current);
    stream.current?.getTracks().forEach(track => track.stop());
    stream.current = null;
    recorder.current = null;
  }

  async function toggleRecording() {
    if (recorder.current?.state === "recording") {
      recorder.current.stop();
      return;
    }
    setError(null);
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError("Microphone recording is unavailable here. Use keyboard dictation in the transcript field, or type your report.");
      return;
    }
    setPhase("starting");
    onListeningChange(true);
    try {
      const microphone = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!mounted.current) { microphone.getTracks().forEach(track => track.stop()); return; }
      stream.current = microphone;
      const mimeType = ["audio/webm;codecs=opus", "audio/mp4", "audio/ogg;codecs=opus"].find(type => MediaRecorder.isTypeSupported(type));
      const session = new MediaRecorder(microphone, mimeType ? { mimeType } : undefined);
      recorder.current = session;
      const chunks: Blob[] = [];
      let failed = false;
      session.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
      session.onerror = () => {
        failed = true;
        releaseMicrophone();
        if (mounted.current) {
          setError("Recording failed. Check your microphone and try again.");
          setPhase("idle");
          onListeningChange(false);
        }
      };
      session.onstop = async () => {
        releaseMicrophone();
        if (!mounted.current || failed) return;
        setPhase("transcribing");
        const controller = new AbortController();
        request.current = controller;
        const timeout = setTimeout(() => controller.abort(), 120000);
        try {
          const audio = new Blob(chunks, { type: session.mimeType || "audio/webm" });
          if (!audio.size) throw new Error("The recording is empty. Try speaking again.");
          const form = new FormData();
          const type = audio.type.split(";")[0];
          form.append("audio", new Blob([audio], {type}), "report." + (type.includes("mp4") ? "mp4" : type.includes("ogg") ? "ogg" : "webm"));
          const response = await fetch(`${API_BASE}/api/incidents/transcribe`, { method: "POST", body: form, signal: controller.signal });
          const data = await response.json();
          if (!response.ok) throw new Error(typeof data.detail === "string" ? data.detail : "Transcription failed. Please try again.");
          if (typeof data.text !== "string" || !data.text.trim()) throw new Error("No speech detected. Please try again.");
          if (mounted.current) onChange([value.trim(), data.text.trim()].filter(Boolean).join(" "));
        } catch (err) {
          if (mounted.current) setError(err instanceof Error && err.name !== "AbortError" ? err.message : "Transcription timed out. Please try again.");
        } finally {
          clearTimeout(timeout);
          request.current = null;
          if (mounted.current) { setPhase("idle"); onListeningChange(false); }
        }
      };
      session.start();
      setPhase("recording");
      timer.current = setTimeout(() => { if (session.state === "recording") session.stop(); }, 59000);
    } catch (err) {
      releaseMicrophone();
      if (!mounted.current) return;
      setPhase("idle");
      onListeningChange(false);
      setError(err instanceof Error && err.name === "NotAllowedError"
        ? "Microphone access is blocked. Allow microphone access for this site and browser, or use keyboard dictation below."
        : "Could not open your microphone. Check that a microphone is connected and available.");
    }
  }

  const active = phase !== "idle";
  return (
    <div className="voice-input space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Label htmlFor="transcript">Or speak your report</Label>
        <button type="button" className="location-button" disabled={disabled || phase === "starting" || phase === "transcribing"} onClick={() => void toggleRecording()} aria-pressed={phase === "recording"}>
          {phase === "recording" ? <Square size={14} aria-hidden="true" /> : <Mic size={16} aria-hidden="true" />}
          {phase === "recording" ? "Stop recording" : phase === "starting" ? "Opening microphone…" : phase === "transcribing" ? "Transcribing…" : "Speak report"}
        </button>
      </div>
      <p className="text-base leading-relaxed text-[var(--muted)]">Speak for up to a minute. Audio is transcribed on this app’s server and isn’t saved.</p>
      {active ? <p role="status" className="text-lg text-[var(--signal)]">{phase === "recording" ? "Recording… Stop when you’re done to see your transcript." : phase === "transcribing" ? "Turning your recording into text…" : "Allow microphone access when prompted."}</p> : null}
      <Textarea id="transcript" value={value} onChange={event => onChange(event.target.value)} disabled={disabled || active} rows={2} placeholder="Your spoken words appear here. Keyboard dictation works here too." aria-describedby="voice-help" />
      <p id="voice-help" className="text-base text-[var(--muted)]">Review your transcript. If filled, it is used as your report.</p>
      {error ? <p role="alert" className="text-lg text-[var(--destructive)]">{error}</p> : null}
    </div>
  );
}
