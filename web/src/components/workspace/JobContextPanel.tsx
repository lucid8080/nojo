"use client";

import type { JobContext, WorkspaceAgent } from "@/data/workspaceChatMock";
import { workspaceAgents } from "@/data/workspaceChatMock";
import { WorkspaceAgentAvatar } from "./WorkspaceAgentAvatar";

function agentById(id: string): WorkspaceAgent | undefined {
  return workspaceAgents.find((a) => a.id === id);
}

export function JobContextPanel({ context }: { context: JobContext | null }) {
  if (!context) {
    return (
      <aside className="flex h-full items-center justify-center border-l border-neutral-200/80 bg-white/40 p-6 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900/30 dark:text-neutral-400">
        Select a job to see context, subtasks, and deliverables.
      </aside>
    );
  }

  const done = context.subtasks.filter((s) => s.done).length;
  const total = context.subtasks.length;
  const pct = total ? Math.round((done / total) * 100) : context.progressPercent;

  return (
    <aside className="flex h-full min-h-0 flex-col overflow-y-auto border-l border-neutral-200/80 bg-white/70 dark:border-slate-800 dark:bg-slate-900/50">
      <div className="shrink-0 space-y-4 border-b border-neutral-200/80 p-4 dark:border-slate-800">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-neutral-500">
            Job
          </p>
          <h2 className="mt-1 text-base font-bold text-slate-900 dark:text-white">
            {context.title}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-neutral-400">
            {context.description}
          </p>
        </div>
        <div>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-neutral-500">
            Assigned agents
          </p>
          <div className="flex flex-wrap gap-2">
            {context.agentIds.map((id) => {
              const a = agentById(id);
              if (!a) return null;
              return (
                <span
                  key={id}
                  className="inline-flex items-center gap-2 rounded-full border border-neutral-200/80 bg-white py-1 pl-1 pr-3 text-xs font-medium shadow-sm dark:border-slate-600 dark:bg-slate-800"
                >
                  <WorkspaceAgentAvatar agent={a} size={28} />
                  {a.name}
                </span>
              );
            })}
          </div>
        </div>
        <div className="flex items-center justify-between rounded-xl border border-neutral-200/80 bg-neutral-50/80 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/50">
          <span className="text-xs font-medium text-slate-600 dark:text-neutral-400">
            Due
          </span>
          <span className="text-sm font-semibold text-slate-900 dark:text-white">
            {context.dueDate}
          </span>
        </div>
        <div>
          <div className="mb-1 flex justify-between text-xs">
            <span className="font-medium text-slate-600 dark:text-neutral-400">
              Progress
            </span>
            <span className="font-bold text-sky-700 dark:text-sky-400">{pct}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-neutral-200 dark:bg-slate-700">
            <div
              className="h-full rounded-full bg-gradient-to-r from-sky-500 to-emerald-500 transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </div>

      {context.files.length > 0 ? (
        <div className="shrink-0 border-b border-neutral-200/80 p-4 dark:border-slate-800">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-neutral-500">
            Files
          </p>
          <ul className="space-y-2">
            {context.files.map((f) => (
              <li
                key={f.id}
                className="flex items-center justify-between rounded-xl border border-neutral-200/60 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800/60"
              >
                <span className="truncate font-medium text-slate-800 dark:text-neutral-200">
                  {f.name}
                </span>
                <span className="shrink-0 text-slate-400 dark:text-neutral-500">
                  {f.size}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="shrink-0 border-b border-neutral-200/80 p-4 dark:border-slate-800">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-neutral-500">
          Subtasks
        </p>
        <ul className="space-y-2">
          {context.subtasks.map((s) => {
            const assignee = s.assigneeAgentId
              ? agentById(s.assigneeAgentId)
              : undefined;
            return (
              <li
                key={s.id}
                className="flex items-start gap-2 rounded-xl border border-neutral-200/60 bg-white/80 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/40"
              >
                <span
                  className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md text-[10px] font-bold ${
                    s.done
                      ? "bg-emerald-500 text-white"
                      : "border border-neutral-300 bg-neutral-100 text-transparent dark:border-slate-600 dark:bg-slate-700"
                  }`}
                  aria-hidden
                >
                  ✓
                </span>
                <div className="min-w-0 flex-1">
                  <p
                    className={`text-sm ${s.done ? "text-slate-500 line-through dark:text-neutral-500" : "text-slate-900 dark:text-white"}`}
                  >
                    {s.title}
                  </p>
                  {assignee ? (
                    <p className="text-[10px] text-slate-400 dark:text-neutral-500">
                      {assignee.name}
                    </p>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="shrink-0 border-b border-neutral-200/80 p-4 dark:border-slate-800">
        <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-neutral-500">
          Activity
        </p>
        <ul className="relative space-y-0 border-l-2 border-neutral-200 pl-4 dark:border-slate-700">
          {context.activity.map((ev) => (
            <li key={ev.id} className="relative pb-4 last:pb-0">
              <span
                className={`absolute -left-[21px] top-1.5 size-2.5 rounded-full ring-4 ring-white dark:ring-slate-900 ${
                  ev.tone === "success"
                    ? "bg-emerald-500"
                    : ev.tone === "warning"
                      ? "bg-amber-500"
                      : "bg-sky-500"
                }`}
              />
              <p className="text-sm font-medium text-slate-800 dark:text-neutral-200">
                {ev.label}
              </p>
              <p className="text-[10px] text-slate-400 dark:text-neutral-500">
                {ev.time}
              </p>
            </li>
          ))}
        </ul>
      </div>

      <div className="p-4 pb-8">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-neutral-500">
          Deliverables
        </p>
        {context.deliverables.length === 0 ? (
          <p className="text-xs text-slate-500 dark:text-neutral-500">None yet</p>
        ) : (
          <ul className="space-y-2">
            {context.deliverables.map((d) => (
              <li
                key={d.id}
                className="flex items-center justify-between rounded-xl border border-neutral-200/60 px-3 py-2 text-xs dark:border-slate-700"
              >
                <span className="truncate font-medium text-slate-800 dark:text-neutral-200">
                  {d.name}
                </span>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    d.status === "Approved"
                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                      : d.status === "Ready"
                        ? "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300"
                        : "bg-neutral-100 text-neutral-700 dark:bg-slate-800 dark:text-neutral-400"
                  }`}
                >
                  {d.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}
