"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminDataTable, AdminTableCell, AdminTableHead, AdminTableHeaderCell, AdminTableRow } from "@/components/admin/AdminDataTable";
import { AdminDetailDrawer } from "@/components/admin/AdminDetailDrawer";
import { AdminEmptyState } from "@/components/admin/AdminEmptyState";
import { AdminFilterBar } from "@/components/admin/AdminFilterBar";
import { AdminPageShell } from "@/components/admin/AdminPageShell";
import { AdminSkeleton, AdminTableSkeleton } from "@/components/admin/AdminSkeleton";
import { AdminStatusBadge, runStatusVariant } from "@/components/admin/AdminStatusBadge";
import type { AdminRunListRow } from "@/types/admin";

export function RunsPage() {
  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<AdminRunListRow[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<unknown>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [logs, setLogs] = useState<string[] | null>(null);
  const [logsError, setLogsError] = useState<string | null>(null);
  const [logsLoading, setLogsLoading] = useState(false);
  const [cancelMsg, setCancelMsg] = useState<string | null>(null);
  const [cancelBusy, setCancelBusy] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      setQ((prev) => {
        if (prev !== qInput) setPage(1);
        return qInput;
      });
    }, 400);
    return () => clearTimeout(t);
  }, [qInput]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      if (status.trim()) params.set("status", status.trim());
      params.set("page", String(page));
      const res = await fetch(`/api/admin/runs?${params}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok || !json?.success) throw new Error(json?.message ?? `HTTP ${res.status}`);
      setRows(json.data.rows);
      setTotalPages(json.data.totalPages);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [q, status, page]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      setLogs(null);
      setLogsError(null);
      setCancelMsg(null);
      return;
    }
    let cancelled = false;
    setDetailLoading(true);
    (async () => {
      try {
        const res = await fetch(`/api/admin/runs/${encodeURIComponent(selectedId)}`, {
          cache: "no-store",
        });
        const json = await res.json();
        if (!cancelled) {
          if (res.ok && json?.success) setDetail(json.data);
          else setDetail(null);
        }
      } finally {
        if (!cancelled) setDetailLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  async function loadLogsForRun(id: string) {
    setLogsLoading(true);
    setLogsError(null);
    setLogs(null);
    try {
      const res = await fetch(`/api/admin/runs/${encodeURIComponent(id)}/logs`, {
        cache: "no-store",
      });
      const json = await res.json();
      if (!res.ok || !json?.success) {
        throw new Error(json?.message ?? `HTTP ${res.status}`);
      }
      setLogs(Array.isArray(json.logs) ? json.logs : []);
    } catch (e) {
      setLogsError(e instanceof Error ? e.message : String(e));
    } finally {
      setLogsLoading(false);
    }
  }

  async function cancelRun(id: string) {
    setCancelBusy(true);
    setCancelMsg(null);
    try {
      const res = await fetch(`/api/admin/runs/${encodeURIComponent(id)}/cancel`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok || !json?.success) {
        throw new Error(json?.message ?? `HTTP ${res.status}`);
      }
      setCancelMsg(json.message ?? "Cancelled.");
      load();
    } catch (e) {
      setCancelMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setCancelBusy(false);
    }
  }

  return (
    <AdminPageShell
      title="Runs"
      description="Execution records across OpenClaw and local persistence."
    >
      {error ? (
        <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-100">
          {error}
        </div>
      ) : null}

      <AdminFilterBar>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600 dark:text-slate-400">
          Search
          <input
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
            className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
            placeholder="Run id, OpenClaw id, prompt, user email"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600 dark:text-slate-400">
          Status filter
          <input
            value={status}
            onChange={(e) => {
              setPage(1);
              setStatus(e.target.value);
            }}
            className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
            placeholder="Exact status string"
          />
        </label>
      </AdminFilterBar>

      {loading ? <AdminTableSkeleton rows={10} /> : null}

      {!loading && rows.length === 0 ? (
        <AdminEmptyState title="No runs found" />
      ) : null}

      {!loading && rows.length > 0 ? (
        <>
          <AdminDataTable empty={false}>
            <AdminTableHead>
              <tr>
                <AdminTableHeaderCell>Run</AdminTableHeaderCell>
                <AdminTableHeaderCell>OpenClaw</AdminTableHeaderCell>
                <AdminTableHeaderCell>User</AdminTableHeaderCell>
                <AdminTableHeaderCell>Status</AdminTableHeaderCell>
                <AdminTableHeaderCell>Updated</AdminTableHeaderCell>
                <AdminTableHeaderCell>Preview</AdminTableHeaderCell>
                <AdminTableHeaderCell>Actions</AdminTableHeaderCell>
              </tr>
            </AdminTableHead>
            <tbody>
              {rows.map((r) => (
                <AdminTableRow key={r.id} onClick={() => setSelectedId(r.id)}>
                  <AdminTableCell compact>
                    <code className="text-[11px]">{r.id}</code>
                  </AdminTableCell>
                  <AdminTableCell compact>
                    {r.openclawRunId ? (
                      <code className="text-[11px]">{r.openclawRunId}</code>
                    ) : (
                      "—"
                    )}
                  </AdminTableCell>
                  <AdminTableCell compact className="text-xs">{r.user.email}</AdminTableCell>
                  <AdminTableCell compact>
                    <AdminStatusBadge variant={runStatusVariant(r.status)}>{r.status}</AdminStatusBadge>
                  </AdminTableCell>
                  <AdminTableCell compact className="whitespace-nowrap text-xs text-slate-500">
                    {new Date(r.updatedAt).toLocaleString()}
                  </AdminTableCell>
                  <AdminTableCell compact className="max-w-xs truncate text-xs text-slate-600 dark:text-slate-400">
                    {r.promptPreview}
                  </AdminTableCell>
                  <AdminTableCell compact>
                    <button
                      type="button"
                      className="text-sky-600 hover:underline dark:text-sky-400"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedId(r.id);
                      }}
                    >
                      View
                    </button>
                  </AdminTableCell>
                </AdminTableRow>
              ))}
            </tbody>
          </AdminDataTable>

          <div className="mt-4 flex items-center justify-between gap-2 text-sm">
            <button
              type="button"
              disabled={page <= 1}
              className="rounded-lg border border-neutral-200 px-3 py-1.5 disabled:opacity-50 dark:border-slate-700"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </button>
            <span className="text-slate-600 dark:text-slate-400">
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              className="rounded-lg border border-neutral-200 px-3 py-1.5 disabled:opacity-50 dark:border-slate-700"
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        </>
      ) : null}

      <AdminDetailDrawer
        open={selectedId != null}
        title="Run details"
        onClose={() => setSelectedId(null)}
        footer={
          selectedId ? (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded-lg border border-neutral-200 px-3 py-1.5 text-sm dark:border-slate-700"
                disabled={logsLoading}
                onClick={() => loadLogsForRun(selectedId)}
              >
                {logsLoading ? "Loading logs…" : "View logs"}
              </button>
              <button
                type="button"
                className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-sm text-rose-900 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-100"
                disabled={cancelBusy}
                onClick={() => cancelRun(selectedId)}
              >
                {cancelBusy ? "Cancelling…" : "Cancel run"}
              </button>
            </div>
          ) : null
        }
      >
        {detailLoading ? <AdminSkeleton className="h-40 w-full" /> : null}
        {!detailLoading && detail && typeof detail === "object" ? (
          <RunDetailBody data={detail as Record<string, unknown>} />
        ) : null}
        {logsError ? (
          <p className="mt-4 text-sm text-rose-600 dark:text-rose-400">{logsError}</p>
        ) : null}
        {logs ? (
          <div className="mt-4">
            <p className="text-xs font-medium uppercase text-slate-500">Logs</p>
            <pre className="mt-1 max-h-56 overflow-auto rounded border border-neutral-200 bg-neutral-50 p-2 text-[11px] dark:border-slate-700 dark:bg-slate-900">
              {logs.length ? logs.join("\n") : "(empty)"}
            </pre>
          </div>
        ) : null}
        {cancelMsg ? (
          <p className="mt-4 text-sm text-slate-600 dark:text-slate-400">{cancelMsg}</p>
        ) : null}
      </AdminDetailDrawer>
    </AdminPageShell>
  );
}

function RunDetailBody({ data }: { data: Record<string, unknown> }) {
  const run = data.run as Record<string, unknown>;
  const user = data.user as { email?: string };
  return (
    <div className="space-y-3">
      <div>
        <p className="text-xs font-medium uppercase text-slate-500">Status timeline</p>
        <p className="text-xs text-slate-500">
          Placeholder: poll history can be wired when OpenClaw exposes a timeline.
        </p>
      </div>
      <div>
        <p className="text-xs font-medium uppercase text-slate-500">User</p>
        <p className="text-sm">{user.email}</p>
      </div>
      <div>
        <p className="text-xs font-medium uppercase text-slate-500">Prompt</p>
        <pre className="mt-1 max-h-64 overflow-auto whitespace-pre-wrap rounded border border-neutral-200 bg-neutral-50 p-2 text-[11px] dark:border-slate-700 dark:bg-slate-900">
          {String(run.prompt ?? "")}
        </pre>
      </div>
      {run.errorMessage ? (
        <div>
          <p className="text-xs font-medium uppercase text-slate-500">Error</p>
          <pre className="mt-1 max-h-40 overflow-auto rounded border border-rose-200 bg-rose-50 p-2 text-[11px] dark:border-rose-950/40 dark:text-rose-100">
            {String(run.errorMessage)}
          </pre>
        </div>
      ) : null}
    </div>
  );
}
