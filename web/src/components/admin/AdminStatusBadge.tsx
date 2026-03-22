const VARIANTS: Record<
  string,
  { className: string; label: string }
> = {
  healthy: {
    className: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
    label: "Healthy",
  },
  success: {
    className: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
    label: "Success",
  },
  warning: {
    className: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
    label: "Warning",
  },
  error: {
    className: "bg-rose-100 text-rose-900 dark:bg-rose-950 dark:text-rose-200",
    label: "Error",
  },
  queued: {
    className: "bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200",
    label: "Queued",
  },
  running: {
    className: "bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-200",
    label: "Running",
  },
  failed: {
    className: "bg-rose-100 text-rose-900 dark:bg-rose-950 dark:text-rose-200",
    label: "Failed",
  },
  configured: {
    className: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
    label: "Configured",
  },
  missing: {
    className: "bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200",
    label: "Missing",
  },
  unknown: {
    className: "bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200",
    label: "Unknown",
  },
};

export function AdminStatusBadge({
  variant,
  children,
}: {
  variant: keyof typeof VARIANTS;
  children?: React.ReactNode;
}) {
  const v = VARIANTS[variant] ?? VARIANTS.unknown;
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${v.className}`}
    >
      {children ?? v.label}
    </span>
  );
}

/** Map arbitrary run status string to badge variant */
export function runStatusVariant(status: string): keyof typeof VARIANTS {
  const s = status.toLowerCase().trim();
  if (s === "failed" || s === "error") return "failed";
  if (s === "running" || s === "in_progress") return "running";
  if (s === "queued" || s === "submitted" || s === "pending") return "queued";
  if (s === "completed" || s === "succeeded") return "success";
  if (s === "cancelled" || s === "canceled") return "warning";
  return "unknown";
}
