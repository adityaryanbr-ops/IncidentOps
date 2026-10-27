import type { TraceStep } from "@/lib/types";
import { cn } from "@/lib/utils";

export function ExecutionTrace({
  steps,
  models,
  baseUrl,
  demoMode,
}: {
  steps: TraceStep[];
  models: string[];
  baseUrl: string;
  demoMode: boolean;
}) {
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="section-kicker">Runtime proof</p>
          <h3 className="font-display text-2xl tracking-tight text-[var(--ink)]">
            Nebius + Tavily trace
          </h3>
        </div>
        {demoMode ? (
          <span className="rounded-md border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-950">
            Demo mode — add API keys for live Nebius/Tavily calls
          </span>
        ) : (
          <span className="rounded-md border border-teal-300 bg-teal-50 px-3 py-1 text-xs font-medium text-teal-950">
            Live Nebius Token Factory
          </span>
        )}
      </div>

      <div className="rounded-2xl border border-[var(--line)] bg-white/70 p-4 backdrop-blur">
        <p className="text-sm text-[var(--muted)]">
          Base URL: <code className="text-[var(--ink)]">{baseUrl}</code>
        </p>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Models: {models.join(" · ")}
        </p>
      </div>

      <ol className="space-y-3">
        {steps.map((step, index) => (
          <li
            key={`${step.step}-${index}`}
            className={cn(
              "trace-row rounded-2xl border border-[var(--line)] bg-white/80 p-4",
              `delay-${index}`,
            )}
            style={{ animationDelay: `${index * 90}ms` }}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-medium text-[var(--ink)]">
                {index + 1}. {step.step.replaceAll("_", " ")}
              </p>
              <span className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
                {step.provider}
                {step.latency_ms != null ? ` · ${step.latency_ms}ms` : ""}
              </span>
            </div>
            <p className="mt-2 text-sm text-[var(--muted)]">{step.detail}</p>
            {step.model ? (
              <p className="mt-2 font-mono text-xs text-teal-800">{step.model}</p>
            ) : null}
          </li>
        ))}
      </ol>
    </section>
  );
}
