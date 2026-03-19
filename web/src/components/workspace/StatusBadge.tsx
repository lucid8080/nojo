import type { WorkspaceStatus } from "@/data/workspaceChatMock";

const styles: Record<WorkspaceStatus, string> = {
  Thinking:
    "bg-violet-50 text-violet-800 ring-violet-200/80 dark:bg-violet-950/40 dark:text-violet-300 dark:ring-violet-800/50",
  Working:
    "bg-sky-50 text-sky-800 ring-sky-200/80 dark:bg-sky-950/50 dark:text-sky-300 dark:ring-sky-800/50",
  "Waiting for Reply":
    "bg-amber-50 text-amber-900 ring-amber-200/80 dark:bg-amber-950/35 dark:text-amber-200 dark:ring-amber-800/45",
  Completed:
    "bg-neutral-200/90 text-neutral-700 ring-neutral-300/80 dark:bg-slate-700 dark:text-neutral-200 dark:ring-slate-600",
};

export function StatusBadge({ status }: { status: WorkspaceStatus }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ring-inset sm:text-xs ${styles[status]}`}
    >
      {status}
    </span>
  );
}
