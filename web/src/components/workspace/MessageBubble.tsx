import type { WorkspaceAgent } from "@/data/workspaceChatMock";
import { TypingDots } from "./AgentTypingRow";
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
          <p className="break-words whitespace-pre-wrap text-sm leading-relaxed">{body}</p>
          <p className="mt-2 text-[10px] font-medium text-sky-100/90">{createdAt}</p>
        </div>
      </div>
    );
  }

  const showStreamingPlaceholder =
    variant === "agent" && body.trim() === "" && agentStatus === "Working";

  return (
    <div className="flex items-end justify-start gap-3">
      {agent ? (
        <WorkspaceAgentAvatar agent={agent} size={36} />
      ) : (
        <span className="size-9 shrink-0 rounded-full bg-neutral-300 dark:bg-slate-600" />
      )}
      <div className="max-w-[85%] min-w-0">
        <div className="rounded-2xl rounded-tl-md border border-neutral-200/90 bg-white px-4 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-800/80">
          {showStreamingPlaceholder ? (
            <div
              className="flex flex-wrap items-center gap-2 text-sm text-slate-600 dark:text-neutral-300"
              aria-live="polite"
              aria-label={agent ? `${agent.name} is responding` : "Agent is responding"}
            >
              <span>{agent ? `${agent.name} is responding` : "Agent is responding"}</span>
              <TypingDots />
            </div>
          ) : (
            <p className="break-words whitespace-pre-wrap text-sm leading-relaxed text-slate-800 dark:text-neutral-200">
              {body}
            </p>
          )}
        </div>

        <div className="mt-1 flex flex-col items-start gap-0.5">
          <div className="flex flex-wrap items-center gap-2">
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
          <p className="text-[10px] text-slate-400 dark:text-neutral-500">{createdAt}</p>
        </div>
      </div>
    </div>
  );
}
