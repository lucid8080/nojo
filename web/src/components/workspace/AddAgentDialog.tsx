"use client";

import type { Conversation, WorkspaceAgent } from "@/data/workspaceChatMock";
import { NOJO_WORKSPACE_AGENTS } from "@/data/nojoWorkspaceRoster";
import type { TeamWorkspaceRosterEntry } from "@/data/nojoWorkspaceRoster";
import { useEffect, useMemo, useState } from "react";
import { useAgentIdentity } from "./AgentIdentityContext";
import { WorkspaceAgentAvatar } from "./WorkspaceAgentAvatar";

function sortSelectedAgents(
  ids: string[],
  mergedRoster: readonly TeamWorkspaceRosterEntry[],
): string[] {
  const order = new Map<string, number>();
  NOJO_WORKSPACE_AGENTS.forEach((a, i) => order.set(a.id, i));
  const custom = mergedRoster.filter((a) => !order.has(a.id));
  const sortedCustom = [...custom].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
  );
  sortedCustom.forEach((a, i) => order.set(a.id, 100 + i));
  return [...ids].sort((a, b) => (order.get(a) ?? 999) - (order.get(b) ?? 999));
}

function pickAgent(
  mergedRoster: readonly TeamWorkspaceRosterEntry[],
  id: string,
): TeamWorkspaceRosterEntry {
  return (
    mergedRoster.find((x) => x.id === id) ?? {
      id,
      name: id,
      initials: "??",
      role: "",
      avatarClass: "bg-slate-500",
    }
  );
}

export function AddAgentDialog({
  open,
  conversation,
  onOpenChange,
  onAgentsAdded,
}: {
  open: boolean;
  conversation: Conversation | null;
  onOpenChange: (open: boolean) => void;
  onAgentsAdded: (updatedConversation: Conversation) => void;
}) {
  const { mergedRoster } = useAgentIdentity();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setSelectedIds([]);
    setError(null);
    setSubmitting(false);
  }, [open, conversation]);

  const existingAgentIds = useMemo(() => {
    return new Set(conversation?.agents.map((a) => a.id) ?? []);
  }, [conversation]);

  const availableRoster = useMemo(() => {
    return mergedRoster.filter((a) => !existingAgentIds.has(a.id));
  }, [mergedRoster, existingAgentIds]);

  const selectedSorted = useMemo(
    () => sortSelectedAgents(selectedIds, mergedRoster),
    [selectedIds, mergedRoster],
  );

  const toggleAgent = (id: string) => {
    setSelectedIds((prev) => {
      const on = prev.includes(id);
      return on ? prev.filter((x) => x !== id) : [...prev, id];
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!conversation) return;
    setError(null);
    if (selectedIds.length === 0) {
      setError("Select at least one additional agent.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/workspace/conversations/${conversation.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          agentIds: selectedIds,
        }),
      });

      if (res.status === 401) {
        window.location.href = "/login?callbackUrl=" + encodeURIComponent("/workspace");
        return;
      }

      if (res.status === 404) {
        // If it's a mock conversation (or seeded), patch the local agents manually
        const agentsMap = new Map<string, WorkspaceAgent>();
        mergedRoster.forEach((a) => agentsMap.set(a.id, a as WorkspaceAgent));
        
        const newAgents = selectedIds.map(id => agentsMap.get(id) ?? pickAgent(mergedRoster, id) as WorkspaceAgent);
        const updatedConversation: Conversation = {
          ...conversation,
          agents: [...conversation.agents, ...newAgents]
        };
        onAgentsAdded(updatedConversation);
        onOpenChange(false);
        return;
      }

      const json = (await res.json()) as {
        success?: boolean;
        message?: string;
        conversation?: Conversation;
      };

      if (!res.ok || !json.success || !json.conversation) {
        setError(json.message ?? "Could not add agent.");
        return;
      }

      onAgentsAdded(json.conversation);
      onOpenChange(false);
    } catch {
      setError("Network error — try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!open || !conversation) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center p-4 sm:items-center">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        onClick={() => !submitting && onOpenChange(false)}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-agent-title"
        className="relative z-10 flex max-h-[min(90dvh,720px)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-neutral-200/90 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
      >
        <div className="shrink-0 border-b border-neutral-200/80 px-5 py-4 dark:border-slate-800">
          <h2 id="add-agent-title" className="text-lg font-bold text-slate-900 dark:text-white">
            Invite Agents
          </h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-neutral-400">
            Invite more agents to join the {conversation.jobTitle} chat.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
            <div>
              <p className="text-xs font-semibold text-slate-600 dark:text-neutral-400">Available Agents</p>
              <ul className="mt-2 space-y-2">
                {availableRoster.length === 0 ? (
                  <p className="text-sm text-slate-500 dark:text-neutral-500">
                    All available agents are already in this room.
                  </p>
                ) : (
                  availableRoster.map((a) => {
                    const checked = selectedIds.includes(a.id);
                    return (
                      <li key={a.id}>
                        <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-transparent px-2 py-1.5 transition hover:bg-neutral-50 dark:hover:bg-slate-800/80">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleAgent(a.id)}
                            className="size-4 rounded border-neutral-300 text-sky-600 focus:ring-sky-500 dark:border-slate-600"
                          />
                          <WorkspaceAgentAvatar agent={a} size={32} />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium text-slate-900 dark:text-neutral-100">
                              {a.name}
                            </span>
                            <span className="block truncate text-xs text-slate-500 dark:text-neutral-500">
                              {a.role}
                            </span>
                          </span>
                        </label>
                      </li>
                    );
                  })
                )}
              </ul>
            </div>

            {selectedSorted.length > 0 ? (
              <div className="rounded-xl border border-neutral-200/80 bg-neutral-50/80 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/50">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-neutral-500">
                  Selected ({selectedSorted.length})
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {selectedSorted.map((id) => {
                    const a = pickAgent(mergedRoster, id);
                    return (
                      <span
                        key={id}
                        className="inline-flex items-center gap-1 rounded-full border border-neutral-200/90 bg-white py-0.5 pl-0.5 pr-2 text-xs font-medium text-slate-800 dark:border-slate-600 dark:bg-slate-800 dark:text-neutral-100"
                      >
                        <WorkspaceAgentAvatar agent={a} size={22} />
                        {a.name}
                      </span>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {error ? (
              <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800 dark:bg-rose-950/40 dark:text-rose-200">
                {error}
              </p>
            ) : null}
          </div>

          <div className="flex shrink-0 gap-2 border-t border-neutral-200/80 px-5 py-4 dark:border-slate-800">
            <button
              type="button"
              disabled={submitting}
              onClick={() => onOpenChange(false)}
              className="flex-1 rounded-xl border border-neutral-200/90 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-neutral-50 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-neutral-100 dark:hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || selectedSorted.length === 0}
              className="flex-1 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-50 dark:bg-neutral-100 dark:text-slate-900 dark:hover:bg-white"
            >
              {submitting ? "Adding…" : `Add ${selectedSorted.length ? selectedSorted.length : ""} Agent${selectedSorted.length > 1 ? "s" : ""}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
