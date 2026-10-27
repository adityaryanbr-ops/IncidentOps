import type { IncidentReport } from "./types";

export function downloadMarkdown(report: IncidentReport) {
  const blob = new Blob([report.markdown_report], {
    type: "text/markdown;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${slugify(report.title)}.md`;
  a.click();
  URL.revokeObjectURL(url);
}

export function printReport() {
  window.print();
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 64);
}
