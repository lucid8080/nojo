"use client";

import { useEffect, useState } from "react";
import { AdminPageShell } from "@/components/admin/AdminPageShell";
import { AdminSectionCard } from "@/components/admin/AdminSectionCard";
import { AdminSkeleton } from "@/components/admin/AdminSkeleton";
import { AdminStatusBadge } from "@/components/admin/AdminStatusBadge";
import type { AdminSystemSnapshot } from "@/types/admin";

export function SystemPage() {
  const [data, setData] = useState<AdminSystemSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/admin/system", { cache: "no-store" });
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
      title="System"
      description="Safe configuration status for operators. Secrets are never exposed."
    >
      {error ? (
        <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-100">
          {error}
        </div>
      ) : null}

      {loading ? <AdminSkeleton className="h-48 w-full" /> : null}

      {!loading && data ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <AdminSectionCard title="Database">
            <div className="flex items-center gap-2">
              <AdminStatusBadge variant={data.database.ok ? "healthy" : "error"}>
                {data.database.ok ? "Connected" : "Unhealthy"}
              </AdminStatusBadge>
              {data.database.message ? (
                <span className="text-xs text-slate-600 dark:text-slate-400">
                  {data.database.message}
                </span>
              ) : null}
            </div>
          </AdminSectionCard>

          <AdminSectionCard title="Auth">
            <span className="text-sm text-slate-600 dark:text-slate-400">
              NEXTAUTH_SECRET:{" "}
            </span>
            <AdminStatusBadge variant={data.nextAuth.secretConfigured ? "configured" : "missing"}>
              {data.nextAuth.secretConfigured ? "configured" : "missing"}
            </AdminStatusBadge>
          </AdminSectionCard>

          <AdminSectionCard title="OpenClaw config">
            <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-200">
              <li>
                Base URL:{" "}
                <AdminStatusBadge variant={data.openClaw.baseUrlConfigured ? "configured" : "missing"}>
                  {data.openClaw.baseUrlConfigured ? "configured" : "missing"}
                </AdminStatusBadge>
              </li>
              <li>
                Gateway token:{" "}
                <AdminStatusBadge variant={data.openClaw.gatewayTokenPresent ? "configured" : "missing"}>
                  {data.openClaw.gatewayTokenPresent ? "present" : "missing"}
                </AdminStatusBadge>
              </li>
              <li>
                Hooks token:{" "}
                <AdminStatusBadge variant={data.openClaw.hooksTokenPresent ? "configured" : "missing"}>
                  {data.openClaw.hooksTokenPresent ? "present" : "missing"}
                </AdminStatusBadge>
              </li>
              <li>Timeout (ms): {data.openClaw.timeoutMs ?? "—"}</li>
              {data.openClaw.loadError ? (
                <li className="text-rose-600 dark:text-rose-400">{data.openClaw.loadError}</li>
              ) : null}
            </ul>
          </AdminSectionCard>

          <AdminSectionCard title="OpenClaw health">
            <div className="flex flex-wrap items-center gap-2">
              <AdminStatusBadge variant={data.openClawHealth.ok ? "healthy" : "error"}>
                {data.openClawHealth.ok ? "Reachable" : "Unreachable"}
              </AdminStatusBadge>
              {data.openClawHealth.status != null ? (
                <span className="text-xs text-slate-500">HTTP {data.openClawHealth.status}</span>
              ) : null}
              {data.openClawHealth.endpoint ? (
                <span className="text-xs text-slate-500">{data.openClawHealth.endpoint}</span>
              ) : null}
              {data.openClawHealth.message ? (
                <p className="w-full text-xs text-slate-600 dark:text-slate-400">
                  {data.openClawHealth.message}
                </p>
              ) : null}
            </div>
          </AdminSectionCard>

          <AdminSectionCard title="Environment">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              NODE_ENV: {data.environment.nodeEnv ?? "—"}
            </p>
          </AdminSectionCard>

          <AdminSectionCard title="Recommendations">
            {data.recommendations.length === 0 ? (
              <p className="text-sm text-slate-600 dark:text-slate-400">No issues flagged.</p>
            ) : (
              <ul className="list-inside list-disc space-y-1 text-sm text-amber-900 dark:text-amber-100">
                {data.recommendations.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            )}
          </AdminSectionCard>

          <AdminSectionCard title="Latest errors">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Centralized error feed is not wired yet. Use upstream logs and OpenClaw health.
            </p>
          </AdminSectionCard>
        </div>
      ) : null}
    </AdminPageShell>
  );
}
