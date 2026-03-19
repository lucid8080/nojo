"use client";

import type { Conversation } from "@/data/workspaceChatMock";
import { StatusBadge } from "./StatusBadge";
import { WorkspaceAgentAvatar } from "./WorkspaceAgentAvatar";

function IconBtn({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      className="flex size-9 items-center justify-center rounded-full border border-neutral-200/80 bg-white text-slate-600 shadow-sm transition hover:bg-neutral-50 dark:border-slate-600 dark:bg-slate-800 dark:text-neutral-300 dark:hover:bg-slate-700"
    >
      {children}
    </button>
  );
}

export function ChatHeader({ conversation }: { conversation: Conversation | null }) {
  if (!conversation) {
    return (
      <header className="shrink-0 border-b border-neutral-200/80 bg-white/95 px-4 py-4 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
        <p className="text-sm text-slate-500 dark:text-neutral-400">
          Select a conversation
        </p>
      </header>
    );
  }

  const archived = conversation.archived;

  return (
    <header
      className={`shrink-0 border-b border-neutral-200/80 px-4 py-3 backdrop-blur sm:px-5 ${
        archived
          ? "bg-neutral-100/95 dark:bg-slate-900/95"
          : "bg-white/95 dark:bg-slate-950/90"
      }`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1
              className={`truncate text-lg font-bold tracking-tight sm:text-xl ${
                archived
                  ? "text-slate-600 dark:text-neutral-400"
                  : "text-slate-900 dark:text-white"
              }`}
            >
              {conversation.jobTitle}
            </h1>
            {archived ? (
              <span className="shrink-0 rounded-full bg-neutral-200/80 px-2 py-0.5 text-[10px] font-semibold uppercase text-neutral-600 dark:bg-slate-700 dark:text-neutral-400">
                Archived
              </span>
            ) : null}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <div className="flex -space-x-2">
              {conversation.agents.map((a) => (
                  <WorkspaceAgentAvatar key={a.id} agent={a} size={32} />
              ))}
            </div>
            <span className="text-xs text-slate-500 dark:text-neutral-400">
              {conversation.agents.map((a) => a.name).join(" · ")}
            </span>
            <StatusBadge status={conversation.status} />
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <IconBtn label="Snooze">
            <svg className="size-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
          </IconBtn>
          <IconBtn label="More">
            <svg className="size-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM12.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM18.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
            </svg>
          </IconBtn>
        </div>
      </div>
    </header>
  );
}
