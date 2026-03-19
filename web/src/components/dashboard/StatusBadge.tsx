import type { JobStatus } from "@/data/agentJobsMock";

const styles: Record<JobStatus, string> = {
  Queued:
    "bg-neutral-100 text-neutral-700 ring-neutral-200/80 dark:bg-slate-800 dark:text-neutral-300 dark:ring-slate-600/80",
  Running:
    "bg-sky-100 text-sky-800 ring-sky-200/80 dark:bg-sky-950/60 dark:text-sky-300 dark:ring-sky-800/60",
  "In Progress":
    "bg-emerald-100 text-emerald-800 ring-emerald-200/80 dark:bg-emerald-950/50 dark:text-emerald-300 dark:ring-emerald-800/50",
  Analyzing:
    "bg-violet-100 text-violet-800 ring-violet-200/80 dark:bg-violet-950/50 dark:text-violet-300 dark:ring-violet-800/50",
  Reviewing:
    "bg-amber-100 text-amber-900 ring-amber-200/80 dark:bg-amber-950/40 dark:text-amber-200 dark:ring-amber-800/50",
  Completed:
    "bg-neutral-200/90 text-neutral-800 ring-neutral-300/80 dark:bg-slate-600 dark:text-neutral-100 dark:ring-slate-500",
  Blocked:
    "bg-rose-100 text-rose-800 ring-rose-200/80 dark:bg-rose-950/40 dark:text-rose-300 dark:ring-rose-800/50",
};

export function StatusBadge({ status }: { status: JobStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${styles[status]}`}
    >
      {status}
    </span>
  );
}
