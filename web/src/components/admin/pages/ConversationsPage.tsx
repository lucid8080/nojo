"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminDataTable, AdminTableCell, AdminTableHead, AdminTableHeaderCell, AdminTableRow } from "@/components/admin/AdminDataTable";
import { AdminDetailDrawer } from "@/components/admin/AdminDetailDrawer";
import { AdminEmptyState } from "@/components/admin/AdminEmptyState";
import { AdminFilterBar } from "@/components/admin/AdminFilterBar";
import { AdminPageShell } from "@/components/admin/AdminPageShell";
import { AdminSkeleton, AdminTableSkeleton } from "@/components/admin/AdminSkeleton";
import type { AdminConversationListRow } from "@/types/admin";

export function ConversationsPage() {
  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<AdminConversationListRow[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<unknown>(null);
  const [detailLoading, setDetailLoading] = useState(false);

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
      params.set("page", String(page));
      const res = await fetch(`/api/admin/conversations?${params}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok || !json?.success) throw new Error(json?.message ?? `HTTP ${res.status}`);
      setRows(json.data.rows);
      setTotalPages(json.data.totalPages);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [q, page]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    setDetailLoading(true);
    (async () => {
      try {
        const res = await fetch(`/api/admin/conversations/${encodeURIComponent(selectedId)}`, {
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

  return (
    <AdminPageShell
      title="Conversations"
      description="Workspace rooms and linked execution metadata."
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
            placeholder="Title or owner email"
          />
        </label>
      </AdminFilterBar>

      {loading ? <AdminTableSkeleton rows={8} /> : null}

      {!loading && rows.length === 0 ? (
        <AdminEmptyState title="No conversations found" />
      ) : null}

      {!loading && rows.length > 0 ? (
        <>
          <AdminDataTable empty={false}>
            <AdminTableHead>
              <tr>
                <AdminTableHeaderCell>Title</AdminTableHeaderCell>
                <AdminTableHeaderCell>Owner</AdminTableHeaderCell>
                <AdminTableHeaderCell>Primary agent</AdminTableHeaderCell>
                <AdminTableHeaderCell>Agents</AdminTableHeaderCell>
                <AdminTableHeaderCell>Created</AdminTableHeaderCell>
                <AdminTableHeaderCell>Actions</AdminTableHeaderCell>
              </tr>
            </AdminTableHead>
            <tbody>
              {rows.map((r) => (
                <AdminTableRow key={r.id} onClick={() => setSelectedId(r.id)}>
                  <AdminTableCell compact>{r.title}</AdminTableCell>
                  <AdminTableCell compact className="text-xs">{r.owner.email}</AdminTableCell>
                  <AdminTableCell compact>
                    <code className="text-[11px]">{r.primaryAgentId}</code>
                  </AdminTableCell>
                  <AdminTableCell compact>{r.agentCount}</AdminTableCell>
                  <AdminTableCell compact className="whitespace-nowrap text-xs text-slate-500">
                    {new Date(r.createdAt).toLocaleString()}
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
        title="Conversation details"
        onClose={() => setSelectedId(null)}
      >
        {detailLoading ? <AdminSkeleton className="h-40 w-full" /> : null}
        {!detailLoading && detail && typeof detail === "object" ? (
          <ConversationDetailBody data={detail as Record<string, unknown>} />
        ) : null}
      </AdminDetailDrawer>
    </AdminPageShell>
  );
}

function ConversationDetailBody({ data }: { data: Record<string, unknown> }) {
  const conv = data.conversation as Record<string, unknown>;
  const runs = (data.runs as unknown[]) ?? [];
  return (
    <div className="space-y-3">
      <p className="font-medium">{String(conv.title)}</p>
      <p className="text-xs text-slate-500">id: {String(conv.id)}</p>
      <p className="text-xs text-slate-500">primaryAgentId: {String(conv.primaryAgentId)}</p>
      <pre className="max-h-40 overflow-auto rounded border border-neutral-200 bg-neutral-50 p-2 text-[11px] dark:border-slate-700 dark:bg-slate-900">
        {JSON.stringify(conv.agentIds, null, 2)}
      </pre>
      <p className="text-xs font-medium uppercase text-slate-500">Linked runs ({runs.length})</p>
      <ul className="space-y-1 text-xs">
        {runs.slice(0, 20).map((r) => {
          const row = r as { id?: string; status?: string };
          return (
            <li key={String(row.id)}>
              {row.status} — {String(row.id)}
            </li>
          );
        })}
      </ul>
      <p className="text-xs text-slate-500">
        Full transcript tools can attach here later. Open in workspace is not wired.
      </p>
    </div>
  );
}
