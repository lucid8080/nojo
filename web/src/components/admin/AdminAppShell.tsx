"use client";

import { useState } from "react";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { AdminSidebar } from "@/components/admin/AdminSidebar";

export function AdminAppShell({
  userEmail,
  children,
}: {
  userEmail: string | null;
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-neutral-100 text-slate-900 dark:bg-slate-950 dark:text-neutral-100">
      <div className="flex min-h-screen">
        <AdminSidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
        <div className="flex min-h-screen min-w-0 flex-1 flex-col md:pl-56">
          <AdminHeader userEmail={userEmail} onMenu={() => setMobileOpen(true)} />
          <div className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</div>
        </div>
      </div>
    </div>
  );
}
