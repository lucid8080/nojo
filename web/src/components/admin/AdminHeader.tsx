"use client";

import { signOut } from "next-auth/react";
import { ThemeSwitch } from "@/components/ThemeSwitch";

export function AdminHeader({
  userEmail,
  onMenu,
}: {
  userEmail: string | null;
  onMenu: () => void;
}) {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-neutral-200 bg-white/95 px-4 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95 md:px-6">
      <button
        type="button"
        className="inline-flex items-center justify-center rounded-lg border border-neutral-200 p-2 text-slate-700 md:hidden dark:border-slate-700 dark:text-slate-200"
        aria-label="Open menu"
        onClick={onMenu}
      >
        <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
        </svg>
      </button>

      <div className="relative min-w-0 flex-1">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
          <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
          </svg>
        </span>
        <input
          type="search"
          readOnly
          placeholder="Search (coming soon)"
          className="w-full max-w-md rounded-lg border border-neutral-200 bg-neutral-50 py-2 pl-9 pr-3 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400"
          aria-label="Search placeholder"
        />
      </div>

      <ThemeSwitch />

      <div className="hidden min-w-0 sm:block">
        <p className="truncate text-right text-xs text-slate-500 dark:text-slate-400">
          {userEmail ?? "Admin"}
        </p>
      </div>

      <button
        type="button"
        onClick={() => signOut({ callbackUrl: "/login" })}
        className="shrink-0 rounded-lg px-2.5 py-1.5 text-[13px] font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
      >
        Sign out
      </button>
    </header>
  );
}
