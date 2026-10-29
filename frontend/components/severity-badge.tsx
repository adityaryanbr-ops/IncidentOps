import { Badge } from "@/components/ui/badge";
import type { Severity } from "@/lib/types";
import { cn } from "@/lib/utils";

const STYLES: Record<Severity, string> = {
  low: "bg-teal-100 text-teal-900 border-teal-300",
  medium: "bg-amber-100 text-amber-950 border-amber-300",
  high: "bg-orange-200 text-orange-950 border-orange-400",
  critical: "bg-rose-600 text-white border-rose-700",
};

export function SeverityBadge({
  severity,
  className,
}: {
  severity: Severity;
  className?: string;
}) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "rounded-md px-2.5 py-0.5 text-base font-semibold tracking-wide",
        STYLES[severity],
        className,
      )}
    >
      {severity}
    </Badge>
  );
}
