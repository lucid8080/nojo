"use client";

import { AvatarBubble } from "@/components/avatar/AvatarBubble";
import {
  getScheduledTasksForMonth,
  groupTasksByDayKey,
  localDayKey,
  type ScheduledAgentTask,
  type ScheduledAgentTaskState,
} from "@/data/agentScheduledTasksMock";
import { getAgentAvatarUrl } from "@/lib/agentAvatars";
import { useCallback, useMemo, useState, useEffect } from "react";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

function agentInitials(name: string): string {
  const parts = name.replace(/ Agent$/i, "").split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function ScheduleStateIcon({ state }: { state?: ScheduledAgentTaskState }) {
  if (state === "running") {
    return (
      <span
        className="relative flex size-6 shrink-0 items-center justify-center rounded-full bg-sky-100 dark:bg-sky-900/40"
        aria-label="Running"
      >
        <span className="absolute size-3.5 animate-pulse rounded-full bg-sky-500/80 dark:bg-sky-400/80" />
      </span>
    );
  }
  return (
    <span
      className="flex size-6 shrink-0 items-center justify-center rounded-full bg-neutral-200 text-neutral-500 dark:bg-slate-700 dark:text-neutral-400"
      aria-label="Queued"
    >
      <svg className="size-3" fill="currentColor" viewBox="0 0 24 24">
        <path
          d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"
          opacity={0.35}
        />
      </svg>
    </span>
  );
}

function ScheduleTaskRow({ task }: { task: ScheduledAgentTask }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    setSrc(getAgentAvatarUrl(task.agentName, { withDefault: true }));
  }, [task.agentName]);

  const timeStr = useMemo(() => {
    const d = new Date(task.scheduledAt);
    return d.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });
  }, [task.scheduledAt]);

  return (
    <div className="flex gap-4 rounded-xl border border-neutral-100/90 bg-neutral-50/70 p-4 shadow-sm dark:border-slate-700/60 dark:bg-slate-800/50 dark:shadow-black/10">
      <ScheduleStateIcon state={task.state} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium leading-snug text-slate-900 dark:text-neutral-100">
          {task.taskTitle}
        </p>
        <p className="mt-0.5 text-xs text-slate-500 dark:text-neutral-500">
          {task.jobTitle}
        </p>
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-md bg-white/80 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600 ring-1 ring-neutral-200/80 dark:bg-slate-900/60 dark:text-neutral-400 dark:ring-slate-600/80">
            <AvatarBubble
              label={agentInitials(task.agentName)}
              src={src}
              size={18}
              className="ring-1 ring-white/80 dark:ring-slate-900/80"
            />
            <span className="font-normal normal-case tracking-normal text-slate-500 dark:text-neutral-500">
              {task.agentName.replace(/ Agent$/, "")}
            </span>
          </span>
          <span className="text-[10px] font-medium text-slate-400 dark:text-neutral-500">
            {timeStr}
          </span>
        </div>
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

export function AgentScheduleCalendar() {
  const today = useMemo(() => new Date(), []);
  const [year, setYear] = useState(today.getFullYear());
  const [monthIndex, setMonthIndex] = useState(today.getMonth());
  const [selectedKey, setSelectedKey] = useState<string | null>(() =>
    localDayKey(today),
  );

  useEffect(() => {
    const n = new Date();
    if (n.getFullYear() === year && n.getMonth() === monthIndex) {
      setSelectedKey(localDayKey(n));
    } else {
      setSelectedKey(localDayKey(new Date(year, monthIndex, 1)));
    }
  }, [year, monthIndex]);

  const tasks = useMemo(
    () => getScheduledTasksForMonth(year, monthIndex),
    [year, monthIndex],
  );
  const byDay = useMemo(() => groupTasksByDayKey(tasks), [tasks]);
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

  const selectedTasks: ScheduledAgentTask[] = selectedKey
    ? (byDay.get(selectedKey) ?? [])
    : [];

  const todayKey = localDayKey(today);

  return (
    <div className="flex flex-col gap-10 xl:flex-row xl:items-start xl:gap-12 2xl:gap-16">
      <div className="min-w-0 flex-1">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            {monthLabel(year, monthIndex)}
          </h2>
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
        {selectedTasks.length === 0 ? (
          <p className="rounded-xl border border-dashed border-neutral-200 bg-neutral-50/50 px-5 py-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800/30 dark:text-neutral-500">
            No agent tasks scheduled for this day.
          </p>
        ) : (
          <ul className="flex flex-col gap-4" aria-label="Scheduled tasks for selected day">
            {selectedTasks.map((task) => (
              <li key={task.id}>
                <ScheduleTaskRow task={task} />
              </li>
            ))}
          </ul>
        )}
      </aside>
    </div>
  );
}
