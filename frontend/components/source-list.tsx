import type { ContextSource } from "@/lib/types";

export function SourceList({ sources }: { sources: ContextSource[] }) {
  if (!sources.length) {
    return (
      <p className="text-sm text-[var(--muted)]">No live sources returned.</p>
    );
  }

  return (
    <ul className="space-y-3">
      {sources.map((source) => (
        <li
          key={`${source.url}-${source.title}`}
          className="rounded-2xl border border-[var(--line)] bg-white/75 p-4"
        >
          <a
            href={source.url}
            target="_blank"
            rel="noreferrer"
            className="font-medium text-teal-900 underline-offset-4 hover:underline"
          >
            {source.title}
          </a>
          <p className="mt-1 text-xs uppercase tracking-[0.14em] text-[var(--muted)]">
            query · {source.query}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-[var(--ink)]/80">
            {source.snippet}
          </p>
        </li>
      ))}
    </ul>
  );
}
