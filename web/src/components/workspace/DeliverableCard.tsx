import type { WorkspaceAgent } from "@/data/workspaceChatMock";

const typeIcons: Record<string, string> = {
  docx: "DOC",
  pdf: "PDF",
  zip: "ZIP",
  html: "HTML",
  md: "MD",
};

export function DeliverableCard({
  fileName,
  fileType,
  version,
  createdAt,
  agent,
}: {
  fileName: string;
  fileType: string;
  version: string;
  createdAt: string;
  agent?: WorkspaceAgent;
}) {
  const label = typeIcons[fileType.toLowerCase()] ?? fileType.toUpperCase().slice(0, 3);
  return (
    <div className="rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50/80 to-white p-4 shadow-sm dark:border-emerald-900/50 dark:from-emerald-950/30 dark:to-slate-900/60">
      <div className="flex items-start gap-3">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-xs font-bold text-white shadow-sm dark:bg-emerald-700">
          {label}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-slate-900 dark:text-white">{fileName}</p>
          <p className="mt-0.5 text-xs text-emerald-800/80 dark:text-emerald-400/90">
            {version}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-slate-500 dark:text-neutral-400">
            <span>{createdAt}</span>
            {agent ? <span>· {agent.name}</span> : null}
          </div>
        </div>
        <button
          type="button"
          className="shrink-0 rounded-lg border border-emerald-300/80 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-50 dark:border-emerald-800 dark:bg-slate-800 dark:text-emerald-300 dark:hover:bg-slate-700"
        >
          Open
        </button>
      </div>
    </div>
  );
}
