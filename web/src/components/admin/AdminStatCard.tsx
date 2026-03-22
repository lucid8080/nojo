export function AdminStatCard({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: "neutral" | "success" | "warning" | "danger";
}) {
  const toneRing =
    tone === "success"
      ? "border-emerald-200 dark:border-emerald-900"
      : tone === "warning"
        ? "border-amber-200 dark:border-amber-900"
        : tone === "danger"
          ? "border-rose-200 dark:border-rose-900"
          : "border-neutral-200 dark:border-slate-800";

  return (
    <div
      className={`rounded-xl border bg-white p-4 shadow-sm dark:bg-slate-900 ${toneRing}`}
    >
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900 dark:text-white">{value}</p>
      {hint ? <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{hint}</p> : null}
    </div>
  );
}
