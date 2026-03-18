import type { TraceNode } from "../types.ts";

const STATUS_CONFIG: Record<
  TraceNode["status"],
  { label: string; dotClass: string; textClass: string; bgClass: string }
> = {
  running: {
    label: "Running",
    dotClass: "bg-blue-500 animate-pulse",
    textClass: "text-blue-700",
    bgClass: "bg-blue-50",
  },
  done: {
    label: "Complete",
    dotClass: "bg-emerald-500",
    textClass: "text-emerald-700",
    bgClass: "bg-emerald-50",
  },
  error: {
    label: "Error",
    dotClass: "bg-red-500",
    textClass: "text-red-700",
    bgClass: "bg-red-50",
  },
};

interface StatusBadgeProps {
  status: TraceNode["status"];
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${config.bgClass} ${config.textClass}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${config.dotClass}`} />
      {config.label}
    </span>
  );
}
