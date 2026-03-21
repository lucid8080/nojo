"use client";

import { AvatarBubble } from "@/components/avatar/AvatarBubble";
import { NOJO_WORKSPACE_AGENTS } from "@/data/nojoWorkspaceRoster";
import { getAgentAvatarUrl } from "@/lib/agentAvatars";
import { useHydratedTeamAgents } from "@/lib/nojo/useHydratedTeamAgents";
import type { OperationalScheduledJob } from "@/lib/openclaw/openClawCronTypes";
import {
  groupOperationalJobsByDayKey,
  localDayKey,
} from "@/lib/scheduling/scheduleCalendarUtils";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

function userFriendlyScheduleError(raw: string): string {
  const m = raw.trim().toLowerCase();
  if (!m) return "Something went wrong. Please try again.";
  if (m.includes("unauthorized") || m.includes("sign in")) {
    return "Sign in to see your scheduled jobs.";
  }
  if (m.includes("gateway") && m.includes("unavailable")) {
    return "We couldn’t load schedules right now. Try again in a moment.";
  }
  if (m.includes("no openclaw cron jobs file") || m.includes("cron jobs file found")) {
    return "No schedule data is available yet.";
  }
  if (m.includes("network") || m.includes("fetch")) {
    return "Couldn’t connect. Check your network and try again.";
  }
  return "Something went wrong loading schedules. Please try again.";
}

function formatLastUpdated(d: Date): string {
  return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

function agentInitials(name: string): string {
  const parts = name.replace(/ Agent$/i, "").split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function formatWhen(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function ScheduleJobRow({
  job,
  resolveAgentLabel,
}: {
  job: OperationalScheduledJob;
  resolveAgentLabel: (agentId: string | null) => string;
}) {
  const label = resolveAgentLabel(job.targetAgentId);
  const src = useMemo(
    () => getAgentAvatarUrl(label, { withDefault: true }),
    [label],
  );

  return (
    <div className="flex gap-4 rounded-xl border border-neutral-100/90 bg-neutral-50/70 p-4 shadow-sm dark:border-slate-700/60 dark:bg-slate-800/50 dark:shadow-black/10">
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <p className="min-w-0 text-sm font-semibold leading-snug text-slate-900 dark:text-neutral-100">
            {job.name}
          </p>
          <span
            className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
              job.enabled
                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200"
                : "bg-neutral-200 text-neutral-600 dark:bg-slate-700 dark:text-neutral-400"
            }`}
          >
            {job.enabled ? "enabled" : "disabled"}
          </span>
          {job.calendarPartial ? (
            <span className="text-[10px] font-medium text-amber-700 dark:text-amber-300">
              Limited preview
            </span>
          ) : null}
        </div>

        <p className="font-mono text-xs text-slate-700 dark:text-neutral-300">{job.scheduleDisplay}</p>

        <p className="text-xs text-slate-600 dark:text-neutral-400">{job.summary}</p>

        <dl className="grid grid-cols-1 gap-x-4 gap-y-1 text-[11px] text-slate-500 dark:text-neutral-500 sm:grid-cols-2">
          <div>
            <dt className="font-medium text-slate-400 dark:text-neutral-600">Next run</dt>
            <dd>{formatWhen(job.nextRunAt)}</dd>
          </div>
          <div>
            <dt className="font-medium text-slate-400 dark:text-neutral-600">Last run</dt>
            <dd>{formatWhen(job.lastRunAt)}</dd>
          </div>
          <div>
            <dt className="font-medium text-slate-400 dark:text-neutral-600">Session</dt>
            <dd className="truncate">{job.sessionTarget ?? "—"}</dd>
          </div>
          <div>
            <dt className="font-medium text-slate-400 dark:text-neutral-600">Wake</dt>
            <dd>{job.wakeMode ?? "—"}</dd>
          </div>
        </dl>

        {job.deliverySummary ? (
          <p className="text-[11px] text-slate-500 dark:text-neutral-500">
            <span className="font-medium text-slate-400 dark:text-neutral-600">Delivery: </span>
            {job.deliverySummary}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-md bg-white/80 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600 ring-1 ring-neutral-200/80 dark:bg-slate-900/60 dark:text-neutral-400 dark:ring-slate-600/80">
            <AvatarBubble
              label={agentInitials(label)}
              src={src}
              size={18}
              className="ring-1 ring-white/80 dark:ring-slate-900/80"
            />
            <span className="font-normal normal-case tracking-normal text-slate-500 dark:text-neutral-500">
              {job.targetAgentId ? label : "Default agent"}
            </span>
          </span>
          <span className="text-[10px] text-slate-400 dark:text-neutral-600">
            {job.scheduleKind === "one_time"
              ? "One-time"
              : job.scheduleKind === "interval"
                ? "Interval"
                : job.scheduleKind === "recurring"
                  ? "Recurring"
                  : "Schedule"}
          </span>
        </div>

        {job.warnings.length > 0 ? (
          <ul className="list-inside list-disc text-[10px] text-amber-800 dark:text-amber-200/90">
            {job.warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}

function monthLabel(year: number, monthIndex: number): string {
  return new Date(year, monthIndex, 1).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
}

/** 6-row grid starting Sunday of the week that contains the 1st */
function buildMonthGridCells(year: number, monthIndex: number): {
  date: Date;
  inMonth: boolean;
}[] {
  const first = new Date(year, monthIndex, 1);
  const start = new Date(year, monthIndex, 1 - first.getDay());
  const cells: { date: Date; inMonth: boolean }[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    cells.push({
      date: d,
      inMonth: d.getMonth() === monthIndex,
    });
  }
  return cells;
}

type CronJobsApiOk = {
  success: true;
  /** Canonical: live gateway API. Mirror: local JSON when gateway failed. */
  cronDataSource?: "openclaw_gateway" | "disk_mirror";
  /** Gateway URL or filesystem path, depending on source. */
  sourceDetail?: string;
  /** @deprecated Prefer sourceDetail; kept for older responses. */
  sourcePath?: string;
  jobs: OperationalScheduledJob[];
  warnings: string[];
  year: number;
  monthIndex: number;
};

type CronJobsApiErr = {
  success: false;
  message: string;
  cronDataSource?: "openclaw_gateway" | "disk_mirror";
  sourceDetail?: string;
  sourcePath?: string;
  jobs?: OperationalScheduledJob[];
  warnings?: string[];
  year?: number;
  monthIndex?: number;
};

export function AgentScheduleCalendar() {
  const searchParams = useSearchParams();
  const diagnostics = useMemo(
    () =>
      process.env.NEXT_PUBLIC_NOJO_SCHEDULES_DEBUG === "true" ||
      searchParams.get("schedulesDebug") === "1" ||
      searchParams.get("debug") === "schedules",
    [searchParams],
  );

  const today = useMemo(() => new Date(), []);
  const [year, setYear] = useState(today.getFullYear());
  const [monthIndex, setMonthIndex] = useState(today.getMonth());
  const [selectedKey, setSelectedKey] = useState<string | null>(() => localDayKey(today));
  const [jobs, setJobs] = useState<OperationalScheduledJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorDetail, setErrorDetail] = useState<string | null>(null);
  const [lastFetchedAt, setLastFetchedAt] = useState<Date | null>(null);
  const [sourcePath, setSourcePath] = useState<string | null>(null);
  const [cronDataSource, setCronDataSource] = useState<
    "openclaw_gateway" | "disk_mirror" | null
  >(null);
  const [globalWarnings, setGlobalWarnings] = useState<string[]>([]);

  const teamAgents = useHydratedTeamAgents(NOJO_WORKSPACE_AGENTS);
  const resolveAgentLabel = useCallback(
    (agentId: string | null) => {
      if (!agentId) return "Agent";
      return teamAgents.find((a) => a.id === agentId)?.name ?? agentId;
    },
    [teamAgents],
  );

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    setError(null);
    setErrorDetail(null);
    try {
      const res = await fetch(
        `/api/openclaw/cron-jobs?year=${year}&month=${monthIndex}`,
        { cache: "no-store" },
      );
      if (res.status === 401) {
        setError("Sign in to see your scheduled jobs.");
        setJobs([]);
        setSourcePath(null);
        setCronDataSource(null);
        setGlobalWarnings([]);
        setLastFetchedAt(null);
        return;
      }
      const json = (await res.json()) as CronJobsApiOk | CronJobsApiErr;
      const detail =
        typeof json.sourceDetail === "string" && json.sourceDetail.trim() !== ""
          ? json.sourceDetail
          : typeof json.sourcePath === "string"
            ? json.sourcePath
            : null;
      setSourcePath(detail);
      setCronDataSource(
        json.cronDataSource === "openclaw_gateway" || json.cronDataSource === "disk_mirror"
          ? json.cronDataSource
          : null,
      );
      setGlobalWarnings(Array.isArray(json.warnings) ? json.warnings : []);
      if (!json.success) {
        const raw = json.message ?? "";
        setErrorDetail(raw.trim() ? raw : null);
        setError(userFriendlyScheduleError(raw));
        setJobs([]);
        setLastFetchedAt(null);
        return;
      }
      setJobs(Array.isArray(json.jobs) ? json.jobs : []);
      setError(null);
      setErrorDetail(null);
      setLastFetchedAt(new Date());
    } catch {
      setErrorDetail("Network error");
      setError("Couldn’t connect. Check your network and try again.");
      setJobs([]);
      setLastFetchedAt(null);
    } finally {
      setLoading(false);
    }
  }, [year, monthIndex]);

  useEffect(() => {
    void fetchJobs();
  }, [fetchJobs]);

  useEffect(() => {
    const n = new Date();
    if (n.getFullYear() === year && n.getMonth() === monthIndex) {
      setSelectedKey(localDayKey(n));
    } else {
      setSelectedKey(localDayKey(new Date(year, monthIndex, 1)));
    }
  }, [year, monthIndex]);

  const byDay = useMemo(() => groupOperationalJobsByDayKey(jobs), [jobs]);
  const cells = useMemo(
    () => buildMonthGridCells(year, monthIndex),
    [year, monthIndex],
  );

  const goPrev = useCallback(() => {
    if (monthIndex === 0) {
      setMonthIndex(11);
      setYear((y) => y - 1);
    } else {
      setMonthIndex((m) => m - 1);
    }
  }, [monthIndex]);

  const goNext = useCallback(() => {
    if (monthIndex === 11) {
      setMonthIndex(0);
      setYear((y) => y + 1);
    } else {
      setMonthIndex((m) => m + 1);
    }
  }, [monthIndex]);

  const goToday = useCallback(() => {
    const n = new Date();
    setYear(n.getFullYear());
    setMonthIndex(n.getMonth());
    setSelectedKey(localDayKey(n));
  }, []);

  const selectedJobs: OperationalScheduledJob[] = selectedKey
    ? (byDay.get(selectedKey) ?? [])
    : [];

  const todayKey = localDayKey(today);

  const showOfflineNotice =
    !diagnostics &&
    !loading &&
    !error &&
    cronDataSource === "disk_mirror";

  return (
    <div className="flex flex-col gap-10 xl:flex-row xl:items-start xl:gap-12 2xl:gap-16">
      <div className="min-w-0 flex-1">
        {diagnostics && sourcePath ? (
          <p className="mb-3 text-[11px] text-slate-500 dark:text-neutral-500">
            <span className="font-medium text-slate-600 dark:text-neutral-400">
              {cronDataSource === "openclaw_gateway"
                ? "Source (OpenClaw gateway, canonical): "
                : cronDataSource === "disk_mirror"
                  ? "Source (local mirror, fallback): "
                  : "Source: "}
            </span>
            <code className="break-all rounded bg-neutral-100/90 px-1 py-0.5 text-[10px] dark:bg-slate-800/80">
              {sourcePath}
            </code>
          </p>
        ) : null}

        {diagnostics && globalWarnings.length > 0 ? (
          <ul className="mb-3 list-inside list-disc text-[11px] text-amber-800 dark:text-amber-200/90">
            {globalWarnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        ) : null}

        {showOfflineNotice ? (
          <p className="mb-3 rounded-lg border border-sky-200/80 bg-sky-50/90 px-3 py-2 text-[12px] text-sky-950 dark:border-sky-800/50 dark:bg-sky-950/25 dark:text-sky-100">
            Showing a saved copy of your schedule. Details may refresh when we reconnect.
          </p>
        ) : null}

        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              {monthLabel(year, monthIndex)}
            </h2>
            {lastFetchedAt && !loading ? (
              <p className="mt-1 text-xs text-slate-500 dark:text-neutral-500">
                Last updated {formatLastUpdated(lastFetchedAt)}
              </p>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={goToday}
              className="rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-neutral-50 dark:border-slate-600 dark:bg-slate-800 dark:text-neutral-200 dark:hover:bg-slate-700"
            >
              Today
            </button>
            <button
              type="button"
              onClick={goPrev}
              aria-label="Previous month"
              className="flex size-9 items-center justify-center rounded-full border border-neutral-200 bg-white text-slate-600 shadow-sm transition hover:bg-neutral-50 dark:border-slate-600 dark:bg-slate-800 dark:text-neutral-300 dark:hover:bg-slate-700"
            >
              <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              type="button"
              onClick={goNext}
              aria-label="Next month"
              className="flex size-9 items-center justify-center rounded-full border border-neutral-200 bg-white text-slate-600 shadow-sm transition hover:bg-neutral-50 dark:border-slate-600 dark:bg-slate-800 dark:text-neutral-300 dark:hover:bg-slate-700"
            >
              <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-slate-500 dark:text-neutral-400">Loading schedules…</p>
        ) : null}
        {error ? (
          <div className="mb-4 rounded-lg border border-amber-200/80 bg-amber-50/90 px-4 py-3 text-sm text-amber-950 dark:border-amber-800/60 dark:bg-amber-950/30 dark:text-amber-100">
            <p>{error}</p>
            {diagnostics && errorDetail ? (
              <pre className="mt-2 max-h-32 overflow-auto whitespace-pre-wrap break-all rounded bg-amber-100/80 p-2 text-[10px] text-amber-950 dark:bg-amber-900/40 dark:text-amber-50">
                {errorDetail}
              </pre>
            ) : null}
          </div>
        ) : null}

        <div
          className="overflow-hidden rounded-2xl border border-neutral-200/90 bg-white/90 shadow-lg shadow-slate-900/5 dark:border-slate-700/90 dark:bg-slate-900/90 dark:shadow-black/20"
          role="grid"
          aria-label="Calendar month"
        >
          <div className="grid grid-cols-7 border-b border-neutral-100 dark:border-slate-700/80">
            {WEEKDAYS.map((wd) => (
              <div
                key={wd}
                className="px-1 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400 sm:py-3.5 sm:text-xs dark:text-neutral-500"
              >
                {wd}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {cells.map(({ date, inMonth }, i) => {
              const key = localDayKey(date);
              const count = byDay.get(key)?.length ?? 0;
              const isSelected = selectedKey === key;
              const isToday = key === todayKey;
              return (
                <button
                  key={`${key}-${i}`}
                  type="button"
                  role="gridcell"
                  onClick={() => setSelectedKey(key)}
                  className={`relative flex min-h-24 flex-col items-start justify-start border-b border-r border-neutral-100 p-2 text-left transition last:border-r-0 sm:min-h-[5.5rem] sm:p-2.5 dark:border-slate-800/80 ${
                    inMonth
                      ? "bg-white/50 hover:bg-sky-50/50 dark:bg-slate-900/40 dark:hover:bg-sky-950/30"
                      : "bg-neutral-50/80 text-slate-300 dark:bg-slate-950/50 dark:text-slate-600"
                  } ${isSelected ? "ring-2 ring-inset ring-sky-500/60 dark:ring-sky-400/50" : ""} ${isToday && inMonth ? "font-semibold" : ""}`}
                >
                  <span
                    className={`text-sm ${inMonth ? "text-slate-800 dark:text-neutral-200" : ""} ${isToday && inMonth ? "text-sky-600 dark:text-sky-400" : ""}`}
                  >
                    {date.getDate()}
                  </span>
                  {count > 0 && inMonth ? (
                    <span className="mt-1 flex items-center gap-0.5" aria-hidden>
                      <span className="flex size-5 items-center justify-center rounded-full bg-sky-100 text-[10px] font-bold text-sky-700 dark:bg-sky-900/50 dark:text-sky-300">
                        {count > 9 ? "9+" : count}
                      </span>
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <aside className="w-full shrink-0 xl:sticky xl:top-28 xl:w-[min(100%,28rem)] xl:self-start 2xl:w-[32rem]">
        <h3 className="mb-4 text-base font-semibold text-slate-700 dark:text-neutral-300">
          {selectedKey
            ? new Date(selectedKey + "T12:00:00").toLocaleDateString(undefined, {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
              })
            : "Select a day"}
        </h3>
        {selectedJobs.length === 0 ? (
          <p className="rounded-xl border border-dashed border-neutral-200 bg-neutral-50/50 px-5 py-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800/30 dark:text-neutral-500">
            {loading
              ? "Loading…"
              : error
                ? "Schedules aren’t available until the issue above is resolved."
                : "No runs scheduled for this day."}
          </p>
        ) : (
          <ul className="flex flex-col gap-4" aria-label="Scheduled jobs for selected day">
            {selectedJobs.map((job) => (
              <li key={job.id}>
                <ScheduleJobRow job={job} resolveAgentLabel={resolveAgentLabel} />
              </li>
            ))}
          </ul>
        )}
      </aside>
    </div>
  );
}
