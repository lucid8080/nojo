"use client";

import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

function getInitials(name: string | null | undefined, email: string | null | undefined): string {
  if (name?.trim()) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase().slice(0, 2);
    }
    return name.slice(0, 2).toUpperCase();
  }
  if (email) {
    const local = email.split("@")[0] ?? "";
    return (local[0] ?? "").toUpperCase() + (local[1] ?? "").toUpperCase();
  }
  return "?";
}

const menuItemClass =
  "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] font-medium text-slate-700 transition hover:bg-slate-100 hover:text-slate-900 focus:bg-slate-100 focus:text-slate-900 focus:outline-none dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-white dark:focus:bg-slate-800 dark:focus:text-white";

function IconUser({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}
function IconCog({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-1.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h1.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v1.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-1.09a1.65 1.65 0 00-1.51 1z" />
    </svg>
  );
}
function IconCreditCard({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
      <path d="M1 10h22" />
    </svg>
  );
}
function IconBell({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13 16a2 2 0 01-2 2 2 2 0 01-2-2" />
    </svg>
  );
}
function IconUsers({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
    </svg>
  );
}
function IconHelp({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3M12 17h.01" />
    </svg>
  );
}
function IconKeyboard({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M8 14h.01M12 14h.01M16 14h.01" />
    </svg>
  );
}
function IconLogout({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
      <path d="M16 17l5-5-5-5M21 12H9" />
    </svg>
  );
}

export function AccountMenu() {
  const { data: session, status } = useSession();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const firstMenuItemRef = useRef<HTMLAnchorElement>(null);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (open) {
      firstMenuItemRef.current?.focus();
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        close();
        buttonRef.current?.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, close]);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        close();
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open, close]);

  if (status === "loading") {
    return (
      <div className="flex size-10 items-center justify-center rounded-full border border-neutral-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800" aria-hidden>
        <span className="text-xs font-medium text-slate-400">…</span>
      </div>
    );
  }

  if (status !== "authenticated" || !session?.user) {
    return (
      <Link
        href="/login"
        className="rounded-lg px-2.5 py-1.5 text-[13px] font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 dark:focus-visible:outline-neutral-200"
      >
        Sign in
      </Link>
    );
  }

  const email = session.user.email ?? "";
  const initials = getInitials(session.user.name, email);

  return (
    <div className="relative" ref={containerRef}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Open account menu"
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-slate-700 text-xs font-semibold text-white shadow-sm ring-2 ring-white transition hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 dark:ring-slate-900 dark:focus-visible:outline-neutral-200"
      >
        {initials}
      </button>

      {open ? (
        <div
          role="menu"
          aria-label="Account menu"
          className="absolute right-0 top-full z-50 mt-2 w-64 origin-top-right rounded-xl border border-neutral-200 bg-white py-2 shadow-lg dark:border-slate-700 dark:bg-slate-900"
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-slate-700 text-xs font-semibold text-white">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-900 dark:text-white">
                {email}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Signed in</p>
            </div>
          </div>

          <div className="my-2 border-t border-neutral-200 dark:border-slate-700" />

          {/* Menu items */}
          <div className="py-1">
            <Link ref={firstMenuItemRef} href="/dashboard/settings/profile" role="menuitem" className={menuItemClass} onClick={close}>
              <IconUser className="size-4 shrink-0" />
              Profile
            </Link>
            <Link href="/dashboard/settings/account" role="menuitem" className={menuItemClass} onClick={close}>
              <IconCog className="size-4 shrink-0" />
              Account settings
            </Link>
            <Link href="/dashboard/settings/billing" role="menuitem" className={menuItemClass} onClick={close}>
              <IconCreditCard className="size-4 shrink-0" />
              Billing
            </Link>
            <Link href="/dashboard/settings/notifications" role="menuitem" className={menuItemClass} onClick={close}>
              <IconBell className="size-4 shrink-0" />
              Notifications
            </Link>
            <Link href="/team" role="menuitem" className={menuItemClass} onClick={close}>
              <IconUsers className="size-4 shrink-0" />
              Team settings
            </Link>
            <Link href="/help" role="menuitem" className={menuItemClass} onClick={close}>
              <IconHelp className="size-4 shrink-0" />
              Help / Support
            </Link>
            <button
              type="button"
              role="menuitem"
              className={menuItemClass}
              onClick={() => close()}
            >
              <IconKeyboard className="size-4 shrink-0" />
              Keyboard shortcuts
            </button>
          </div>

          <div className="my-2 border-t border-neutral-200 dark:border-slate-700" />

          <div className="py-1">
            <button
              type="button"
              role="menuitem"
              className={`${menuItemClass} w-full text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:text-rose-400 dark:hover:bg-rose-950/50 dark:hover:text-rose-300`}
              onClick={() => {
                close();
                signOut({ callbackUrl: "/login" });
              }}
            >
              <IconLogout className="size-4 shrink-0" />
              Sign out
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
