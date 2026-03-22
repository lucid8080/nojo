"use client";

import type { Conversation } from "@/data/workspaceChatMock";
import { NOJO_WORKSPACE_AGENTS } from "@/data/nojoWorkspaceRoster";
import type { TeamWorkspaceRosterEntry } from "@/data/nojoWorkspaceRoster";
import { useEffect, useMemo, useState } from "react";
import { useAgentIdentity } from "./AgentIdentityContext";
import { WorkspaceAgentAvatar } from "./WorkspaceAgentAvatar";

type Mode = "chat" | "job_room";

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

export function CreateRoomDialog({
  open,
  onOpenChange,
  onCreated,
  mode = "chat",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (conversation: Conversation) => void;
  mode?: Mode;
}) {
  const { mergedRoster } = useAgentIdentity();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [primaryAgentId, setPrimaryAgentId] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const titlePlaceholder =
    mode === "job_room" ? "e.g. Pipeline health weekly digest" : "e.g. Q2 positioning brainstorm";

  useEffect(() => {
    if (!open) return;
    setTitle("");
    setDescription("");
    setSelectedIds([]);
    setPrimaryAgentId("");
    setError(null);
    setSubmitting(false);
  }, [open]);

  const selectedSorted = useMemo(
    () => sortSelectedAgents(selectedIds, mergedRoster),
    [selectedIds, mergedRoster],
  );

  const toggleAgent = (id: string) => {
    setSelectedIds((prev) => {
      const on = prev.includes(id);
      const next = on ? prev.filter((x) => x !== id) : [...prev, id];
      const sorted = sortSelectedAgents(next, mergedRoster);
      setPrimaryAgentId((lead) => {
        if (sorted.length === 0) return "";
        if (!sorted.includes(lead)) return sorted[0]!;
        return lead;
      });
      return sorted;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (selectedIds.length === 0) {
      setError("Select at least one agent.");
      return;
    }
    if (!primaryAgentId || !selectedIds.includes(primaryAgentId)) {
      setError("Choose a lead agent from the selected participants.");
      return;
    }
    const trimmed = title.trim();
    if (!trimmed) {
      setError("Enter a title.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/workspace/conversations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: trimmed,
          description: description.trim() || null,
          agentIds: selectedIds,
          primaryAgentId,
        }),
      });

      if (res.status === 401) {
        window.location.href = "/login?callbackUrl=" + encodeURIComponent("/workspace");
        return;
      }

      const json = (await res.json()) as {
        success?: boolean;
        message?: string;
        conversation?: Conversation;
      };

      if (!res.ok || !json.success || !json.conversation) {
        setError(json.message ?? "Could not create room.");
        return;
      }

      onCreated(json.conversation);
      onOpenChange(false);
    } catch {
      setError("Network error — try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

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
        aria-labelledby="create-room-title"
        className="relative z-10 flex max-h-[min(90dvh,720px)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-neutral-200/90 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
      >
        <div className="shrink-0 border-b border-neutral-200/80 px-5 py-4 dark:border-slate-800">
          <h2 id="create-room-title" className="text-lg font-bold text-slate-900 dark:text-white">
            {mode === "job_room" ? "New job room" : "New chat"}
          </h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-neutral-400">
            Name the room, add optional context, and choose who participates.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
            <div>
              <label htmlFor="room-title" className="text-xs font-semibold text-slate-600 dark:text-neutral-400">
                Title
              </label>
              <input
                id="room-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={titlePlaceholder}
                maxLength={200}
                autoComplete="off"
                className="mt-1 w-full rounded-xl border border-neutral-200/90 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none ring-sky-500/30 placeholder:text-slate-400 focus:ring-2 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:placeholder:text-neutral-500"
              />
            </div>
            <div>
              <label htmlFor="room-desc" className="text-xs font-semibold text-slate-600 dark:text-neutral-400">
                Context <span className="font-normal text-slate-400">(optional)</span>
              </label>
              <textarea
                id="room-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Short notes for the team — goals, constraints, links…"
                maxLength={2000}
                rows={3}
                className="mt-1 w-full resize-none rounded-xl border border-neutral-200/90 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none ring-sky-500/30 placeholder:text-slate-400 focus:ring-2 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:placeholder:text-neutral-500"
              />
            </div>

            <div>
              <p className="text-xs font-semibold text-slate-600 dark:text-neutral-400">Agents in this room</p>
              <ul className="mt-2 space-y-2">
                {mergedRoster.map((a) => {
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
                })}
              </ul>
            </div>

            {selectedSorted.length > 0 ? (
              <div>
                <p className="text-xs font-semibold text-slate-600 dark:text-neutral-400">Lead agent</p>
                <p className="mt-0.5 text-[11px] text-slate-500 dark:text-neutral-500">
                  Used for routing and OpenClaw replies for this thread.
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {selectedSorted.map((id) => {
                    const a = pickAgent(mergedRoster, id);
                    const active = primaryAgentId === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setPrimaryAgentId(id)}
                        className={
                          active
                            ? "inline-flex items-center gap-1.5 rounded-full border-2 border-sky-500 bg-sky-50 py-1 pl-1 pr-3 text-xs font-semibold text-sky-900 dark:bg-sky-950/50 dark:text-sky-100"
                            : "inline-flex items-center gap-1.5 rounded-full border border-neutral-200/90 bg-white py-1 pl-1 pr-3 text-xs font-medium text-slate-800 shadow-sm dark:border-slate-600 dark:bg-slate-800 dark:text-neutral-100"
                        }
                      >
                        <WorkspaceAgentAvatar agent={a} size={24} />
                        {a.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}

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
              disabled={submitting}
              className="flex-1 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-50 dark:bg-neutral-100 dark:text-slate-900 dark:hover:bg-white"
            >
              {submitting ? "Creating…" : "Create room"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
