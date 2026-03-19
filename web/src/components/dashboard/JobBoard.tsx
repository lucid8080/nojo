"use client";

import { JobCard } from "@/components/dashboard/JobCard";
import {
  BOARD_JOB_IDS,
  DEMO_APPEND_LINES,
  cloneJob,
  jobFromSeed,
  type Job,
  type TaskLogEntry,
} from "@/data/agentJobsMock";
import { JOB_FOCUS_EVENT, type JobFocusEventDetail } from "@/lib/jobFocusEvent";
import { useCallback, useEffect, useRef, useState } from "react";

const DEMO_INTERVAL_MS = 2600;
const SCROLL_EDGE_PX = 8;
/** Demo animates the rightmost trio (visible when strip is scrolled to the end). */
const DEMO_FOCUS_IDS: [string, string, string] = ["j6", "j7", "j8"];

function refillDemoAppends(id: string): TaskLogEntry[] {
  return (DEMO_APPEND_LINES[id] ?? []).map((e, i) => ({
    ...e,
    id: `${id}-demo-${i}-${Math.random().toString(36).slice(2, 7)}`,
  }));
}

function initialJobsMap(): Record<string, Job> {
  const m: Record<string, Job> = {};
  for (const id of BOARD_JOB_IDS) {
    m[id] = jobFromSeed(id);
  }
  return m;
}

/**
 * Live agent job board — horizontal strip of all active jobs, scroll + arrows.
 * demoMode: live log appends + progress on the rightmost jobs (j6–j8); no conveyor swap.
 */
export function JobBoard({ demoMode = true }: { demoMode?: boolean }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const jobsRef = useRef<Record<string, Job>>(initialJobsMap());
  const [jobs, setJobs] = useState<Record<string, Job>>(() => initialJobsMap());
  const [newTaskIds, setNewTaskIds] = useState<Set<string>>(new Set());
  const appendPools = useRef<Record<string, TaskLogEntry[]>>({});
  const reducedMotion = useRef(false);
  const userScrolledRef = useRef(false);
  const demoResetScheduled = useRef(false);
  const [focusedJobId, setFocusedJobId] = useState<string | null>(null);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);
  useEffect(() => {
    jobsRef.current = jobs;
  }, [jobs]);

  useEffect(() => {
    for (const id of DEMO_FOCUS_IDS) {
      if (!appendPools.current[id]?.length) {
        appendPools.current[id] = refillDemoAppends(id);
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    reducedMotion.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  useEffect(() => {
    function onJobFocus(e: Event) {
      const detail = (e as CustomEvent<JobFocusEventDetail>).detail;
      const jobId = detail?.jobId;
      if (!jobId) return;

      setFocusedJobId(jobId);

      const container = scrollRef.current;
      if (container) {
        const node = container.querySelector<HTMLElement>(`[data-job-id="${jobId}"]`);
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
        setFocusedJobId((cur) => (cur === jobId ? null : cur));
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

  useEffect(() => {
    if (!demoMode) return;

    const tick = () => {
      const [id0, id1, id2] = DEMO_FOCUS_IDS;

      setJobs((prev) => {
        const next: Record<string, Job> = { ...prev };
        const j0 = cloneJob(prev[id0]!);
        const j1 = cloneJob(prev[id1]!);
        const j2 = cloneJob(prev[id2]!);

        const bump = (j: Job, pct: number): Job => {
          let status = j.status;
          const p = Math.min(100, pct);
          if (p >= 90 && status !== "Queued" && status !== "Blocked" && status !== "Completed") {
            status = "Reviewing";
          }
          if (p >= 100) {
            status = "Completed";
          }
          const foot = { ...j.footer, completionPct: p >= 100 ? 100 : p };
          if (status === "Completed") {
            foot.eta = "Delivered";
          }
          return { ...j, status, footer: foot };
        };

        if (j0.status !== "Completed" && j0.footer.completionPct < 100) {
          const p0 = j0.footer.completionPct;
          next[id0] = bump(j0, p0 + 5);
        } else {
          next[id0] = j0;
        }

        next[id1] = j1;
        next[id2] = j2;

        if (Math.random() > 0.4) {
          const idx = Math.random() < 0.38 ? 0 : Math.random() < 0.5 ? 1 : 2;
          const focusId = DEMO_FOCUS_IDS[idx]!;
          const job = cloneJob(next[focusId]!);
          if (job.status !== "Completed") {
            let pool = appendPools.current[job.id] ?? refillDemoAppends(job.id);
            if (pool.length === 0) pool = refillDemoAppends(job.id);
            appendPools.current[job.id] = pool;
            const [line, ...rest] = pool;
            if (line) {
              appendPools.current[job.id] = rest.length ? rest : refillDemoAppends(job.id);
              const newLine = { ...line, id: `${job.id}-live-${Date.now()}` };
              const tasks = job.tasks.map((t) =>
                t.state === "running" && Math.random() > 0.65 ? { ...t, state: "done" as const } : t,
              );
              next[focusId] = { ...job, tasks: [...tasks, newLine] };
              setNewTaskIds(new Set([newLine.id]));
              window.setTimeout(() => setNewTaskIds(new Set()), 800);
            }
          }
        }

        if (next[id0]!.status === "Completed" && !demoResetScheduled.current) {
          demoResetScheduled.current = true;
          window.setTimeout(() => {
            setJobs((p) => ({
              ...p,
              [id0]: jobFromSeed(id0),
            }));
            appendPools.current[id0] = refillDemoAppends(id0);
            demoResetScheduled.current = false;
          }, 2800);
        }

        jobsRef.current = next;
        return next;
      });
    };

    const id = window.setInterval(tick, DEMO_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [demoMode]);

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
            Use arrows to scroll through active jobs; each card has the full execution log.
            {demoMode ? (
              <span className="ml-1 text-xs font-medium text-sky-600 dark:text-sky-400">Demo</span>
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
          {BOARD_JOB_IDS.map((id) => (
            <div
              key={id}
              data-job-card-slot
              data-job-id={id}
              className="job-slot h-full w-[min(100%,22rem)] shrink-0 snap-start sm:w-[calc((100%-2rem)/3)] lg:min-h-[32rem]"
            >
              <JobCard job={jobs[id]!} newTaskIds={newTaskIds} isFocused={focusedJobId === id} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
