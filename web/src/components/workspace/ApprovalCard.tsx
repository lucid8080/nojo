import type { WorkspaceAgent } from "@/data/workspaceChatMock";

export function ApprovalCard({
  title,
  description,
  requester,
  createdAt,
}: {
  title: string;
  description: string;
  requester?: WorkspaceAgent;
  createdAt: string;
}) {
  return (
    <div className="rounded-2xl border-2 border-amber-200/90 bg-amber-50/50 p-4 shadow-sm ring-1 ring-amber-100/80 dark:border-amber-800/60 dark:bg-amber-950/25 dark:ring-amber-900/30">
      <div className="mb-2 flex items-center gap-2">
        <span className="rounded-full bg-amber-200/80 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-900 dark:bg-amber-900/50 dark:text-amber-200">
          Approval
        </span>
        <span className="text-[10px] text-slate-500 dark:text-neutral-500">
          {createdAt}
        </span>
      </div>
      <p className="text-sm font-semibold text-slate-900 dark:text-white">{title}</p>
      <p className="mt-1 text-sm text-slate-600 dark:text-neutral-400">{description}</p>
      {requester ? (
        <p className="mt-2 text-xs text-slate-500 dark:text-neutral-500">
          Requested by {requester.name}
        </p>
      ) : null}
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-500"
        >
          Approve
        </button>
        <button
          type="button"
          className="rounded-xl border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-neutral-50 dark:border-slate-600 dark:bg-slate-800 dark:text-neutral-100 dark:hover:bg-slate-700"
        >
          Request changes
        </button>
      </div>
    </div>
  );
}
