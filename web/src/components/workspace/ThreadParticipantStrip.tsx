"use client";

import type { WorkspaceAgent } from "@/data/workspaceChatMock";
import { WorkspaceAgentAvatar } from "./WorkspaceAgentAvatar";

/**
 * Visible roster for the active thread (matches job card "Thread participants").
 */
export function ThreadParticipantStrip({
  agents,
  primaryAgentId,
}: {
  agents: WorkspaceAgent[];
  primaryAgentId: string;
}) {
  if (agents.length === 0) return null;
  const lead =
    agents.find((a) => a.id === primaryAgentId) ?? agents[0] ?? null;

  return (
    <div className="shrink-0 border-b border-neutral-200/80 bg-white/50 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-950/40 sm:px-5">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-neutral-500">
        Thread participants
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {agents.map((a) => (
          <span
            key={a.id}
            className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200/90 bg-white/90 py-0.5 pl-0.5 pr-2.5 text-xs font-medium text-slate-800 shadow-sm dark:border-slate-600 dark:bg-slate-800/90 dark:text-neutral-100"
          >
            <WorkspaceAgentAvatar agent={a} size={26} />
            <span className="max-w-[10rem] truncate">{a.name}</span>
          </span>
        ))}
      </div>
      {lead ? (
        <p className="mt-2 text-[10px] text-slate-500 dark:text-neutral-500">
          Lead for routing and replies:{" "}
          <span className="font-semibold text-slate-700 dark:text-neutral-300">{lead.name}</span>
        </p>
      ) : null}
    </div>
  );
}
