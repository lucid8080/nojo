"use client";

import { AdminPageShell } from "@/components/admin/AdminPageShell";
import { AdminSectionCard } from "@/components/admin/AdminSectionCard";
import { AdminStatusBadge } from "@/components/admin/AdminStatusBadge";

export function SettingsPage() {
  return (
    <AdminPageShell
      title="Settings"
      description="Platform controls and maintenance tools. Destructive actions stay disabled until explicitly gated."
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <AdminSectionCard title="Access control">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Admin access is granted via the <code className="text-xs">NOJO_ADMIN_EMAIL</code> /{" "}
            <code className="text-xs">NOJO_ADMIN_EMAILS</code> allowlist on login, or by setting{" "}
            <code className="text-xs">User.role</code> in the database.
          </p>
          <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
            UI for managing roles is not enabled yet.
          </p>
        </AdminSectionCard>

        <AdminSectionCard title="OpenClaw">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            See the System page for health and token presence. Values are never shown in full.
          </p>
        </AdminSectionCard>

        <AdminSectionCard title="Feature flags">
          <div className="flex items-center gap-2">
            <AdminStatusBadge variant="missing">placeholder</AdminStatusBadge>
            <span className="text-sm text-slate-600 dark:text-slate-400">
              No remote flags wired yet.
            </span>
          </div>
        </AdminSectionCard>

        <AdminSectionCard title="Content controls">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            CMS-style editing for skills and integrations will attach here once APIs exist.
          </p>
        </AdminSectionCard>

        <AdminSectionCard title="Maintenance tools">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Dangerous operations (DB reset, cache purge) are intentionally not exposed in this
            scaffold.
          </p>
        </AdminSectionCard>
      </div>
    </AdminPageShell>
  );
}
