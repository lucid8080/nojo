"use client";

import {
  getConversation,
  getJobContextForConversation,
  getMessagesForConversation,
  type WorkspaceMessage,
  workspaceConversations,
} from "@/data/workspaceChatMock";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChatComposer } from "./ChatComposer";
import { ChatHeader } from "./ChatHeader";
import { ConversationList } from "./ConversationList";
import { JobContextPanel } from "./JobContextPanel";
import { MessageFeed } from "./MessageFeed";
import { RecentRunsList, type RecentRun } from "./RecentRunsList";

type OpenClawSseEvent =
  | { type: "ready"; sessionKey: string }
  | {
      type: "history";
      entries: Array<{ role: "user" | "assistant"; text: string }>;
    }
  | { type: "delta"; runId: string; text: string }
  | { type: "final"; runId: string; text: string; stopReason?: string }
  | { type: "aborted"; runId: string; text?: string }
  | { type: "status"; phase: string; detail?: string }
  | { type: "error"; message: string; code?: string; runId?: string };

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
  const [openClawMessagesByConversationId, setOpenClawMessagesByConversationId] = useState<
    Record<string, WorkspaceMessage[]>
  >({});
  const [streamAssistant, setStreamAssistant] = useState<{
    conversationId: string;
    runId: string;
    text: string;
  } | null>(null);
  const [recentRuns, setRecentRuns] = useState<RecentRun[]>([]);
  const eventSourceRef = useRef<EventSource | null>(null);

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
  const messages = useMemo(() => {
    if (!selectedId) return [];
    const streamExtra: WorkspaceMessage[] =
      streamAssistant && streamAssistant.conversationId === selectedId && streamAssistant.text
        ? [
            {
              id: `oc_stream_${streamAssistant.runId}`,
              type: "agent",
              createdAt: "Live",
              agentId: conversation?.primaryAgentId ?? "agent",
              body: streamAssistant.text,
              agentStatus: "Working",
            },
          ]
        : [];
    return [
      ...getMessagesForConversation(selectedId),
      ...(openClawMessagesByConversationId[selectedId] ?? []),
      ...(localMessagesByConversationId[selectedId] ?? []),
      ...streamExtra,
    ];
  }, [
    selectedId,
    localMessagesByConversationId,
    openClawMessagesByConversationId,
    streamAssistant,
    conversation?.primaryAgentId,
  ]);

  useEffect(() => {
    setStreamAssistant(null);
  }, [selectedId]);

  useEffect(() => {
    eventSourceRef.current?.close();
    eventSourceRef.current = null;

    if (!conversation) return;

    const params = new URLSearchParams({
      conversationId: conversation.id,
      agentId: conversation.primaryAgentId,
    });
    const es = new EventSource(`/api/openclaw/chat/stream?${params.toString()}`);
    eventSourceRef.current = es;

    const onOpenClaw = (ev: MessageEvent) => {
      let data: OpenClawSseEvent;
      try {
        data = JSON.parse(ev.data) as OpenClawSseEvent;
      } catch {
        return;
      }

      const cid = conversation.id;
      const agentId = conversation.primaryAgentId;
      const t = formatNowTime();

      if (data.type === "history" && Array.isArray(data.entries)) {
        const mapped: WorkspaceMessage[] = data.entries.map((e, i) =>
          e.role === "user"
            ? {
                id: `oc_hist_u_${cid}_${i}`,
                type: "user" as const,
                createdAt: t,
                body: e.text,
              }
            : {
                id: `oc_hist_a_${cid}_${i}`,
                type: "agent" as const,
                createdAt: t,
                agentId,
                body: e.text,
              },
        );
        setOpenClawMessagesByConversationId((prev) => ({ ...prev, [cid]: mapped }));
        return;
      }

      if (data.type === "delta") {
        setStreamAssistant({ conversationId: cid, runId: data.runId, text: data.text });
        return;
      }

      if (data.type === "final") {
        setStreamAssistant(null);
        const agentMsg: WorkspaceMessage = {
          id: `oc_final_${data.runId}`,
          type: "agent",
          createdAt: t,
          agentId,
          body: data.text,
          agentStatus: "Completed",
        };
        setOpenClawMessagesByConversationId((prev) => ({
          ...prev,
          [cid]: [...(prev[cid] ?? []), agentMsg],
        }));
        return;
      }

      if (data.type === "aborted") {
        setStreamAssistant(null);
        const sys: WorkspaceMessage = {
          id: `oc_abort_${data.runId}`,
          type: "system",
          createdAt: t,
          body: data.text?.trim()
            ? `OpenClaw run aborted · ${data.text.trim()}`
            : "OpenClaw run aborted.",
        };
        setOpenClawMessagesByConversationId((prev) => ({
          ...prev,
          [cid]: [...(prev[cid] ?? []), sys],
        }));
        return;
      }

      if (data.type === "error") {
        if (data.code === "BRIDGE_CONNECT") {
          setToast(`OpenClaw: ${data.message}`);
        }
        const sys: WorkspaceMessage = {
          id: uid(),
          type: "system",
          createdAt: t,
          body: `OpenClaw error${data.code ? ` (${data.code})` : ""}: ${data.message}`,
        };
        setOpenClawMessagesByConversationId((prev) => ({
          ...prev,
          [cid]: [...(prev[cid] ?? []), sys],
        }));
        return;
      }

      if (data.type === "status") {
        /* near-real-time tool/status noise — optional to surface */
      }
    };

    es.addEventListener("openclaw", onOpenClaw as EventListener);
    es.onerror = () => {
      // EventSource auto-reconnects; avoid toast spam
    };

    return () => {
      es.removeEventListener("openclaw", onOpenClaw as EventListener);
      es.close();
      if (eventSourceRef.current === es) eventSourceRef.current = null;
    };
  }, [conversation]);
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
        const idempotencyKey =
          typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : `nojo_${Date.now()}_${Math.random().toString(16).slice(2)}`;

        const res = await fetch("/api/openclaw/chat/send", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            prompt: trimmed,
            agentId: conversation.primaryAgentId,
            conversationId: conversation.id,
            idempotencyKey,
          }),
        });

        if (res.status === 401) {
          window.location.href = "/login?callbackUrl=" + encodeURIComponent("/workspace");
          return;
        }

        const json = (await res.json()) as {
          success?: boolean;
          message?: string;
          code?: string;
          sessionKey?: string;
        };

        if (!res.ok || !json.success) {
          const message =
            typeof json.message === "string" && json.message.trim() !== ""
              ? json.message
              : "OpenClaw chat request failed.";

          const code = typeof json.code === "string" ? json.code : undefined;

          const detailsMessage = [message, code ? `code: ${code}` : undefined]
            .filter(Boolean)
            .join(" · ");

          const sysMsg: WorkspaceMessage = {
            id: uid(),
            type: "system",
            createdAt,
            body: `OpenClaw chat failed · ${detailsMessage}`,
          };
          setLocalMessagesByConversationId((prev) => ({
            ...prev,
            [selectedId]: [...(prev[selectedId] ?? []), sysMsg],
          }));

          setToast(`OpenClaw chat failed: ${detailsMessage}`);
          throw new Error(detailsMessage);
        }

        setToast("Sent to OpenClaw");
      } catch (err) {
        throw err;
      } finally {
        setSubmitting(false);
      }
    },
    [conversation, selectedId],
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
