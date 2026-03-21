"use client";

import { useAgentIdentity } from "@/components/workspace/AgentIdentityContext";
import type { Conversation } from "@/data/workspaceChatMock";
import { useMemo, useState } from "react";
import { ConversationListItem } from "./ConversationListItem";

type SectionKey = "active" | "unread" | "all" | "completed";

const SECTION_ORDER: SectionKey[] = ["active", "unread", "all", "completed"];

const SECTION_LABELS: Record<SectionKey, string> = {
  all: "All agents",
  active: "Active jobs",
  unread: "Unread",
  completed: "Completed",
};

function activeJobs(c: Conversation) {
  return !c.archived && c.status !== "Completed";
}

function completedJobs(c: Conversation) {
  return c.archived || c.status === "Completed";
}

function unreadJobs(c: Conversation) {
  return c.unreadCount > 0;
}

export function ConversationList({
  conversations,
  selectedId,
  onSelect,
  onNewChat,
  onNewJobRoom,
}: {
  conversations: Conversation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onNewChat?: () => void;
  onNewJobRoom?: () => void;
}) {
  const [query, setQuery] = useState("");
  const { getAgent } = useAgentIdentity();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter((c) => {
      if (c.jobTitle.toLowerCase().includes(q)) return true;
      return c.agents.some((a) => {
        const m = getAgent(a.id) ?? a;
        return (
          m.name.toLowerCase().includes(q) ||
          m.role.toLowerCase().includes(q)
        );
      });
    });
  }, [conversations, query, getAgent]);

  const sections = useMemo(() => {
    const active = filtered.filter(activeJobs);
    const unread = filtered.filter(unreadJobs);
    const completed = filtered.filter(completedJobs);
    const all = filtered;
    return {
      active,
      unread,
      all,
      completed,
    } satisfies Record<SectionKey, Conversation[]>;
  }, [filtered]);

  return (
    <div className="flex h-full min-h-0 flex-col border-neutral-200/80 bg-white/60 dark:border-slate-800 dark:bg-slate-900/40">
      <div className="shrink-0 space-y-3 border-b border-neutral-200/80 p-4 dark:border-slate-800">
        <div className="relative">
          <span
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            aria-hidden
          >
            <svg
              className="size-4"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
              />
            </svg>
          </span>
          <input
            type="search"
            placeholder="Search conversations…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-xl border border-neutral-200/90 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder:text-neutral-500"
            aria-label="Search conversations"
          />
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onNewChat}
            className="flex-1 rounded-xl border border-neutral-200/90 bg-white px-3 py-2 text-xs font-semibold text-slate-800 shadow-sm transition hover:bg-neutral-50 dark:border-slate-600 dark:bg-slate-800 dark:text-neutral-100 dark:hover:bg-slate-700"
          >
            New chat
          </button>
          <button
            type="button"
            onClick={onNewJobRoom}
            className="flex-1 rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800 dark:bg-neutral-100 dark:text-slate-900 dark:hover:bg-white"
          >
            New job room
          </button>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {filtered.length === 0 ? (
          <p className="px-3 py-8 text-center text-sm text-slate-500 dark:text-neutral-400">
            No conversations match your search.
          </p>
        ) : (
          SECTION_ORDER.map((sectionKey) => {
            const items = sections[sectionKey];
            if (items.length === 0) return null;
            return (
              <div key={sectionKey} className="mb-4">
                <h3 className="mb-2 px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-neutral-500">
                  {SECTION_LABELS[sectionKey]}
                </h3>
                <ul className="space-y-1">
                  {items.map((c) => (
                    <li key={`${sectionKey}-${c.id}`}>
                      <ConversationListItem
                        conversation={c}
                        active={selectedId === c.id}
                        onSelect={onSelect}
                      />
                    </li>
                  ))}
                </ul>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
