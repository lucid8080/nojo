"use client";

import { useEffect, useState } from "react";
import { AdminEmptyState } from "@/components/admin/AdminEmptyState";
import { AdminPageShell } from "@/components/admin/AdminPageShell";
import { AdminSectionCard } from "@/components/admin/AdminSectionCard";
import { AdminSkeleton } from "@/components/admin/AdminSkeleton";
import { AdminStatCard } from "@/components/admin/AdminStatCard";
import { AdminStatusBadge } from "@/components/admin/AdminStatusBadge";
import type { AdminOverviewStats } from "@/types/admin";

type OverviewPayload = {
  stats: AdminOverviewStats;
  recentUsers: {
    id: string;
    email: string;
    role: string;
    createdAt: string;
  }[];
  recentRuns: {
    id: string;
    openclawRunId: string | null;
    status: string;
    promptPreview: string;
    createdAt: string;
    user: { id: string; email: string };
  }[];
  recentConversations: {
    id: string;
    title: string;
    createdAt: string;
    user: { id: string; email: string };
  }[];
  alerts: string[];
};

export function OverviewPage() {
  const [data, setData] = useState<OverviewPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/admin/overview", { cache: "no-store" });
        const json = await res.json();
        if (!res.ok || !json?.success) {
          throw new Error(json?.message ?? `HTTP ${res.status}`);
        }
        if (!cancelled) setData(json.data);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <AdminPageShell
      title="Overview"
      description="Platform metrics and recent activity."
    >
      {error ? (
        <div
          className="mb-6 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-100"
          role="alert"
        >
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <AdminSkeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : data ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <AdminStatCard label="Total users" value={data.stats.totalUsers} />
            <AdminStatCard label="User-created agents" value={data.stats.totalAgents} />
            <AdminStatCard label="Conversations" value={data.stats.totalConversations} />
            <AdminStatCard label="Runs" value={data.stats.totalRuns} />
            <AdminStatCard label="Runs in progress" value={data.stats.runsInProgress} />
            <AdminStatCard label="Failed runs" value={data.stats.runsFailed} tone="danger" />
            <AdminStatCard
              label="OpenClaw"
              value={data.stats.openClawHealth.ok ? "Up" : "Down"}
              hint={data.stats.openClawHealth.endpoint ?? data.stats.openClawHealth.message}
              tone={data.stats.openClawHealth.ok ? "success" : "danger"}
            />
            <AdminStatCard
              label="Cron jobs"
              value={data.stats.cronJobsCount ?? "—"}
              hint={data.stats.cronJobsAvailable ? "Loaded" : "Unavailable"}
              tone={data.stats.cronJobsAvailable ? "success" : "warning"}
            />
          </div>

          {data.alerts.length > 0 ? (
            <div className="mt-8">
              <AdminSectionCard title="System alerts">
                <ul className="list-inside list-disc space-y-1 text-sm text-amber-900 dark:text-amber-100">
                  {data.alerts.map((a) => (
                    <li key={a}>{a}</li>
                  ))}
                </ul>
              </AdminSectionCard>
            </div>
          ) : null}

          <div className="mt-8 grid gap-6 lg:grid-cols-3">
            <AdminSectionCard title="Recent users">
              {data.recentUsers.length === 0 ? (
                <AdminEmptyState title="No users yet" />
              ) : (
                <ul className="space-y-2 text-sm">
                  {data.recentUsers.map((u) => (
                    <li
                      key={u.id}
                      className="flex items-center justify-between gap-2 border-b border-neutral-100 pb-2 last:border-0 dark:border-slate-800"
                    >
                      <span className="truncate text-slate-800 dark:text-slate-100">{u.email}</span>
                      <AdminStatusBadge variant={u.role === "ADMIN" ? "warning" : "unknown"}>
                        {u.role}
                      </AdminStatusBadge>
                    </li>
                  ))}
                </ul>
              )}
            </AdminSectionCard>

            <AdminSectionCard title="Recent runs">
              {data.recentRuns.length === 0 ? (
                <AdminEmptyState title="No runs yet" />
              ) : (
                <ul className="space-y-2 text-sm">
                  {data.recentRuns.map((r) => (
                    <li
                      key={r.id}
                      className="border-b border-neutral-100 pb-2 last:border-0 dark:border-slate-800"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <AdminStatusBadge variant="running">{r.status}</AdminStatusBadge>
                        <span className="text-xs text-slate-500">{r.user.email}</span>
                      </div>
                      <p className="mt-1 line-clamp-2 text-xs text-slate-600 dark:text-slate-400">
                        {r.promptPreview}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </AdminSectionCard>

            <AdminSectionCard title="Recent conversations">
              {data.recentConversations.length === 0 ? (
                <AdminEmptyState title="No conversations yet" />
              ) : (
                <ul className="space-y-2 text-sm">
                  {data.recentConversations.map((c) => (
                    <li
                      key={c.id}
                      className="flex flex-col border-b border-neutral-100 pb-2 last:border-0 dark:border-slate-800"
                    >
                      <span className="font-medium text-slate-800 dark:text-slate-100">{c.title}</span>
                      <span className="text-xs text-slate-500">{c.user.email}</span>
                    </li>
                  ))}
                </ul>
              )}
            </AdminSectionCard>
          </div>
        </>
      ) : (
        <AdminEmptyState title="No data" description="Try refreshing the page." />
      )}
    </AdminPageShell>
  );
}
