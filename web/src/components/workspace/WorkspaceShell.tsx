"use client";

import {
  buildSyntheticJobContext,
  getJobContextForConversation,
  getMessagesForConversation,
  type Conversation,
  type WorkspaceMessage,
  workspaceConversations,
} from "@/data/workspaceChatMock";
import { NOJO_WORKSPACE_AGENTS } from "@/data/nojoWorkspaceRoster";
import { canonicalizeNojoAgentIdForClient } from "@/lib/nojo/agentIdentityMap";
import type { NovaContentQaPayload } from "@/lib/nojo/nojoScaffoldQaTypes";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { AgentIdentityProvider, useAgentIdentity } from "./AgentIdentityContext";
import { ChatComposer } from "./ChatComposer";
import { ConversationList } from "./ConversationList";
import { CreateRoomDialog } from "./CreateRoomDialog";
import { JobContextPanel } from "./JobContextPanel";
import { MessageFeed } from "./MessageFeed";
import { ThreadParticipantStrip } from "./ThreadParticipantStrip";
import { RecentRunsList, type RecentRun } from "./RecentRunsList";

type OpenClawSseEvent =
  | { type: "ready"; sessionKey: string }
  | {
      type: "history";
      entries: Array<{
        role: "user" | "assistant";
        text: string;
        idempotencyKey?: string;
      }>;
    }
  | { type: "delta"; runId: string; text: string }
  | { type: "final"; runId: string; text: string; stopReason?: string }
  | { type: "aborted"; runId: string; text?: string }
  | {
      type: "status";
      phase: string;
      detail?: string;
      requestedAgentId?: string;
      effectiveAgentId?: string;
      matchedNojoAgent?: boolean;
      matchedLegacyAlias?: boolean;
      legacyAliasUsed?: string;
      identityScaffoldChecked?: boolean;
      identityScaffoldSeeded?: boolean;
      identityScaffoldSeedFiles?: string[];
      identityScaffoldAgentId?: string;
      scaffoldSkippedBecauseFilesExist?: boolean;
      identityScaffoldRuntimeWorkspace?: string;
      identityScaffoldConfiguredAgentsRoot?: string;
      identityScaffoldTemplateRootResolved?: string;
      identityScaffoldFileReports?: Array<{ fileName: string; outcome: string; detail?: string }>;
      identityScaffoldRuntimeFileSnapshot?: Record<
        string,
        { exists: boolean; byteLength: number; sha256: string }
      >;
      identityScaffoldRuntimeIdentityFingerprint?: string;
      identityScaffoldGenericFallbackRisk?: boolean;
      preExistingNonEmptyFiles?: string[];
      novaContentQa?: NovaContentQaPayload;
    }
  | { type: "error"; message: string; code?: string; runId?: string };

export function WorkspaceShell() {
  return (
    <AgentIdentityProvider baseRoster={NOJO_WORKSPACE_AGENTS}>
      <WorkspaceShellInner />
    </AgentIdentityProvider>
  );
}

function WorkspaceShellInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const conversationFromUrl = searchParams.get("conversation")?.trim() ?? "";
  const defaultId = workspaceConversations[0]?.id ?? null;
  const [selectedId, setSelectedId] = useState<string | null>(defaultId);
  const [apiConversations, setApiConversations] = useState<Conversation[]>([]);
  const [conversationsFetched, setConversationsFetched] = useState(false);
  const [createRoomOpen, setCreateRoomOpen] = useState(false);
  const [createRoomMode, setCreateRoomMode] = useState<"chat" | "job_room">("chat");
  const [leftOpen, setLeftOpen] = useState(false);
  const [rightOpen, setRightOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [localMessagesByConversationId, setLocalMessagesByConversationId] = useState<
    Record<string, WorkspaceMessage[]>
  >({});
  const localMessagesByConversationIdRef = useRef(localMessagesByConversationId);
  const [openClawMessagesByConversationId, setOpenClawMessagesByConversationId] = useState<
    Record<string, WorkspaceMessage[]>
  >({});
  const [streamAssistant, setStreamAssistant] = useState<{
    conversationId: string;
    runId: string;
    text: string;
    sequence: number;
  } | null>(null);
  /** True after a successful send until the first SSE delta (or terminal stream event). */
  const [assistantPendingAfterSend, setAssistantPendingAfterSend] = useState(false);
  const [recentRuns, setRecentRuns] = useState<RecentRun[]>([]);
  const eventSourceRef = useRef<EventSource | null>(null);

  const chatScrollRef = useRef<HTMLDivElement | null>(null);
  const bottomAnchorRef = useRef<HTMLDivElement | null>(null);
  const stickToBottomRef = useRef(true);
  const scrollBehaviorRef = useRef<ScrollBehavior>("auto");

  const sequenceCounterRef = useRef<number>(0);
  const runSequenceByIdRef = useRef<Map<string, number>>(new Map());

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

  /** User-created rooms first (newest from API), then demo seed threads. */
  const mergedConversations = useMemo(() => {
    const seed = workspaceConversations;
    const apiIds = new Set(apiConversations.map((c) => c.id));
    const seedOnly = seed.filter((c) => !apiIds.has(c.id));
    return [...apiConversations, ...seedOnly];
  }, [apiConversations]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/workspace/conversations");
        if (cancelled) return;
        if (res.status === 401) {
          setApiConversations([]);
          return;
        }
        const json = (await res.json()) as {
          success?: boolean;
          conversations?: Conversation[];
        };
        if (res.ok && json?.success && Array.isArray(json.conversations)) {
          setApiConversations(json.conversations);
        }
      } catch {
        // ignore — seed threads still work offline
      } finally {
        if (!cancelled) setConversationsFetched(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!conversationsFetched) return;
    const raw = conversationFromUrl;
    if (!raw) return;
    const found = mergedConversations.some((c) => c.id === raw);
    if (found) {
      setSelectedId(raw);
    } else {
      setSelectedId(defaultId);
      router.replace("/workspace", { scroll: false });
    }
  }, [conversationsFetched, conversationFromUrl, mergedConversations, router, defaultId]);

  function uid() {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
      return crypto.randomUUID();
    }
    return `m_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  }

  function formatNowTime() {
    return new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }

  function nextSequence() {
    if (selectedId) {
      const baseLen = getMessagesForConversation(selectedId)?.length ?? 0;
      if (sequenceCounterRef.current < baseLen) sequenceCounterRef.current = baseLen;
    }
    const n = sequenceCounterRef.current;
    sequenceCounterRef.current += 1;
    return n;
  }

  const conversation = useMemo(
    () =>
      selectedId ? mergedConversations.find((c) => c.id === selectedId) ?? null : null,
    [selectedId, mergedConversations],
  );

  const { getAgent } = useAgentIdentity();

  const conversationForUi = useMemo(() => {
    if (!conversation) return null;
    return {
      ...conversation,
      agents: conversation.agents.map((a) => getAgent(a.id) ?? a),
    };
  }, [conversation, getAgent]);

  // Keep ref in sync for SSE history reconciliation without re-subscribing.
  useEffect(() => {
    localMessagesByConversationIdRef.current = localMessagesByConversationId;
  }, [localMessagesByConversationId]);

  // Ensure our monotonic sequence counter starts after:
  // - the base (mock) conversation messages
  // - the max sequence already stored in state for this conversation
  useEffect(() => {
    if (!selectedId) return;
    const baseLen = getMessagesForConversation(selectedId)?.length ?? 0;
    const localSeqs =
      localMessagesByConversationId[selectedId]?.map((m) =>
        typeof m.sequence === "number" ? m.sequence : undefined,
      ) ?? [];
    const openClawSeqs =
      openClawMessagesByConversationId[selectedId]?.map((m) =>
        typeof m.sequence === "number" ? m.sequence : undefined,
      ) ?? [];
    const maxSeq = Math.max(
      -Infinity,
      ...localSeqs.filter((x): x is number => typeof x === "number"),
      ...openClawSeqs.filter((x): x is number => typeof x === "number"),
    );

    const minStart = Math.max(baseLen, Number.isFinite(maxSeq) ? maxSeq + 1 : baseLen);
    if (sequenceCounterRef.current < minStart) sequenceCounterRef.current = minStart;
  }, [selectedId, localMessagesByConversationId, openClawMessagesByConversationId]);

  const messages = useMemo(() => {
    if (!selectedId) return [];

    const baseMessages = getMessagesForConversation(selectedId).map((m, i) => ({
      ...m,
      // Base messages are mock data; give them deterministic ordering indexes
      // so sorting is stable even before we add real sequences.
      sequence: typeof m.sequence === "number" ? m.sequence : i,
    }));

    const streamExtra: WorkspaceMessage[] =
      streamAssistant && streamAssistant.conversationId === selectedId
        ? [
            {
              id: `oc_stream_${streamAssistant.runId}`,
              type: "agent",
              createdAt: "Live",
              agentId: conversation?.primaryAgentId ?? "agent",
              body: streamAssistant.text,
              agentStatus: "Working",
              sequence: streamAssistant.sequence,
            },
          ]
        : [];

    const merged: WorkspaceMessage[] = [
      ...baseMessages,
      ...(openClawMessagesByConversationId[selectedId] ?? []),
      ...(localMessagesByConversationId[selectedId] ?? []),
      ...streamExtra,
    ];

    // Strictly order by the monotonic sequence. Fall back to array position
    // (stable for a given render) so we never get non-deterministic sorting.
    return merged
      .map((m, idx) => ({
        m,
        seq: typeof m.sequence === "number" ? m.sequence : Number.MAX_SAFE_INTEGER,
        idx,
      }))
      .sort((a, b) => a.seq - b.seq || a.idx - b.idx)
      .map((x) => x.m);
  }, [
    selectedId,
    localMessagesByConversationId,
    openClawMessagesByConversationId,
    streamAssistant,
    conversation?.primaryAgentId,
  ]);

  useEffect(() => {
    setStreamAssistant(null);
    setAssistantPendingAfterSend(false);
    runSequenceByIdRef.current.clear();
    stickToBottomRef.current = true;
    scrollBehaviorRef.current = "auto";
  }, [selectedId]);

  useEffect(() => {
    const el = chatScrollRef.current;
    if (!el) return;
    const thresholdPx = 88;
    const onScroll = () => {
      const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
      stickToBottomRef.current = distance <= thresholdPx;
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [selectedId]);

  useLayoutEffect(() => {
    if (!stickToBottomRef.current) return;
    const behavior = scrollBehaviorRef.current;
    scrollBehaviorRef.current = "auto";
    bottomAnchorRef.current?.scrollIntoView({ block: "end", behavior });
  }, [
    messages,
    streamAssistant,
    assistantPendingAfterSend,
    submitting,
    selectedId,
  ]);

  useEffect(() => {
    eventSourceRef.current?.close();
    eventSourceRef.current = null;

    if (!conversation) return;

    const canonicalAgentId = canonicalizeNojoAgentIdForClient(conversation.primaryAgentId);
    const params = new URLSearchParams({
      conversationId: conversation.id,
      agentId: canonicalAgentId,
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
      const agentId = canonicalAgentId;
      const t = formatNowTime();

      if (data.type === "history" && Array.isArray(data.entries)) {
        console.info("[openclaw-qa][stream.history]", {
          conversationId: cid,
          primaryAgentId: conversation.primaryAgentId,
          canonicalAgentId: agentId,
          entryCount: data.entries.length,
          assistantPreviews: data.entries
            .filter((e) => e.role === "assistant")
            .map((e) => e.text.slice(0, 160)),
        });

        const localMsgs = localMessagesByConversationIdRef.current[cid] ?? [];
        const optimisticUserKeys = new Set(
          localMsgs
            .filter((m): m is Extract<WorkspaceMessage, { type: "user" }> => m.type === "user")
            .map((m) => m.idempotencyKey)
            .filter((k): k is string => typeof k === "string" && k.length > 0),
        );

        const mapped = data.entries
          .map((e, i) => {
            if (
              e.role === "user" &&
              e.idempotencyKey &&
              optimisticUserKeys.has(e.idempotencyKey)
            ) {
              // Preserve optimistic timeline position by skipping echoed user entries
              // in OpenClaw history (assistant/system entries still render).
              return null;
            }

            if (e.role === "user") {
              return {
                id: `oc_hist_u_${cid}_${i}`,
                type: "user" as const,
                createdAt: t,
                body: e.text,
                sequence: nextSequence(),
                idempotencyKey: e.idempotencyKey,
              };
            }

            return {
              id: `oc_hist_a_${cid}_${i}`,
              type: "agent" as const,
              createdAt: t,
              agentId,
              body: e.text,
              sequence: nextSequence(),
            };
          })
          .filter((x) => x !== null) as WorkspaceMessage[];

        setOpenClawMessagesByConversationId((prev) => ({ ...prev, [cid]: mapped }));
        return;
      }

      if (data.type === "delta") {
        const rid = data.runId;
        let seq = runSequenceByIdRef.current.get(rid);
        if (typeof seq !== "number") {
          seq = nextSequence();
          runSequenceByIdRef.current.set(rid, seq);
        }

        setAssistantPendingAfterSend(false);
        setStreamAssistant({ conversationId: cid, runId: rid, text: data.text, sequence: seq });
        return;
      }

      if (data.type === "final") {
        setAssistantPendingAfterSend(false);
        setStreamAssistant(null);
        const rid = data.runId;
        console.info("[openclaw-qa][stream.live]", {
          conversationId: cid,
          primaryAgentId: conversation.primaryAgentId,
          runId: rid,
          source: "gateway_final",
          textPreview: data.text.slice(0, 160),
        });
        let seq = runSequenceByIdRef.current.get(rid);
        if (typeof seq !== "number") {
          seq = nextSequence();
          runSequenceByIdRef.current.set(rid, seq);
        }
        const agentMsg: WorkspaceMessage = {
          id: `oc_final_${rid}`,
          type: "agent",
          createdAt: t,
          agentId,
          body: data.text,
          agentStatus: "Completed",
          sequence: seq,
        };
        runSequenceByIdRef.current.delete(rid);
        setOpenClawMessagesByConversationId((prev) => ({
          ...prev,
          [cid]: [...(prev[cid] ?? []), agentMsg],
        }));
        return;
      }

      if (data.type === "aborted") {
        setAssistantPendingAfterSend(false);
        setStreamAssistant(null);
        const rid = data.runId;
        let seq = runSequenceByIdRef.current.get(rid);
        if (typeof seq !== "number") {
          seq = nextSequence();
          runSequenceByIdRef.current.set(rid, seq);
        }
        const sys: WorkspaceMessage = {
          id: `oc_abort_${rid}`,
          type: "system",
          createdAt: t,
          body: data.text?.trim()
            ? `OpenClaw run aborted · ${data.text.trim()}`
            : "OpenClaw run aborted.",
          sequence: seq,
        };
        runSequenceByIdRef.current.delete(rid);
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

        // If we hit an error, stop rendering the streamed "Live" placeholder.
        setAssistantPendingAfterSend(false);
        setStreamAssistant(null);

        const rid = typeof data.runId === "string" ? data.runId : undefined;
        const seq =
          rid && rid.length > 0
            ? runSequenceByIdRef.current.get(rid) ?? nextSequence()
            : nextSequence();

        const sys: WorkspaceMessage = {
          id: uid(),
          type: "system",
          createdAt: t,
          body: `OpenClaw error${data.code ? ` (${data.code})` : ""}: ${data.message}`,
          sequence: seq,
        };
        if (rid) runSequenceByIdRef.current.delete(rid);
        setOpenClawMessagesByConversationId((prev) => ({
          ...prev,
          [cid]: [...(prev[cid] ?? []), sys],
        }));
        return;
      }

      if (data.type === "status") {
        if (data.phase === "identity_scaffold") {
          console.info("[openclaw-qa][stream.identity]", {
            conversationId: cid,
            primaryAgentId: conversation.primaryAgentId,
            requestedAgentId: data.requestedAgentId,
            effectiveAgentId: data.effectiveAgentId,
            matchedNojoAgent: data.matchedNojoAgent,
            matchedLegacyAlias: data.matchedLegacyAlias,
            legacyAliasUsed: data.legacyAliasUsed,
            identityScaffoldChecked: data.identityScaffoldChecked,
            identityScaffoldSeeded: data.identityScaffoldSeeded,
            identityScaffoldSeedFiles: data.identityScaffoldSeedFiles,
            identityScaffoldAgentId: data.identityScaffoldAgentId,
            scaffoldSkippedBecauseFilesExist: data.scaffoldSkippedBecauseFilesExist,
            identityScaffoldRuntimeWorkspace: data.identityScaffoldRuntimeWorkspace,
            identityScaffoldConfiguredAgentsRoot: data.identityScaffoldConfiguredAgentsRoot,
            identityScaffoldTemplateRootResolved: data.identityScaffoldTemplateRootResolved,
            identityScaffoldFileReports: data.identityScaffoldFileReports,
            identityScaffoldRuntimeFileSnapshot: data.identityScaffoldRuntimeFileSnapshot,
            identityScaffoldRuntimeIdentityFingerprint: data.identityScaffoldRuntimeIdentityFingerprint,
            identityScaffoldGenericFallbackRisk: data.identityScaffoldGenericFallbackRisk,
            preExistingNonEmptyFiles: data.preExistingNonEmptyFiles,
            novaContentQa: data.novaContentQa,
          });
        }
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
  const jobContext = useMemo(() => {
    if (!selectedId || !conversation) return null;
    return (
      getJobContextForConversation(selectedId) ?? buildSyntheticJobContext(conversation)
    );
  }, [selectedId, conversation]);

  const handleRoomCreated = useCallback(
    (c: Conversation) => {
      setApiConversations((prev) => [c, ...prev]);
      setSelectedId(c.id);
      setLeftOpen(false);
      router.replace(`/workspace?conversation=${encodeURIComponent(c.id)}`, { scroll: false });
    },
    [router],
  );

  const select = useCallback(
    (id: string) => {
      setSelectedId(id);
      setLeftOpen(false);
      router.replace(`/workspace?conversation=${encodeURIComponent(id)}`, { scroll: false });
    },
    [router],
  );

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

      const priorCount = (localMessagesByConversationId[selectedId] ?? []).length;
      const isFirstUserMessage = priorCount === 0;

      const idempotencyKey =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `nojo_${Date.now()}_${Math.random().toString(16).slice(2)}`;
      const canonicalAgentId = canonicalizeNojoAgentIdForClient(conversation.primaryAgentId);

      const createdAt = formatNowTime();
      const sequence = nextSequence();
      const userMsg: WorkspaceMessage = {
        id: uid(),
        type: "user",
        createdAt,
        body: trimmed,
        sequence,
        idempotencyKey,
      };

      setLocalMessagesByConversationId((prev) => ({
        ...prev,
        [selectedId]: [...(prev[selectedId] ?? []), userMsg],
      }));

      stickToBottomRef.current = true;
      scrollBehaviorRef.current = "smooth";

      setSubmitting(true);
      try {
        const res = await fetch("/api/openclaw/chat/send", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            prompt: trimmed,
            agentId: canonicalAgentId,
            conversationId: conversation.id,
            idempotencyKey,
            isFirstUserMessage,
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
          isFirstUserMessage?: boolean;
          firstTurnIdentityFallbackApplied?: boolean;
          requestedAgentId?: string;
          effectiveAgentId?: string;
          matchedNojoAgent?: boolean;
          matchedLegacyAlias?: boolean;
          legacyAliasUsed?: string;
          identityScaffoldChecked?: boolean;
          identityScaffoldSeeded?: boolean;
          identityScaffoldSeedFiles?: string[];
          identityScaffoldAgentId?: string;
          scaffoldSkippedBecauseFilesExist?: boolean;
          identityScaffoldRuntimeWorkspace?: string;
          identityScaffoldConfiguredAgentsRoot?: string;
          identityScaffoldTemplateRootResolved?: string;
          identityScaffoldFileReports?: Array<{ fileName: string; outcome: string; detail?: string }>;
          identityScaffoldRuntimeFileSnapshot?: Record<
            string,
            { exists: boolean; byteLength: number; sha256: string }
          >;
          identityScaffoldRuntimeIdentityFingerprint?: string;
          identityScaffoldGenericFallbackRisk?: boolean;
          preExistingNonEmptyFiles?: string[];
          novaContentQa?: NovaContentQaPayload;
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
            sequence: nextSequence(),
          };
          setLocalMessagesByConversationId((prev) => ({
            ...prev,
            [selectedId]: [...(prev[selectedId] ?? []), sysMsg],
          }));

          setToast(`OpenClaw chat failed: ${detailsMessage}`);
          throw new Error(detailsMessage);
        }

        console.info("[openclaw-qa][send.identity]", {
          conversationId: conversation.id,
          primaryAgentId: conversation.primaryAgentId,
          isFirstUserMessage,
          firstTurnIdentityFallbackApplied: json.firstTurnIdentityFallbackApplied,
          requestedAgentId: json.requestedAgentId,
          effectiveAgentId: json.effectiveAgentId,
          matchedNojoAgent: json.matchedNojoAgent,
          matchedLegacyAlias: json.matchedLegacyAlias,
          legacyAliasUsed: json.legacyAliasUsed,
          identityScaffoldChecked: json.identityScaffoldChecked,
          identityScaffoldSeeded: json.identityScaffoldSeeded,
          identityScaffoldSeedFiles: json.identityScaffoldSeedFiles,
          identityScaffoldAgentId: json.identityScaffoldAgentId,
          scaffoldSkippedBecauseFilesExist: json.scaffoldSkippedBecauseFilesExist,
          identityScaffoldRuntimeWorkspace: json.identityScaffoldRuntimeWorkspace,
          identityScaffoldConfiguredAgentsRoot: json.identityScaffoldConfiguredAgentsRoot,
          identityScaffoldTemplateRootResolved: json.identityScaffoldTemplateRootResolved,
          identityScaffoldFileReports: json.identityScaffoldFileReports,
          identityScaffoldRuntimeFileSnapshot: json.identityScaffoldRuntimeFileSnapshot,
          identityScaffoldRuntimeIdentityFingerprint: json.identityScaffoldRuntimeIdentityFingerprint,
          identityScaffoldGenericFallbackRisk: json.identityScaffoldGenericFallbackRisk,
          preExistingNonEmptyFiles: json.preExistingNonEmptyFiles,
          novaContentQa: json.novaContentQa,
        });

        setAssistantPendingAfterSend(true);
        setToast("Sent to OpenClaw");
      } catch (err) {
        throw err;
      } finally {
        setSubmitting(false);
      }
    },
    [conversation, selectedId, localMessagesByConversationId],
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
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
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

      <div className="grid h-full min-h-0 flex-1 grid-cols-1 items-stretch lg:grid-cols-[280px_1fr_320px]">
        {/* Left: desktop */}
        <div className="hidden h-full min-h-0 overflow-hidden rounded-2xl border border-neutral-200/80 bg-white/50 shadow-sm dark:border-slate-800 dark:bg-slate-900/30 lg:flex lg:flex-col">
          <div className="min-h-0 flex-1 overflow-hidden">
            <ConversationList
              conversations={mergedConversations}
              selectedId={selectedId}
              onSelect={select}
              onNewChat={() => {
                setCreateRoomMode("chat");
                setCreateRoomOpen(true);
              }}
              onNewJobRoom={() => {
                setCreateRoomMode("job_room");
                setCreateRoomOpen(true);
              }}
            />
          </div>
          <div className="max-h-[280px] min-h-0 shrink-0 overflow-hidden border-t border-neutral-200/80 dark:border-slate-800">
            <RecentRunsList runs={recentRuns} onRefresh={fetchRecentRuns} />
          </div>
        </div>

        {/* Center chat */}
        <div className="flex h-full min-h-0 min-w-0 flex-col border-neutral-200/80 bg-white/40 dark:border-slate-800 dark:bg-slate-950/20 lg:border-x">
          {conversation ? (
            <ThreadParticipantStrip
              agents={conversationForUi?.agents ?? conversation.agents}
              primaryAgentId={conversation.primaryAgentId}
            />
          ) : null}
          <div ref={chatScrollRef} className="min-h-0 flex-1 overflow-y-auto">
            {conversation ? (
              <MessageFeed
                messages={messages}
                bottomAnchorRef={bottomAnchorRef}
                showAgentTypingRow={
                  (submitting || assistantPendingAfterSend) &&
                  !(
                    streamAssistant &&
                    streamAssistant.conversationId === conversation.id
                  )
                }
                typingAgentId={conversation.primaryAgentId}
              />
            ) : (
              <p className="p-8 text-center text-sm text-slate-500 dark:text-neutral-400">
                Choose a conversation from Inbox.
              </p>
            )}
          </div>
          {conversation ? (
            <ChatComposer
              agents={conversationForUi?.agents ?? conversation.agents}
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
        <div className="hidden h-full min-h-0 overflow-hidden rounded-2xl border border-neutral-200/80 bg-white/50 shadow-sm dark:border-slate-800 dark:bg-slate-900/30 lg:block">
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
                conversations={mergedConversations}
                selectedId={selectedId}
                onSelect={select}
                onNewChat={() => {
                  setCreateRoomMode("chat");
                  setCreateRoomOpen(true);
                  setLeftOpen(false);
                }}
                onNewJobRoom={() => {
                  setCreateRoomMode("job_room");
                  setCreateRoomOpen(true);
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

      <CreateRoomDialog
        open={createRoomOpen}
        onOpenChange={setCreateRoomOpen}
        onCreated={handleRoomCreated}
        mode={createRoomMode}
      />
    </div>
  );
}
