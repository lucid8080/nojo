"use client";

import type { Conversation } from "@/data/workspaceChatMock";
import { StatusBadge } from "./StatusBadge";
import { WorkspaceAgentAvatar } from "./WorkspaceAgentAvatar";

function AvatarStack({
  agents,
  max = 2,
}: {
  agents: Conversation["agents"];
  max?: number;
}) {
  const shown = agents.slice(0, max);
  return (
    <div className="flex shrink-0 -space-x-2">
      {shown.map((a) => (
        <WorkspaceAgentAvatar
          key={a.id}
          agent={a}
          size={36}
        />
      ))}
      {agents.length > max ? (
        <span className="flex size-9 items-center justify-center rounded-full border-2 border-white bg-neutral-200 text-[10px] font-semibold text-neutral-600 dark:border-slate-900 dark:bg-slate-700 dark:text-neutral-300">
          +{agents.length - max}
        </span>
      ) : null}
    </div>
  );
}

export function ConversationListItem({
  conversation,
  active,
  onSelect,
}: {
  conversation: Conversation;
  active: boolean;
  onSelect: (id: string) => void;
}) {
  const primary = conversation.agents.find(
    (a) => a.id === conversation.primaryAgentId,
  ) ?? conversation.agents[0];
  const unread = conversation.unreadCount > 0;
  const archived = conversation.archived;

  return (
    <button
      type="button"
      onClick={() => onSelect(conversation.id)}
      className={[
        "group flex w-full gap-3 rounded-2xl border p-3 text-left transition",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500",
        active
          ? "border-sky-300/80 bg-sky-50/90 shadow-sm dark:border-sky-800 dark:bg-sky-950/40"
          : "border-transparent hover:border-neutral-200/90 hover:bg-white/80 dark:hover:border-slate-700 dark:hover:bg-slate-800/60",
        unread && !active
          ? "border-l-4 border-l-sky-500 border-neutral-200/50 bg-white/60 pl-2.5 dark:border-slate-700 dark:border-l-sky-400 dark:bg-slate-900/40"
          : "",
        archived && !active
          ? "opacity-75 saturate-50 dark:saturate-75"
          : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <AvatarStack agents={conversation.agents} />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p
              className={`truncate text-sm font-semibold text-slate-900 dark:text-white ${unread ? "font-bold" : ""}`}
            >
              {conversation.jobTitle}
            </p>
            <p className="truncate text-xs text-slate-500 dark:text-neutral-400">
              {primary?.name} · {primary?.role}
            </p>
          </div>
          <span className="shrink-0 text-[10px] text-slate-400 dark:text-neutral-500">
            {conversation.timestamp}
          </span>
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <StatusBadge status={conversation.status} />
          {archived ? (
            <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-medium text-neutral-600 dark:bg-slate-800 dark:text-neutral-400">
              Archived
            </span>
          ) : null}
        </div>
        <p
          className={`mt-1 line-clamp-2 text-xs text-slate-600 dark:text-neutral-400 ${unread ? "text-slate-800 dark:text-neutral-300" : ""}`}
        >
          {conversation.lastPreview}
        </p>
      </div>
      {unread ? (
        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-sky-600 text-[10px] font-bold text-white dark:bg-sky-500">
          {conversation.unreadCount > 9 ? "9+" : conversation.unreadCount}
        </span>
      ) : null}
    </button>
  );
}
