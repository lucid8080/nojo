"use client";

import { useState } from "react";

export type RecentRun = {
  id: string;
  openclawRunId: string | null;
  prompt: string;
  agentId: string | null;
  conversationId: string | null;
  status: string;
  errorMessage: string | null;
  lastCheckedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

const TERMINAL_STATUSES = new Set([
  "completed",
  "succeeded",
  "failed",
  "cancelled",
  "canceled",
  "error",
]);

function isCancellable(status: string): boolean {
  return !TERMINAL_STATUSES.has(status.toLowerCase().trim());
}

function formatRelative(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const sec = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (sec < 60) return "just now";
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  return `${Math.floor(sec / 86400)}d ago`;
}

function RunRow({
  run,
  onRefresh,
}: {
  run: RecentRun;
  onRefresh: () => void;
}) {
  const [checking, setChecking] = useState(false);
  const [logs, setLogs] = useState<string[] | null>(null);
  const [logsError, setLogsError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const runId = run.openclawRunId;
  const cancellable = runId != null && isCancellable(run.status);

  async function handleCheckStatus() {
    if (!runId || checking) return;
    setChecking(true);
    try {
      const res = await fetch(`/api/openclaw/runs/${encodeURIComponent(runId)}`);
      if (res.ok) onRefresh();
    } finally {
      setChecking(false);
    }
  }

  async function handleViewLogs() {
    if (!runId) return;
    setLogs(null);
    setLogsError(null);
    try {
      const res = await fetch(`/api/openclaw/runs/${encodeURIComponent(runId)}/logs`);
      const json = await res.json();
      if (res.ok && json?.success && Array.isArray(json.logs)) {
        setLogs(json.logs);
      } else {
        setLogsError(json?.message ?? "Failed to load logs.");
      }
    } catch {
      setLogsError("Network error.");
    }
  }

  async function handleCancel() {
    if (!runId || cancelling || !cancellable) return;
    setCancelling(true);
    setCancelError(null);
    try {
      const res = await fetch(`/api/openclaw/runs/${encodeURIComponent(runId)}/cancel`, {
        method: "POST",
      });
      if (res.ok) onRefresh();
      else {
        const json = await res.json();
        setCancelError(json?.message ?? "Cancel failed.");
      }
    } catch {
      setCancelError("Network error.");
    } finally {
      setCancelling(false);
    }
  }

  const promptPreview = run.prompt.length > 42 ? `${run.prompt.slice(0, 42)}…` : run.prompt;

  return (
    <div className="border-b border-neutral-100 px-3 py-2 last:border-b-0 dark:border-slate-700/50">
      <div className="flex flex-col gap-1">
        <p className="truncate text-[11px] text-slate-700 dark:text-neutral-300" title={run.prompt}>
          {promptPreview || "—"}
        </p>
        <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
          <span className="rounded bg-neutral-100 px-1.5 py-0.5 font-medium text-slate-600 dark:bg-slate-700 dark:text-neutral-300">
            {run.status}
          </span>
          <span className="text-slate-400 dark:text-neutral-500">
            {formatRelative(run.createdAt)}
          </span>
          {run.openclawRunId ? (
            <span className="truncate text-slate-400 dark:text-neutral-500" title={run.openclawRunId}>
              {run.openclawRunId.slice(0, 8)}…
            </span>
          ) : null}
        </div>
        {runId ? (
          <div className="mt-1 flex flex-wrap gap-1">
            <button
              type="button"
              onClick={handleCheckStatus}
              disabled={checking}
              className="rounded border border-neutral-200 bg-white px-2 py-0.5 text-[10px] font-medium text-slate-600 hover:bg-neutral-50 disabled:opacity-70 dark:border-slate-600 dark:bg-slate-800 dark:text-neutral-300 dark:hover:bg-slate-700"
            >
              {checking ? "…" : "Status"}
            </button>
            <button
              type="button"
              onClick={handleViewLogs}
              className="rounded border border-neutral-200 bg-white px-2 py-0.5 text-[10px] font-medium text-slate-600 hover:bg-neutral-50 dark:border-slate-600 dark:bg-slate-800 dark:text-neutral-300 dark:hover:bg-slate-700"
            >
              Logs
            </button>
            {cancellable ? (
              <button
                type="button"
                onClick={handleCancel}
                disabled={cancelling}
                className="rounded border border-rose-200 bg-rose-50/80 px-2 py-0.5 text-[10px] font-medium text-rose-700 hover:bg-rose-100/80 disabled:opacity-70 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-300 dark:hover:bg-rose-900/50"
              >
                {cancelling ? "…" : "Cancel"}
              </button>
            ) : null}
          </div>
        ) : (
          <p className="text-[10px] text-slate-400 dark:text-neutral-500">No run id</p>
        )}
        {logsError ? (
          <p className="text-[10px] text-rose-600 dark:text-rose-400">{logsError}</p>
        ) : null}
        {cancelError ? (
          <p className="text-[10px] text-rose-600 dark:text-rose-400">{cancelError}</p>
        ) : null}
        {logs !== null ? (
          <div className="mt-1 max-h-24 overflow-y-auto rounded border border-neutral-200 bg-white/90 px-2 py-1 dark:border-slate-600 dark:bg-slate-900/90">
            {logs.length === 0 ? (
              <p className="text-[10px] text-slate-500">No logs</p>
            ) : (
              <pre className="whitespace-pre-wrap break-words font-mono text-[10px] leading-tight text-slate-700 dark:text-neutral-300">
                {logs.join("\n")}
              </pre>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function RecentRunsList({
  runs,
  onRefresh,
}: {
  runs: RecentRun[];
  onRefresh: () => void;
}) {
  return (
    <div className="flex flex-col">
      <div className="border-b border-neutral-200/80 px-3 py-2 dark:border-slate-800">
        <h2 className="text-xs font-semibold text-slate-700 dark:text-neutral-300">
          Recent runs
        </h2>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {runs.length === 0 ? (
          <p className="px-3 py-4 text-center text-[11px] text-slate-500 dark:text-neutral-400">
            No runs yet. Submit a task from the chat.
          </p>
        ) : (
          runs.map((run) => (
            <RunRow key={run.id} run={run} onRefresh={onRefresh} />
          ))
        )}
      </div>
    </div>
  );
}
