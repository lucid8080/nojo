import type { WorkspaceAgent } from "@/data/workspaceChatMock";

export function AgentLogCard({
  toolName,
  command,
  outputSnippet,
  success,
  createdAt,
  agent,
}: {
  toolName: string;
  command: string;
  outputSnippet: string;
  success: boolean;
  createdAt: string;
  agent?: WorkspaceAgent;
}) {
  return (
    <div
      className={`min-w-0 rounded-2xl border-l-4 bg-white/90 p-4 shadow-sm dark:bg-slate-900/60 ${
        success
          ? "border-l-violet-500 dark:border-l-violet-400"
          : "border-l-amber-500 dark:border-l-amber-400"
      } border border-neutral-200/80 dark:border-slate-700`}
    >
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="rounded-md bg-violet-100 px-2 py-0.5 font-mono text-[11px] font-semibold text-violet-800 dark:bg-violet-950/60 dark:text-violet-300">
          {toolName}
        </span>
        {agent ? (
          <span className="text-xs text-slate-500 dark:text-neutral-400">
            {agent.name}
          </span>
        ) : null}
        <span className="ml-auto text-[10px] text-slate-400 dark:text-neutral-500">
          {createdAt}
        </span>
      </div>
      <pre className="mb-2 max-w-full overflow-x-auto rounded-xl bg-slate-950/5 p-3 font-mono text-[11px] leading-relaxed text-slate-700 dark:bg-black/30 dark:text-neutral-300">
        {command}
      </pre>
      <p
        className={`break-words font-mono text-[11px] ${
          success
            ? "text-emerald-700 dark:text-emerald-400"
            : "text-amber-800 dark:text-amber-300"
        }`}
      >
        → {outputSnippet}
      </p>
    </div>
  );
}
