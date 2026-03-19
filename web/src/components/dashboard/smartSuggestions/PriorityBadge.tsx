import type { SmartSuggestionPriority } from "@/data/smartSuggestionsMock";

const PRIORITY_META: Record<
  SmartSuggestionPriority,
  { label: string; base: string; glow: string }
> = {
  high: {
    label: "High",
    base: "bg-rose-50 text-rose-800 ring-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:ring-rose-800/50",
    glow: "shadow-[0_0_0_2px_rgba(244,63,94,0.28)] dark:shadow-[0_0_0_2px_rgba(244,63,94,0.18)]",
  },
  medium: {
    label: "Medium",
    base: "bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-800/50",
    glow: "shadow-[0_0_0_2px_rgba(245,158,11,0.24)] dark:shadow-[0_0_0_2px_rgba(245,158,11,0.14)]",
  },
  low: {
    label: "Low",
    base: "bg-neutral-50 text-neutral-700 ring-neutral-200 dark:bg-slate-900/40 dark:text-neutral-300 dark:ring-slate-600/60",
    glow: "shadow-[0_0_0_2px_rgba(100,116,139,0.20)] dark:shadow-[0_0_0_2px_rgba(148,163,184,0.12)]",
  },
};

export function PriorityBadge({
  priority,
  glowing = false,
}: {
  priority: SmartSuggestionPriority;
  glowing?: boolean;
}) {
  const meta = PRIORITY_META[priority];
  return (
    <span
      className={`relative inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${meta.base}`}
      title={`Priority: ${meta.label}`}
    >
      {glowing ? (
        <span
          aria-hidden
          className={`status-chip-glow-pulse pointer-events-none absolute -inset-0.5 rounded-full ${meta.glow}`}
        />
      ) : null}
      <span className="relative z-10">
        {meta.label}
        {glowing ? " Priority" : ""}
      </span>
    </span>
  );
}

