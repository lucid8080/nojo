"use client";

import { JobCard } from "@/components/dashboard/JobCard";
import type { Job } from "@/data/agentJobsMock";
import {
  getConversation,
  getJobContextForConversation,
  getMessagesForConversation,
  workspaceConversations,
} from "@/data/workspaceChatMock";
import { NOJO_WORKSPACE_AGENTS } from "@/data/nojoWorkspaceRoster";
import { JOB_FOCUS_EVENT, type JobFocusEventDetail } from "@/lib/jobFocusEvent";
import {
  projectWorkspaceConversationToJob,
  type WorkspaceBoardRunRow,
} from "@/lib/nojo/workspaceBoardProjection";
import { useHydratedTeamAgents } from "@/lib/nojo/useHydratedTeamAgents";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const SCROLL_EDGE_PX = 8;
const RUNS_POLL_MS = 45_000;

/** Active workspace threads for the board (non-archived), same order as inbox. */
export const WORKSPACE_BOARD_CONVERSATION_IDS = workspaceConversations
  .filter((c) => !c.archived)
  .map((c) => c.id);

function groupRunsByConversation(runs: WorkspaceBoardRunRow[]): Map<string, WorkspaceBoardRunRow[]> {
  const map = new Map<string, WorkspaceBoardRunRow[]>();
  for (const r of runs) {
    const cid = r.conversationId?.trim();
    if (!cid) continue;
    if (!map.has(cid)) map.set(cid, []);
    map.get(cid)!.push(r);
  }
  return map;
}

export function JobBoard() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const teamAgents = useHydratedTeamAgents(NOJO_WORKSPACE_AGENTS);
  const resolveAgentName = useCallback(
    (agentId: string) => teamAgents.find((a) => a.id === agentId)?.name ?? agentId,
    [teamAgents],
  );

  const [runsByConversation, setRunsByConversation] = useState<
    Map<string, WorkspaceBoardRunRow[]>
  >(() => new Map());
  const [runsFetchOk, setRunsFetchOk] = useState(false);

  const fetchRuns = useCallback(async () => {
    try {
      const res = await fetch("/api/openclaw/runs");
      if (res.status === 401) {
        setRunsFetchOk(false);
        return;
      }
      const json = (await res.json()) as {
        success?: boolean;
        runs?: WorkspaceBoardRunRow[];
      };
      if (res.ok && json?.success && Array.isArray(json.runs)) {
        setRunsByConversation(groupRunsByConversation(json.runs));
        setRunsFetchOk(true);
      } else {
        setRunsFetchOk(false);
      }
    } catch {
      setRunsFetchOk(false);
    }
  }, []);

  useEffect(() => {
    void fetchRuns();
    const id = window.setInterval(() => void fetchRuns(), RUNS_POLL_MS);
    return () => window.clearInterval(id);
  }, [fetchRuns]);

  const jobs = useMemo(() => {
    const m: Record<string, Job> = {};
    for (const id of WORKSPACE_BOARD_CONVERSATION_IDS) {
      const c = getConversation(id);
      if (!c) continue;
      const runs = runsByConversation.get(id) ?? [];
      m[id] = projectWorkspaceConversationToJob(c, {
        jobContext: getJobContextForConversation(id),
        messages: getMessagesForConversation(id),
        runsForConversation: runs,
        resolveAgentName,
      });
    }
    return m;
  }, [resolveAgentName, runsByConversation]);

  const [focusedConversationId, setFocusedConversationId] = useState<string | null>(null);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);
  const reducedMotion = useRef(false);
  const userScrolledRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    reducedMotion.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  useEffect(() => {
    function onJobFocus(e: Event) {
      const detail = (e as CustomEvent<JobFocusEventDetail>).detail;
      const conversationId = detail?.conversationId;
      if (!conversationId) return;

      setFocusedConversationId(conversationId);

      const container = scrollRef.current;
      if (container) {
        const node = container.querySelector<HTMLElement>(
          `[data-job-id="${conversationId}"]`,
        );
        if (node) {
          const nodeLeft = node.offsetLeft;
          const centeredLeft =
            nodeLeft - (container.clientWidth - node.clientWidth) / 2;
          const left = Math.max(0, Math.floor(centeredLeft));
          container.scrollTo({
            left,
            behavior: reducedMotion.current ? "auto" : "smooth",
          });
        }
      }

      window.setTimeout(() => {
        setFocusedConversationId((cur) => (cur === conversationId ? null : cur));
      }, 2300);
    }

    window.addEventListener(JOB_FOCUS_EVENT, onJobFocus as EventListener);
    return () => window.removeEventListener(JOB_FOCUS_EVENT, onJobFocus as EventListener);
  }, []);

  const updateScrollButtons = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    const maxScroll = Math.max(0, scrollWidth - clientWidth);
    setCanScrollPrev(scrollLeft > SCROLL_EDGE_PX);
    setCanScrollNext(scrollLeft < maxScroll - SCROLL_EDGE_PX);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const runInitial = () => {
      if (userScrolledRef.current) return;
      el.scrollLeft = el.scrollWidth - el.clientWidth;
      updateScrollButtons();
    };

    const t = window.setTimeout(runInitial, 50);
    const ro = new ResizeObserver(() => {
      if (!userScrolledRef.current) runInitial();
      else updateScrollButtons();
    });
    ro.observe(el);
    return () => {
      window.clearTimeout(t);
      ro.disconnect();
    };
  }, [updateScrollButtons]);

  const scrollByOneCard = useCallback((direction: -1 | 1) => {
    const el = scrollRef.current;
    if (!el) return;
    userScrolledRef.current = true;
    const firstCard = el.querySelector<HTMLElement>("[data-job-card-slot]");
    const gap =
      typeof window !== "undefined"
        ? Number.parseInt(getComputedStyle(el).gap || "16", 10) || 16
        : 16;
    const w = firstCard?.offsetWidth ?? 340;
    el.scrollBy({
      left: direction * (w + gap),
      behavior: reducedMotion.current ? "instant" : "smooth",
    });
  }, []);

  return (
    <div className="rounded-3xl border border-neutral-200/50 bg-gradient-to-br from-neutral-50/80 via-white/60 to-sky-50/30 p-4 shadow-sm dark:border-slate-700/50 dark:from-slate-900/60 dark:via-slate-900/40 dark:to-slate-900/60 dark:shadow-black/15 sm:p-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-sky-600 dark:text-sky-400">
            Agent workflow
          </p>
          <h2
            id="live-job-stream-heading"
            className="text-lg font-bold text-slate-900 dark:text-white"
          >
            Live job stream
          </h2>
          <p className="text-sm text-slate-600 dark:text-neutral-400">
            Scroll through active Agent Workspace threads; each card mirrors inbox context and
            messages.
            {runsFetchOk ? (
              <span className="ml-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                OpenClaw runs linked
              </span>
            ) : null}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2 sm:pb-0.5">
          <button
            type="button"
            aria-label="Previous active jobs"
            disabled={!canScrollPrev}
            onClick={() => scrollByOneCard(-1)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-neutral-200 bg-white text-slate-700 shadow-sm transition enabled:hover:bg-neutral-50 enabled:hover:text-slate-900 disabled:pointer-events-none disabled:opacity-35 dark:border-slate-600 dark:bg-slate-800 dark:text-neutral-200 enabled:dark:hover:bg-slate-700"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            type="button"
            aria-label="Next active jobs"
            disabled={!canScrollNext}
            onClick={() => scrollByOneCard(1)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-neutral-200 bg-white text-slate-700 shadow-sm transition enabled:hover:bg-neutral-50 enabled:hover:text-slate-900 disabled:pointer-events-none disabled:opacity-35 dark:border-slate-600 dark:bg-slate-800 dark:text-neutral-200 enabled:dark:hover:bg-slate-700"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-2xl">
        <div
          ref={scrollRef}
          role="region"
          aria-labelledby="live-job-stream-heading"
          tabIndex={0}
          onScroll={() => {
            userScrolledRef.current = true;
            updateScrollButtons();
          }}
          className="flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {WORKSPACE_BOARD_CONVERSATION_IDS.map((id) => (
            <div
              key={id}
              data-job-card-slot
              data-job-id={id}
              className="job-slot h-full w-[min(100%,22rem)] shrink-0 snap-start sm:w-[calc((100%-2rem)/3)] lg:min-h-[32rem]"
            >
              <JobCard
                job={jobs[id]!}
                isFocused={focusedConversationId === id}
                workspaceConversationId={id}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
