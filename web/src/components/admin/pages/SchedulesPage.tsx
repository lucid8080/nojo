"use client";

import { useEffect, useState } from "react";
import { AdminEmptyState } from "@/components/admin/AdminEmptyState";
import { AdminPageShell } from "@/components/admin/AdminPageShell";
import { AdminSectionCard } from "@/components/admin/AdminSectionCard";
import { AdminSkeleton } from "@/components/admin/AdminSkeleton";
import { AdminStatusBadge } from "@/components/admin/AdminStatusBadge";

type CronJobRow = Record<string, unknown>;

export function SchedulesPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [monthIndex, setMonthIndex] = useState(now.getMonth());
  const [view, setView] = useState<"list" | "calendar">("list");
  const [data, setData] = useState<{
    success?: boolean;
    jobs?: CronJobRow[];
    message?: string;
    cronDataSource?: string;
    warnings?: string[];
    year?: number;
    monthIndex?: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        params.set("year", String(year));
        params.set("month", String(monthIndex));
        const res = await fetch(`/api/admin/schedules?${params}`, { cache: "no-store" });
        const json = await res.json();
        if (!cancelled) setData(json);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [year, monthIndex]);

  const jobs = data?.jobs ?? [];
  const gatewayMissing = data?.success === false && data?.message;

  return (
    <AdminPageShell
      title="Schedules"
      description="Cron jobs from the OpenClaw gateway (or disk mirror when configured)."
    >
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm">
          <span className="text-slate-600 dark:text-slate-400">Year</span>
          <input
            type="number"
            className="w-24 rounded-lg border border-neutral-200 px-2 py-1.5 dark:border-slate-700 dark:bg-slate-900"
            value={year}
            onChange={(e) => setYear(Number(e.target.value) || year)}
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <span className="text-slate-600 dark:text-slate-400">Month (0–11)</span>
          <input
            type="number"
            min={0}
            max={11}
            className="w-20 rounded-lg border border-neutral-200 px-2 py-1.5 dark:border-slate-700 dark:bg-slate-900"
            value={monthIndex}
            onChange={(e) => setMonthIndex(Math.min(11, Math.max(0, Number(e.target.value))))}
          />
        </label>
        <div className="flex rounded-lg border border-neutral-200 p-0.5 dark:border-slate-700">
          <button
            type="button"
            className={`rounded-md px-3 py-1.5 text-sm ${
              view === "list"
                ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                : "text-slate-600 dark:text-slate-400"
            }`}
            onClick={() => setView("list")}
          >
            List
          </button>
          <button
            type="button"
            className={`rounded-md px-3 py-1.5 text-sm ${
              view === "calendar"
                ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                : "text-slate-600 dark:text-slate-400"
            }`}
            onClick={() => setView("calendar")}
          >
            Calendar
          </button>
        </div>
      </div>

      {error ? (
        <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-100">
          {error}
        </div>
      ) : null}

      {loading ? <AdminSkeleton className="h-40 w-full" /> : null}

      {!loading && view === "calendar" ? (
        <AdminSectionCard title="Calendar">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Calendar view is not enabled yet. Use list mode for this period.
          </p>
        </AdminSectionCard>
      ) : null}

      {!loading && view === "list" ? (
        <>
          {gatewayMissing ? (
            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
              {String(data?.message)}
              <p className="mt-2 text-xs">
                If the gateway is intentionally offline, ensure disk fallback is allowed or fix
                OPENCLAW_BASE_URL / tokens.
              </p>
            </div>
          ) : null}

          {data?.warnings && data.warnings.length > 0 ? (
            <ul className="mb-4 list-inside list-disc text-sm text-amber-900 dark:text-amber-100">
              {data.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          ) : null}

          <AdminSectionCard
            title="Jobs"
            action={
              data?.cronDataSource ? (
                <AdminStatusBadge variant={data.cronDataSource.includes("gateway") ? "configured" : "warning"}>
                  {data.cronDataSource}
                </AdminStatusBadge>
              ) : null
            }
          >
            {jobs.length === 0 ? (
              <AdminEmptyState title="No cron jobs in range" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-[13px]">
                  <thead className="border-b border-neutral-200 dark:border-slate-800">
                    <tr>
                      <th className="px-2 py-2 text-[11px] font-semibold uppercase text-slate-500">
                        Name
                      </th>
                      <th className="px-2 py-2 text-[11px] font-semibold uppercase text-slate-500">
                        Schedule
                      </th>
                      <th className="px-2 py-2 text-[11px] font-semibold uppercase text-slate-500">
                        Raw
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {jobs.map((job, i) => (
                      <tr
                        key={i}
                        className="border-b border-neutral-100 dark:border-slate-800"
                      >
                        <td className="px-2 py-2 align-top">
                          {String(job.name ?? job.id ?? "—")}
                        </td>
                        <td className="px-2 py-2 align-top">
                          {String(job.schedule ?? job.cron ?? "—")}
                        </td>
                        <td className="max-w-md px-2 py-2 align-top">
                          <pre className="max-h-24 overflow-auto text-[11px] text-slate-600 dark:text-slate-400">
                            {JSON.stringify(job, null, 0).slice(0, 400)}
                            {JSON.stringify(job).length > 400 ? "…" : ""}
                          </pre>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </AdminSectionCard>
        </>
      ) : null}
    </AdminPageShell>
  );
}
