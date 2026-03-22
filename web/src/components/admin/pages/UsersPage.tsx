"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminDataTable, AdminTableCell, AdminTableHead, AdminTableHeaderCell, AdminTableRow } from "@/components/admin/AdminDataTable";
import { AdminDetailDrawer } from "@/components/admin/AdminDetailDrawer";
import { AdminEmptyState } from "@/components/admin/AdminEmptyState";
import { AdminFilterBar } from "@/components/admin/AdminFilterBar";
import { AdminPageShell } from "@/components/admin/AdminPageShell";
import { AdminSkeleton, AdminTableSkeleton } from "@/components/admin/AdminSkeleton";
import { AdminStatusBadge } from "@/components/admin/AdminStatusBadge";
import type { AdminUserListRow } from "@/types/admin";

export function UsersPage() {
  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState("");
  const [role, setRole] = useState("");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<AdminUserListRow[]>([]);
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
      if (role === "USER" || role === "ADMIN") params.set("role", role);
      params.set("page", String(page));
      const res = await fetch(`/api/admin/users?${params}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok || !json?.success) throw new Error(json?.message ?? `HTTP ${res.status}`);
      setRows(json.data.rows);
      setTotalPages(json.data.totalPages);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [q, role, page]);

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
        const res = await fetch(`/api/admin/users/${encodeURIComponent(selectedId)}`, {
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
    <AdminPageShell title="Users" description="Accounts, roles, and related workspace activity.">
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
            placeholder="Email or name"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600 dark:text-slate-400">
          Role
          <select
            value={role}
            onChange={(e) => {
              setPage(1);
              setRole(e.target.value);
            }}
            className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
          >
            <option value="">All</option>
            <option value="USER">USER</option>
            <option value="ADMIN">ADMIN</option>
          </select>
        </label>
      </AdminFilterBar>

      {loading ? <AdminTableSkeleton rows={8} /> : null}

      {!loading && rows.length === 0 ? (
        <AdminEmptyState title="No users match filters" />
      ) : null}

      {!loading && rows.length > 0 ? (
        <>
          <AdminDataTable empty={false}>
            <AdminTableHead>
              <tr>
                <AdminTableHeaderCell>Email</AdminTableHeaderCell>
                <AdminTableHeaderCell>Role</AdminTableHeaderCell>
                <AdminTableHeaderCell>Created</AdminTableHeaderCell>
                <AdminTableHeaderCell>Agents</AdminTableHeaderCell>
                <AdminTableHeaderCell>Conv.</AdminTableHeaderCell>
                <AdminTableHeaderCell>Runs</AdminTableHeaderCell>
                <AdminTableHeaderCell>Actions</AdminTableHeaderCell>
              </tr>
            </AdminTableHead>
            <tbody>
              {rows.map((r) => (
                <AdminTableRow key={r.id} onClick={() => setSelectedId(r.id)}>
                  <AdminTableCell compact>{r.email}</AdminTableCell>
                  <AdminTableCell compact>
                    <AdminStatusBadge variant={r.role === "ADMIN" ? "warning" : "unknown"}>
                      {r.role}
                    </AdminStatusBadge>
                  </AdminTableCell>
                  <AdminTableCell compact className="whitespace-nowrap text-xs text-slate-500">
                    {new Date(r.createdAt).toLocaleString()}
                  </AdminTableCell>
                  <AdminTableCell compact>{r.counts.agents}</AdminTableCell>
                  <AdminTableCell compact>{r.counts.conversations}</AdminTableCell>
                  <AdminTableCell compact>{r.counts.runs}</AdminTableCell>
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
        title="User details"
        onClose={() => setSelectedId(null)}
      >
        {detailLoading ? <AdminSkeleton className="h-40 w-full" /> : null}
        {!detailLoading && detail && typeof detail === "object" && detail !== null ? (
          <UserDetailBody data={detail as Record<string, unknown>} />
        ) : null}
      </AdminDetailDrawer>
    </AdminPageShell>
  );
}

function UserDetailBody({ data }: { data: Record<string, unknown> }) {
  const user = data.user as {
    email?: string;
    role?: string;
    createdAt?: string;
  };
  const agents = (data.agents as unknown[]) ?? [];
  const conversations = (data.conversations as unknown[]) ?? [];
  const runs = (data.runs as unknown[]) ?? [];

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-medium uppercase text-slate-500">Profile</p>
        <p className="mt-1 font-medium">{user.email}</p>
        <p className="text-xs text-slate-500">Role: {user.role}</p>
        <p className="text-xs text-slate-500">Joined: {user.createdAt}</p>
      </div>
      <div>
        <p className="text-xs font-medium uppercase text-slate-500">Agents ({agents.length})</p>
        <ul className="mt-1 max-h-32 space-y-1 overflow-y-auto text-xs">
          {agents.slice(0, 20).map((a) => {
            const row = a as { name?: string; agentId?: string };
            return (
              <li key={String(row.agentId)}>
                {row.name} — <code className="text-[11px]">{row.agentId}</code>
              </li>
            );
          })}
        </ul>
      </div>
      <div>
        <p className="text-xs font-medium uppercase text-slate-500">Conversations ({conversations.length})</p>
        <ul className="mt-1 max-h-32 space-y-1 overflow-y-auto text-xs">
          {conversations.slice(0, 20).map((c) => {
            const row = c as { title?: string; id?: string };
            return <li key={String(row.id)}>{row.title}</li>;
          })}
        </ul>
      </div>
      <div>
        <p className="text-xs font-medium uppercase text-slate-500">Recent runs ({runs.length})</p>
        <ul className="mt-1 max-h-40 space-y-1 overflow-y-auto text-xs">
          {runs.slice(0, 15).map((r) => {
            const row = r as { id?: string; status?: string; prompt?: string };
            return (
              <li key={String(row.id)}>
                {row.status} — {(row.prompt ?? "").slice(0, 80)}
                {(row.prompt ?? "").length > 80 ? "…" : ""}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
