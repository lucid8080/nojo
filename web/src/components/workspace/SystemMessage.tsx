"use client";

import { useMemo, useState } from "react";

// Localized: treat these as terminal (non-cancellable). Easy to update.
const TERMINAL_STATUSES = new Set([
  "completed",
  "succeeded",
  "failed",
  "cancelled",
  "canceled",
  "error",
]);

function isCancellable(status: string | undefined): boolean {
  if (!status) return true;
  return !TERMINAL_STATUSES.has(status.toLowerCase().trim());
}

export function SystemMessage({
  body,
  createdAt,
  runId,
  initialRunStatus,
}: {
  body: string;
  createdAt: string;
  runId?: string;
  initialRunStatus?: string;
}) {
  const [checking, setChecking] = useState(false);
  const [runStatus, setRunStatus] = useState<string | undefined>(initialRunStatus);
  const [error, setError] = useState<string | null>(null);

  const [loadingLogs, setLoadingLogs] = useState(false);
  const [logs, setLogs] = useState<string[] | null>(null);
  const [logsError, setLogsError] = useState<string | null>(null);

  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const cancellable = useMemo(() => isCancellable(runStatus), [runStatus]);

  async function handleCheckStatus() {
    if (!runId || checking) return;
    setChecking(true);
    setError(null);
    try {
      const res = await fetch(`/api/openclaw/runs/${encodeURIComponent(runId)}`);
      const json = (await res.json()) as
        | { success: true; status?: string; message?: string }
        | { success?: false; message?: string };

      if (res.ok && json && "success" in json && json.success) {
        setRunStatus(json.status);
      } else {
        setError(json && typeof json === "object" ? json.message ?? "Failed." : "Failed.");
      }
    } catch {
      setError("Network error while checking status.");
    } finally {
      setChecking(false);
    }
  }

  async function handleViewLogs() {
    if (!runId || loadingLogs) return;
    setLoadingLogs(true);
    setLogsError(null);
    setLogs(null);
    try {
      const res = await fetch(`/api/openclaw/runs/${encodeURIComponent(runId)}/logs`);
      const json = (await res.json()) as
        | { success: true; logs?: string[] }
        | { success?: false; message?: string };

      if (res.ok && json && "success" in json && json.success) {
        setLogs(Array.isArray(json.logs) ? json.logs : []);
      } else {
        const errMsg =
          json && typeof json === "object" && "message" in json && typeof (json as { message?: string }).message === "string"
            ? (json as { message: string }).message
            : "Failed to load logs.";
        setLogsError(errMsg);
      }
    } catch {
      setLogsError("Network error while loading logs.");
    } finally {
      setLoadingLogs(false);
    }
  }

  async function handleCancelRun() {
    if (!runId || cancelling || !cancellable) return;
    setCancelling(true);
    setCancelError(null);
    try {
      const res = await fetch(`/api/openclaw/runs/${encodeURIComponent(runId)}/cancel`, {
        method: "POST",
      });
      const json = (await res.json()) as
        | { success: true; status?: string; message?: string }
        | { success?: false; message?: string };

      if (res.ok && json && "success" in json && json.success) {
        setRunStatus(json.status ?? "cancelled");
      } else {
        const errMsg =
          json && typeof json === "object" && "message" in json && typeof (json as { message?: string }).message === "string"
            ? (json as { message: string }).message
            : "Cancel failed.";
        setCancelError(errMsg);
      }
    } catch {
      setCancelError("Network error while cancelling.");
    } finally {
      setCancelling(false);
    }
  }

  return (
    <div className="flex justify-center py-2">
      <div className="max-w-md rounded-full border border-neutral-200/80 bg-neutral-50/90 px-4 py-2 text-center text-xs text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-800/80 dark:text-neutral-400">
        <span className="font-medium text-slate-500 dark:text-neutral-500">
          {createdAt}
        </span>
        <span className="mx-2 text-neutral-300 dark:text-neutral-600">·</span>
        {body}
        {runId ? (
          <div className="mt-2 flex flex-col items-center gap-1">
            {runStatus ? (
              <div className="text-[10px] text-slate-500 dark:text-neutral-400">
                OpenClaw status: {runStatus}
              </div>
            ) : null}
            <div className="flex flex-wrap items-center justify-center gap-1.5">
              <button
                type="button"
                onClick={handleCheckStatus}
                disabled={checking}
                className="rounded-full border border-neutral-200/80 bg-white px-3 py-1 text-[10px] font-semibold text-slate-700 shadow-sm transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-70 dark:border-slate-600 dark:bg-slate-800 dark:text-neutral-200 dark:hover:bg-slate-700"
              >
                {checking ? "Checking…" : "Check status"}
              </button>
              <button
                type="button"
                onClick={handleViewLogs}
                disabled={loadingLogs}
                className="rounded-full border border-neutral-200/80 bg-white px-3 py-1 text-[10px] font-semibold text-slate-700 shadow-sm transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-70 dark:border-slate-600 dark:bg-slate-800 dark:text-neutral-200 dark:hover:bg-slate-700"
              >
                {loadingLogs ? "Loading…" : "View logs"}
              </button>
              {cancellable ? (
                <button
                  type="button"
                  onClick={handleCancelRun}
                  disabled={cancelling}
                  className="rounded-full border border-rose-200/80 bg-rose-50/80 px-3 py-1 text-[10px] font-semibold text-rose-700 shadow-sm transition hover:bg-rose-100/80 disabled:cursor-not-allowed disabled:opacity-70 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-300 dark:hover:bg-rose-900/50"
                >
                  {cancelling ? "Cancelling…" : "Cancel run"}
                </button>
              ) : null}
            </div>
            {error ? (
              <div className="text-[10px] font-medium text-rose-600 dark:text-rose-400">
                {error}
              </div>
            ) : null}
            {logsError ? (
              <div className="text-[10px] font-medium text-rose-600 dark:text-rose-400">
                {logsError}
              </div>
            ) : null}
            {cancelError ? (
              <div className="text-[10px] font-medium text-rose-600 dark:text-rose-400">
                {cancelError}
              </div>
            ) : null}
            {logs !== null ? (
              <div className="mt-2 w-full rounded-lg border border-neutral-200/80 bg-white/90 px-2 py-1.5 text-left dark:border-slate-600 dark:bg-slate-900/90">
                {logs.length === 0 ? (
                  <p className="text-[10px] text-slate-500 dark:text-neutral-400">
                    No logs yet.
                  </p>
                ) : (
                  <pre className="max-h-32 overflow-y-auto whitespace-pre-wrap break-words font-mono text-[10px] leading-tight text-slate-700 dark:text-neutral-300">
                    {logs.map((line, i) => (
                      <span key={i}>{line}\n</span>
                    ))}
                  </pre>
                )}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
