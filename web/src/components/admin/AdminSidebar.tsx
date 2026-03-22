"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ADMIN_NAV_ITEMS } from "@/components/admin/adminNav";

function navActive(pathname: string, href: string, exact?: boolean): boolean {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminSidebar({
  mobileOpen,
  onClose,
}: {
  mobileOpen: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname() ?? "";

  const linkClass = (active: boolean) =>
    `flex items-center rounded-lg px-3 py-2 text-[13px] font-medium transition ${
      active
        ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
        : "text-slate-600 hover:bg-slate-200/80 dark:text-slate-300 dark:hover:bg-slate-800"
    }`;

  return (
    <>
      {mobileOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          aria-label="Close menu"
          onClick={onClose}
        />
      ) : null}

      <aside
        className={`fixed left-0 top-0 z-50 flex h-full w-56 flex-col border-r border-neutral-200 bg-white dark:border-slate-800 dark:bg-slate-900 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        } transition-transform duration-200 ease-out md:translate-x-0`}
      >
        <div className="flex h-14 items-center border-b border-neutral-200 px-4 dark:border-slate-800">
          <Link
            href="/admin"
            className="text-sm font-semibold tracking-tight text-slate-900 dark:text-white"
            onClick={onClose}
          >
            Nojo Admin
          </Link>
        </div>
        <nav className="flex-1 space-y-0.5 overflow-y-auto p-3" aria-label="Admin">
          {ADMIN_NAV_ITEMS.map((item) => {
            const active = navActive(pathname, item.href, "exact" in item ? item.exact : false);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={linkClass(active)}
                onClick={onClose}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-neutral-200 p-3 text-[11px] text-slate-500 dark:border-slate-800 dark:text-slate-400">
          <Link href="/workspace" className="hover:underline" onClick={onClose}>
            Back to workspace
          </Link>
        </div>
      </aside>
    </>
  );
}
