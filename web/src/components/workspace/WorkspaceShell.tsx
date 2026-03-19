"use client";

import {
  getConversation,
  getJobContextForConversation,
  getMessagesForConversation,
  type WorkspaceMessage,
  workspaceConversations,
} from "@/data/workspaceChatMock";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ChatComposer } from "./ChatComposer";
import { ChatHeader } from "./ChatHeader";
import { ConversationList } from "./ConversationList";
import { JobContextPanel } from "./JobContextPanel";
import { MessageFeed } from "./MessageFeed";
import { RecentRunsList, type RecentRun } from "./RecentRunsList";

export function WorkspaceShell() {
  const defaultId = workspaceConversations[0]?.id ?? null;
  const [selectedId, setSelectedId] = useState<string | null>(defaultId);
  const [leftOpen, setLeftOpen] = useState(false);
  const [rightOpen, setRightOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [localMessagesByConversationId, setLocalMessagesByConversationId] = useState<
    Record<string, WorkspaceMessage[]>
  >({});
  const [recentRuns, setRecentRuns] = useState<RecentRun[]>([]);

  const fetchRecentRuns = useCallback(async () => {
    try {
      const res = await fetch("/api/openclaw/runs");
      if (res.status === 401) {
        window.location.href = "/login?callbackUrl=" + encodeURIComponent("/workspace");
        return;
      }
      const json = await res.json();
      if (res.ok && json?.success && Array.isArray(json.runs)) {
        setRecentRuns(json.runs);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchRecentRuns();
  }, [fetchRecentRuns]);

  function uid() {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
      return crypto.randomUUID();
    }
    return `m_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  }

  function formatNowTime() {
    return new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }

  const conversation = useMemo(
    () => (selectedId ? getConversation(selectedId) ?? null : null),
    [selectedId],
  );
  const messages = useMemo(
    () => {
      if (!selectedId) return [];
      return [
        ...getMessagesForConversation(selectedId),
        ...(localMessagesByConversationId[selectedId] ?? []),
      ];
    },
    [selectedId, localMessagesByConversationId],
  );
  const jobContext = useMemo(
    () => (selectedId ? getJobContextForConversation(selectedId) : null),
    [selectedId],
  );

  const select = useCallback((id: string) => {
    setSelectedId(id);
    setLeftOpen(false);
  }, []);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  const handleSend = useCallback(
    async (prompt: string) => {
      if (!conversation || !selectedId) {
        throw new Error("No conversation selected.");
      }

      const trimmed = prompt.trim();
      if (!trimmed) return;

      const createdAt = formatNowTime();
      const userMsg: WorkspaceMessage = {
        id: uid(),
        type: "user",
        createdAt,
        body: trimmed,
      };

      setLocalMessagesByConversationId((prev) => ({
        ...prev,
        [selectedId]: [...(prev[selectedId] ?? []), userMsg],
      }));

      setSubmitting(true);
      try {
        const payload = {
          prompt: trimmed,
          agentId: conversation.primaryAgentId,
          conversationId: conversation.id,
          metadata: { jobTitle: conversation.jobTitle },
        };

        const res = await fetch("/api/openclaw/runs", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (res.status === 401) {
          window.location.href = "/login?callbackUrl=" + encodeURIComponent("/workspace");
          return;
        }

        const json = (await res.json()) as
          | {
              success: boolean;
              runId?: string;
              status?: string;
              message?: string;
              error?: { message?: string };
            }
          | {
              success?: boolean;
              message?: string;
              error?: { message?: string };
              code?: string;
              upstreamStatus?: number;
            };

        if (!res.ok || !json.success) {
          const message =
            json && typeof json === "object"
              ? "message" in json && typeof json.message === "string"
                ? json.message
                : json.error?.message
              : undefined;

          const code =
            json && typeof json === "object" && "code" in json && typeof json.code === "string"
              ? json.code
              : undefined;

          const upstreamStatus =
            json &&
            typeof json === "object" &&
            "upstreamStatus" in json &&
            typeof json.upstreamStatus === "number"
              ? json.upstreamStatus
              : undefined;

          const details = [
            message ? String(message) : undefined,
            code ? `code: ${code}` : undefined,
            upstreamStatus != null ? `upstream: ${upstreamStatus}` : undefined,
          ].filter(Boolean) as string[];
          const detailsMessage = details.length ? details.join(" · ") : undefined;

          const sysMsg: WorkspaceMessage = {
            id: uid(),
            type: "system",
            createdAt,
            body: `Submission failed${detailsMessage ? ` · ${detailsMessage}` : ""}`,
          };
          setLocalMessagesByConversationId((prev) => ({
            ...prev,
            [selectedId]: [...(prev[selectedId] ?? []), sysMsg],
          }));

          setToast(
            detailsMessage
              ? `OpenClaw submit failed: ${detailsMessage}`
              : "OpenClaw submit failed",
          );
          throw new Error(detailsMessage ?? "OpenClaw submit failed.");
        }

        const runId = (json as { runId?: string }).runId as string | undefined;
        const localId = (json as { id?: string }).id as string | undefined;
        const status = (json as { status?: string }).status as string | undefined;
        const idForCalls = runId ?? localId;
        const sysMsg: WorkspaceMessage = {
          id: uid(),
          type: "system",
          createdAt,
          body: `Submitted to OpenClaw${
            idForCalls ? ` · ${runId ? `runId: ${runId}` : `id: ${localId}`}` : ""
          }${status ? ` · status: ${status}` : ""}`,
          runId: idForCalls ?? undefined,
          runStatus: status ?? undefined,
        };
        setLocalMessagesByConversationId((prev) => ({
          ...prev,
          [selectedId]: [...(prev[selectedId] ?? []), sysMsg],
        }));

        setToast(idForCalls ? `OpenClaw run submitted` : "OpenClaw run submitted");
        fetchRecentRuns();
      } catch (err) {
        // ChatComposer expects thrown errors on failure; we already appended a system message above.
        throw err;
      } finally {
        setSubmitting(false);
      }
    },
    [conversation, selectedId, fetchRecentRuns],
  );

  useEffect(() => {
    if (!leftOpen && !rightOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setLeftOpen(false);
        setRightOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [leftOpen, rightOpen]);

  return (
    <div className="flex min-h-0 flex-1 flex-col lg:min-h-[calc(100vh-8rem)]">
      {toast ? (
        <div
          className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-full border border-neutral-200/80 bg-slate-900 px-4 py-2 text-sm text-white shadow-lg dark:bg-white dark:text-slate-900"
          role="status"
        >
          {toast}
        </div>
      ) : null}

      {/* Mobile / tablet bar */}
      <div className="flex shrink-0 items-center gap-2 border-b border-neutral-200/80 bg-white/90 px-3 py-2 dark:border-slate-800 dark:bg-slate-950/90 lg:hidden">
        <button
          type="button"
          onClick={() => {
            setLeftOpen(true);
            setRightOpen(false);
          }}
          className="rounded-xl border border-neutral-200/80 bg-white px-3 py-2 text-xs font-semibold text-slate-800 shadow-sm dark:border-slate-600 dark:bg-slate-800 dark:text-neutral-100"
        >
          Inbox
        </button>
        <button
          type="button"
          onClick={() => {
            setRightOpen(true);
            setLeftOpen(false);
          }}
          className="rounded-xl border border-neutral-200/80 bg-white px-3 py-2 text-xs font-semibold text-slate-800 shadow-sm dark:border-slate-600 dark:bg-slate-800 dark:text-neutral-100"
        >
          Job
        </button>
        <span className="ml-auto truncate text-xs font-medium text-slate-500 dark:text-neutral-400">
          {conversation?.jobTitle ?? "Nojoblem workspace"}
        </span>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[280px_1fr_320px]">
        {/* Left: desktop */}
        <div className="hidden min-h-0 overflow-hidden rounded-2xl border border-neutral-200/80 bg-white/50 shadow-sm dark:border-slate-800 dark:bg-slate-900/30 lg:flex lg:flex-col">
          <div className="min-h-0 flex-1 overflow-hidden">
            <ConversationList
              conversations={workspaceConversations}
              selectedId={selectedId}
              onSelect={select}
              onNewChat={() => showToast("New chat — connect API to create")}
              onNewJobRoom={() => showToast("New job room — connect API to create")}
            />
          </div>
          <div className="max-h-[280px] min-h-0 shrink-0 overflow-hidden border-t border-neutral-200/80 dark:border-slate-800">
            <RecentRunsList runs={recentRuns} onRefresh={fetchRecentRuns} />
          </div>
        </div>

        {/* Center chat */}
        <div className="flex min-h-0 min-w-0 flex-col border-neutral-200/80 bg-white/40 dark:border-slate-800 dark:bg-slate-950/20 lg:border-x">
          <ChatHeader conversation={conversation} />
          <div className="min-h-0 flex-1 overflow-y-auto">
            {conversation ? (
              <MessageFeed messages={messages} />
            ) : (
              <p className="p-8 text-center text-sm text-slate-500 dark:text-neutral-400">
                Choose a conversation from Inbox.
              </p>
            )}
          </div>
          {conversation ? (
            <ChatComposer
              agents={conversation.agents}
              submitting={submitting}
              onSend={handleSend}
            />
          ) : (
            <div className="shrink-0 border-t border-neutral-200/80 p-4 dark:border-slate-800">
              <p className="text-center text-xs text-slate-400 dark:text-neutral-500">
                Select a thread to compose
              </p>
            </div>
          )}
        </div>

        {/* Right: desktop */}
        <div className="hidden min-h-0 overflow-hidden rounded-2xl border border-neutral-200/80 bg-white/50 shadow-sm dark:border-slate-800 dark:bg-slate-900/30 lg:block">
          <JobContextPanel context={jobContext} />
        </div>
      </div>

      {/* Left drawer */}
      {leftOpen ? (
        <>
          <button
            type="button"
            aria-label="Close inbox"
            className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm lg:hidden"
            onClick={() => setLeftOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 z-50 flex w-[min(100vw-3rem,320px)] flex-col border-r border-neutral-200/80 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950 lg:hidden">
            <div className="flex items-center justify-between border-b border-neutral-200/80 p-3 dark:border-slate-800">
              <span className="text-sm font-bold text-slate-900 dark:text-white">
                Inbox
              </span>
              <button
                type="button"
                onClick={() => setLeftOpen(false)}
                className="rounded-lg p-2 text-slate-500 hover:bg-neutral-100 dark:hover:bg-slate-800"
                aria-label="Close"
              >
                <svg className="size-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-hidden">
              <ConversationList
                conversations={workspaceConversations}
                selectedId={selectedId}
                onSelect={select}
                onNewChat={() => {
                  showToast("New chat — connect API");
                  setLeftOpen(false);
                }}
                onNewJobRoom={() => {
                  showToast("New job room — connect API");
                  setLeftOpen(false);
                }}
              />
            </div>
            <div className="max-h-[200px] shrink-0 overflow-hidden border-t border-neutral-200/80 dark:border-slate-800">
              <RecentRunsList runs={recentRuns} onRefresh={fetchRecentRuns} />
            </div>
          </div>
        </>
      ) : null}

      {/* Right drawer */}
      {rightOpen ? (
        <>
          <button
            type="button"
            aria-label="Close job panel"
            className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm lg:hidden"
            onClick={() => setRightOpen(false)}
          />
          <div className="fixed inset-y-0 right-0 z-50 flex w-[min(100vw-2rem,360px)] flex-col border-l border-neutral-200/80 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950 lg:hidden">
            <div className="flex items-center justify-between border-b border-neutral-200/80 p-3 dark:border-slate-800">
              <span className="text-sm font-bold text-slate-900 dark:text-white">
                Job context
              </span>
              <button
                type="button"
                onClick={() => setRightOpen(false)}
                className="rounded-lg p-2 text-slate-500 hover:bg-neutral-100 dark:hover:bg-slate-800"
                aria-label="Close"
              >
                <svg className="size-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              <JobContextPanel context={jobContext} />
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
