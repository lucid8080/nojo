"use client";

import { useEffect, useState } from "react";
import { AdminDataTable, AdminTableCell, AdminTableHead, AdminTableHeaderCell, AdminTableRow } from "@/components/admin/AdminDataTable";
import { AdminEmptyState } from "@/components/admin/AdminEmptyState";
import { AdminPageShell } from "@/components/admin/AdminPageShell";
import { AdminSectionCard } from "@/components/admin/AdminSectionCard";
import { AdminSkeleton } from "@/components/admin/AdminSkeleton";
import { AdminStatusBadge } from "@/components/admin/AdminStatusBadge";

export function ContentPage() {
  const [tab, setTab] = useState<"skills" | "integrations">("skills");
  const [data, setData] = useState<{
    skills: unknown[];
    integrations: unknown[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/admin/content", { cache: "no-store" });
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

  const skills = (data?.skills as Record<string, unknown>[]) ?? [];
  const integrations = (data?.integrations as Record<string, unknown>[]) ?? [];

  return (
    <AdminPageShell
      title="Content"
      description="Read-only index of bundled skills and integrations. Editing backend is not enabled."
    >
      <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
        Editing backend is not yet enabled for bundled catalog rows. To create full skill definition cards
        (markdown + metadata), use{" "}
        <a
          href="/admin/skill-cards"
          className="font-semibold text-amber-900 underline hover:no-underline dark:text-amber-50"
        >
          Skill cards
        </a>
        .
      </div>

      {error ? (
        <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-100">
          {error}
        </div>
      ) : null}

      <div className="mb-6 flex gap-2 border-b border-neutral-200 dark:border-slate-800">
        <button
          type="button"
          className={`border-b-2 px-3 py-2 text-sm font-medium ${
            tab === "skills"
              ? "border-slate-900 text-slate-900 dark:border-white dark:text-white"
              : "border-transparent text-slate-500"
          }`}
          onClick={() => setTab("skills")}
        >
          Skills
        </button>
        <button
          type="button"
          className={`border-b-2 px-3 py-2 text-sm font-medium ${
            tab === "integrations"
              ? "border-slate-900 text-slate-900 dark:border-white dark:text-white"
              : "border-transparent text-slate-500"
          }`}
          onClick={() => setTab("integrations")}
        >
          Integrations
        </button>
      </div>

      {loading ? <AdminSkeleton className="h-40 w-full" /> : null}

      {!loading && tab === "skills" ? (
        <AdminSectionCard title="Skills catalog">
          {skills.length === 0 ? (
            <AdminEmptyState title="No skills" />
          ) : (
            <AdminDataTable empty={false}>
              <AdminTableHead>
                <tr>
                  <AdminTableHeaderCell>Title</AdminTableHeaderCell>
                  <AdminTableHeaderCell>Kind</AdminTableHeaderCell>
                  <AdminTableHeaderCell>Source</AdminTableHeaderCell>
                  <AdminTableHeaderCell>Flags</AdminTableHeaderCell>
                </tr>
              </AdminTableHead>
              <tbody>
                {skills.map((s) => (
                  <AdminTableRow key={String(s.id)}>
                    <AdminTableCell compact>{String(s.title)}</AdminTableCell>
                    <AdminTableCell compact>{String(s.kind)}</AdminTableCell>
                    <AdminTableCell compact>{String(s.source)}</AdminTableCell>
                    <AdminTableCell compact>
                      <div className="flex flex-wrap gap-1">
                        {s.isPremium ? (
                          <AdminStatusBadge variant="warning">premium</AdminStatusBadge>
                        ) : null}
                        {s.importable ? (
                          <AdminStatusBadge variant="configured">importable</AdminStatusBadge>
                        ) : (
                          <AdminStatusBadge variant="unknown">bundled</AdminStatusBadge>
                        )}
                      </div>
                    </AdminTableCell>
                  </AdminTableRow>
                ))}
              </tbody>
            </AdminDataTable>
          )}
        </AdminSectionCard>
      ) : null}

      {!loading && tab === "integrations" ? (
        <AdminSectionCard title="Integrations catalog">
          {integrations.length === 0 ? (
            <AdminEmptyState title="No integrations" />
          ) : (
            <AdminDataTable empty={false}>
              <AdminTableHead>
                <tr>
                  <AdminTableHeaderCell>Name</AdminTableHeaderCell>
                  <AdminTableHeaderCell>Category</AdminTableHeaderCell>
                  <AdminTableHeaderCell>Source</AdminTableHeaderCell>
                </tr>
              </AdminTableHead>
              <tbody>
                {integrations.map((i) => (
                  <AdminTableRow key={String(i.id)}>
                    <AdminTableCell compact>{String(i.name)}</AdminTableCell>
                    <AdminTableCell compact>{String(i.categoryName)}</AdminTableCell>
                    <AdminTableCell compact>{String(i.source)}</AdminTableCell>
                  </AdminTableRow>
                ))}
              </tbody>
            </AdminDataTable>
          )}
        </AdminSectionCard>
      ) : null}
    </AdminPageShell>
  );
}
