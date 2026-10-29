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
          <h3 className="font-display text-2xl tracking-tight text-[var(--ink)]">
            Nebius + Tavily trace
          </h3>
        </div>
        {demoMode ? (
          <span className="rounded-md border border-[var(--line)] bg-[var(--accent)] px-3 py-1 text-base font-medium text-[var(--signal)]">
            Demo mode : add API keys for live Nebius/Tavily calls
          </span>
        ) : (
          <span className="rounded-md border border-[var(--line)] bg-[var(--accent)] px-3 py-1 text-base font-medium text-[var(--ink)]">
            Live Nebius Token Factory
          </span>
        )}
      </div>

      <div className="rounded-xl border border-[var(--line)] bg-[var(--card)] p-4 backdrop-blur">
        <p className="text-lg text-[var(--muted)]">
          Base URL: <code className="text-[var(--ink)]">{baseUrl}</code>
        </p>
        <p className="mt-1 text-lg text-[var(--muted)]">
          Models: {models.join(" · ")}
        </p>
      </div>

      <ol className="space-y-3">
        {steps.map((step, index) => (
          <li
            key={`${step.step}-${index}`}
            className={cn(
              "trace-row rounded-xl border border-[var(--line)] bg-[var(--card)] p-4",
              `delay-${index}`,
            )}
            style={{ animationDelay: `${index * 90}ms` }}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-medium text-[var(--ink)]">
                {index + 1}. {step.step.replaceAll("_", " ")}
              </p>
              <span className="text-base uppercase tracking-[0.16em] text-[var(--muted)]">
                {step.provider}
                {step.latency_ms != null ? ` · ${step.latency_ms}ms` : ""}
              </span>
            </div>
            <p className="mt-2 text-lg text-[var(--muted)]">{step.detail}</p>
            {step.model ? (
              <p className="mt-2 font-mono text-base text-[var(--signal)]">{step.model}</p>
            ) : null}
          </li>
        ))}
      </ol>
    </section>
  );
}
