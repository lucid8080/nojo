"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminDataTable, AdminTableCell, AdminTableHead, AdminTableHeaderCell, AdminTableRow } from "@/components/admin/AdminDataTable";
import { AdminDetailDrawer } from "@/components/admin/AdminDetailDrawer";
import { AdminEmptyState } from "@/components/admin/AdminEmptyState";
import { AdminFilterBar } from "@/components/admin/AdminFilterBar";
import { AdminPageShell } from "@/components/admin/AdminPageShell";
import { AdminSkeleton, AdminTableSkeleton } from "@/components/admin/AdminSkeleton";
import type { AdminAgentListRow } from "@/types/admin";

export function AgentsPage() {
  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState("");
  const [owner, setOwner] = useState("");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<AdminAgentListRow[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
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
      if (owner.trim()) params.set("owner", owner.trim());
      params.set("page", String(page));
      const res = await fetch(`/api/admin/agents?${params}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok || !json?.success) throw new Error(json?.message ?? `HTTP ${res.status}`);
      setRows(json.data.rows);
      setTotalPages(json.data.totalPages);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [q, owner, page]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!selectedKey) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    setDetailLoading(true);
    (async () => {
      try {
        const res = await fetch(`/api/admin/agents/${encodeURIComponent(selectedKey)}`, {
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
  }, [selectedKey]);

  return (
    <AdminPageShell
      title="Agents"
      description="User-created workspace agents across the platform."
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
            placeholder="Name, agent id, owner email"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600 dark:text-slate-400">
          Owner user id
          <input
            value={owner}
            onChange={(e) => {
              setPage(1);
              setOwner(e.target.value);
            }}
            className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
            placeholder="Filter by user id"
          />
        </label>
      </AdminFilterBar>

      {loading ? <AdminTableSkeleton rows={8} /> : null}

      {!loading && rows.length === 0 ? (
        <AdminEmptyState title="No agents found" />
      ) : null}

      {!loading && rows.length > 0 ? (
        <>
          <AdminDataTable empty={false}>
            <AdminTableHead>
              <tr>
                <AdminTableHeaderCell>Name</AdminTableHeaderCell>
                <AdminTableHeaderCell>Agent id</AdminTableHeaderCell>
                <AdminTableHeaderCell>Owner</AdminTableHeaderCell>
                <AdminTableHeaderCell>Category</AdminTableHeaderCell>
                <AdminTableHeaderCell>Conv.</AdminTableHeaderCell>
                <AdminTableHeaderCell>Runs</AdminTableHeaderCell>
                <AdminTableHeaderCell>Actions</AdminTableHeaderCell>
              </tr>
            </AdminTableHead>
            <tbody>
              {rows.map((r) => (
                <AdminTableRow key={r.id} onClick={() => setSelectedKey(r.id)}>
                  <AdminTableCell compact>{r.name}</AdminTableCell>
                  <AdminTableCell compact>
                    <code className="text-[11px]">{r.agentId}</code>
                  </AdminTableCell>
                  <AdminTableCell compact className="whitespace-nowrap text-xs">
                    {r.owner.email}
                  </AdminTableCell>
                  <AdminTableCell compact>{r.categoryLabel ?? "—"}</AdminTableCell>
                  <AdminTableCell compact>{r.conversationCount}</AdminTableCell>
                  <AdminTableCell compact>{r.runCount}</AdminTableCell>
                  <AdminTableCell compact>
                    <button
                      type="button"
                      className="text-sky-600 hover:underline dark:text-sky-400"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedKey(r.id);
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
        open={selectedKey != null}
        title="Agent details"
        onClose={() => setSelectedKey(null)}
      >
        {detailLoading ? <AdminSkeleton className="h-40 w-full" /> : null}
        {!detailLoading && detail && typeof detail === "object" ? (
          <AgentDetailBody data={detail as Record<string, unknown>} />
        ) : null}
      </AdminDetailDrawer>
    </AdminPageShell>
  );
}

function AgentDetailBody({ data }: { data: Record<string, unknown> }) {
  const agent = data.agent as Record<string, unknown>;
  const owner = data.owner as { email?: string };
  const identityJson = agent.identityJson;
  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-medium uppercase text-slate-500">Identity</p>
        <p className="font-medium">{String(agent.name)}</p>
        <p className="text-xs text-slate-500">
          <code>{String(agent.agentId)}</code>
        </p>
        <p className="text-xs text-slate-500">Owner: {owner.email}</p>
      </div>
      <div>
        <p className="text-xs font-medium uppercase text-slate-500">identityJson</p>
        <pre className="mt-1 max-h-48 overflow-auto rounded border border-neutral-200 bg-neutral-50 p-2 text-[11px] dark:border-slate-700 dark:bg-slate-900">
          {identityJson != null ? JSON.stringify(identityJson, null, 2) : "null"}
        </pre>
      </div>
    </div>
  );
}
