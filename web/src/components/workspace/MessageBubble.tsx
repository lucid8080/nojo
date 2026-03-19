import type { WorkspaceAgent } from "@/data/workspaceChatMock";
import { StatusBadge } from "./StatusBadge";
import { WorkspaceAgentAvatar } from "./WorkspaceAgentAvatar";

export function MessageBubble({
  variant,
  body,
  createdAt,
  agent,
  agentStatus,
}: {
  variant: "user" | "agent";
  body: string;
  createdAt: string;
  agent?: WorkspaceAgent;
  agentStatus?: import("@/data/workspaceChatMock").WorkspaceStatus;
}) {
  if (variant === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-md bg-sky-600 px-4 py-3 text-white shadow-sm dark:bg-sky-700">
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{body}</p>
          <p className="mt-2 text-[10px] font-medium text-sky-100/90">{createdAt}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start gap-3">
      {agent ? (
        <WorkspaceAgentAvatar agent={agent} size={36} className="mt-1" />
      ) : (
        <span className="mt-1 size-9 shrink-0 rounded-full bg-neutral-300 dark:bg-slate-600" />
      )}
      <div className="max-w-[85%] min-w-0">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          {agent ? (
            <span className="text-sm font-semibold text-slate-900 dark:text-white">
              {agent.name}
            </span>
          ) : null}
          <span className="text-xs text-slate-400 dark:text-neutral-500">
            {agent?.role}
          </span>
          {agentStatus ? <StatusBadge status={agentStatus} /> : null}
        </div>
        <div className="rounded-2xl rounded-tl-md border border-neutral-200/90 bg-white px-4 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-800/80">
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-800 dark:text-neutral-200">
            {body}
          </p>
          <p className="mt-2 text-[10px] text-slate-400 dark:text-neutral-500">
            {createdAt}
          </p>
        </div>
      </div>
    </div>
  );
}
