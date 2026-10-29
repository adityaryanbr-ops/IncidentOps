import type { ContextSource } from "@/lib/types";

export function SourceList({ sources }: { sources: ContextSource[] }) {
  if (!sources.length) {
    return (
      <p className="text-lg text-[var(--muted)]">No live sources returned.</p>
    );
  }

  return (
    <ul className="space-y-3">
      {sources.map((source) => (
        <li
          key={`${source.url}-${source.title}`}
          className="source-row border-b border-[var(--line)] py-5"
        >
          <a
            href={source.url}
            target="_blank"
            rel="noreferrer"
            className="font-medium text-[var(--signal)] underline-offset-4 hover:underline"
          >
            {source.title}
          </a>
          <details className="source-excerpt mt-2">
            <summary className="text-[var(--muted)]">Read source excerpt</summary>
            <p className="mt-2 text-lg leading-relaxed text-[var(--ink)]">{source.snippet}</p>
          </details>
        </li>
      ))}
    </ul>
  );
}
