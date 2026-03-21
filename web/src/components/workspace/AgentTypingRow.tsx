"use client";

import { useWorkspaceAgent } from "@/components/workspace/AgentIdentityContext";
import type { WorkspaceAgent } from "@/data/workspaceChatMock";
import { workspaceAgents } from "@/data/workspaceChatMock";
import { WorkspaceAgentAvatar } from "./WorkspaceAgentAvatar";

function staticAgent(id: string): WorkspaceAgent | undefined {
  return workspaceAgents.find((a) => a.id === id);
}

const dotDelayClass = ["[animation-delay:0ms]", "[animation-delay:150ms]", "[animation-delay:300ms]"] as const;

export function TypingDots({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 ${className}`} aria-hidden>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className={`size-1.5 animate-bounce rounded-full bg-slate-400 dark:bg-slate-500 ${dotDelayClass[i]}`}
        />
      ))}
    </span>
  );
}

/**
 * Lightweight “agent is responding” row before streamed text appears (or while HTTP send is in flight).
 */
export function AgentTypingRow({ agentId }: { agentId: string }) {
  const merged = useWorkspaceAgent(agentId);
  const agent = merged ?? staticAgent(agentId);

  return (
    <div
      className="flex items-end justify-start gap-3"
      role="status"
      aria-live="polite"
      aria-label={agent ? `${agent.name} is responding` : "Agent is responding"}
    >
      {agent ? (
        <WorkspaceAgentAvatar agent={agent} size={36} />
      ) : (
        <span className="size-9 shrink-0 rounded-full bg-neutral-300 dark:bg-slate-600" />
      )}
      <div className="max-w-[85%] min-w-0">
        <div className="rounded-2xl rounded-tl-md border border-neutral-200/90 bg-white px-4 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-800/80">
          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600 dark:text-neutral-300">
            <span>{agent ? `${agent.name} is responding` : "Agent is responding"}</span>
            <TypingDots />
          </div>
        </div>
      </div>
    </div>
  );
}
