"use client";

import { AccountMenu } from "@/components/dashboard/AccountMenu";
import { RailIcon } from "@/components/dashboard/RailIcon";
import { ThemeSwitch } from "@/components/ThemeSwitch";
import type { HeaderNavItem } from "@/data/dashboardSampleData";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";

function UtilityIcon({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      className="flex size-10 items-center justify-center rounded-full border border-neutral-300 bg-white text-slate-600 shadow-sm transition hover:border-slate-400 hover:bg-neutral-50 hover:text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-slate-500 dark:hover:bg-slate-700 dark:hover:text-white"
    >
      {children}
    </button>
  );
}

function normalizePath(pathname: string) {
  return pathname.endsWith("/") && pathname !== "/" ? pathname.slice(0, -1) : pathname;
}

export function TopNav({ items }: { items: readonly HeaderNavItem[] }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const normalizedPathname = normalizePath(pathname);
  const activeId = useMemo(() => {
    const match =
      items.find((item) => {
        if (!item.href || item.href === "#") return false;
        return normalizePath(item.href) === normalizedPathname;
      })?.id ?? null;

    // Marketplace doesn't map 1:1 to the new header sections.
    if (match) return match;
    if (normalizedPathname === "/marketplace") return "overview";
    if (normalizedPathname === "/team") return "team";
    return null;
  }, [items, normalizedPathname]);

  function closeMobileNav() {
    setMobileOpen(false);
  }

  const desktopItemBase =
    "inline-flex min-w-0 items-center gap-2 rounded-full px-3 py-1.5 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 dark:focus-visible:outline-neutral-200";
  const mobileItemBase =
    "flex min-w-0 items-center gap-3 rounded-xl px-4 py-2 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 dark:focus-visible:outline-neutral-200";

  return (
    <header className="sticky top-0 z-20 border-b border-neutral-200 bg-white/95 shadow-[0_1px_0_0_rgb(0_0_0/0.03)] backdrop-blur-sm dark:border-slate-800 dark:bg-slate-950/95 dark:shadow-[0_1px_0_0_rgb(255_255_255/0.04)]">
      <div className="mx-auto flex w-full max-w-[120rem] items-center justify-between gap-4 px-4 py-2 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="flex size-10 items-center justify-center rounded-2xl bg-slate-900 text-sm font-semibold tracking-tight text-white shadow-sm dark:bg-neutral-100 dark:text-slate-900"
          >
            AI
          </Link>
          <Link
            href="/dashboard"
            className="text-lg font-semibold tracking-tight text-slate-900 dark:text-neutral-50"
          >
            HireFlow
          </Link>

          <button
            type="button"
            aria-label="Open navigation"
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((v) => !v)}
            className="md:hidden inline-flex size-10 items-center justify-center rounded-full border border-neutral-300 bg-white text-slate-700 shadow-sm transition hover:border-slate-400 hover:bg-neutral-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-500 dark:hover:bg-slate-800"
          >
            <svg
              className="size-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>

        <nav
          className="hidden md:flex flex-1 items-center justify-center gap-1 overflow-x-auto"
          aria-label="Primary navigation"
        >
          <div className="flex items-center gap-1.5 overflow-x-auto rounded-full bg-slate-50/70 px-2 py-1 ring-1 ring-slate-200/70 dark:bg-slate-900/20 dark:ring-slate-800/60">
            {items.map((item) => {
              const isActive = item.id === activeId;
              const itemClasses = isActive
                ? `${desktopItemBase} bg-slate-900 text-white shadow-sm ring-1 ring-slate-900/20 dark:bg-neutral-100 dark:text-slate-900`
                : `${desktopItemBase} text-slate-600 hover:bg-slate-200/60 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white`;

              const icon = item.icon;
              const label = item.label;

              if (item.href && item.href !== "#") {
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    onClick={closeMobileNav}
                    aria-current={isActive ? "page" : undefined}
                    className={itemClasses}
                  >
                    <RailIcon name={icon} className="size-4 shrink-0" />
                    <span className="whitespace-nowrap text-[13px] font-semibold leading-none tracking-tight">
                      {label}
                    </span>
                  </Link>
                );
              }

              return (
                <a
                  key={item.id}
                  href="#"
                  aria-current={isActive ? "page" : undefined}
                  onClick={(e) => e.preventDefault()}
                  className={itemClasses}
                >
                  <RailIcon name={icon} className="size-4 shrink-0" />
                  <span className="whitespace-nowrap text-[13px] font-semibold leading-none tracking-tight">
                    {label}
                  </span>
                </a>
              );
            })}
          </div>
        </nav>

        <div className="flex flex-shrink-0 items-center justify-end gap-2">
          <UtilityIcon label="Search">
            <svg
              className="size-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
              />
            </svg>
          </UtilityIcon>

          <UtilityIcon label="Notifications">
            <span className="relative">
              <svg
                className="size-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
                />
              </svg>
              <span className="absolute -right-0.5 -top-0.5 flex size-2 rounded-full bg-amber-400 ring-2 ring-white dark:ring-slate-800" />
            </span>
          </UtilityIcon>

          <ThemeSwitch />

          <AccountMenu />
        </div>
      </div>

      {mobileOpen ? (
        <div className="md:hidden border-t border-neutral-200 bg-white/98 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-950/98">
          <nav className="mx-auto w-full max-w-[120rem] px-4 py-2.5 sm:px-6">
            <div className="flex flex-col gap-2">
              {items.map((item) => {
                const isActive = item.id === activeId;
                const itemClasses = isActive
                  ? `${mobileItemBase} bg-slate-900 text-white shadow-sm dark:bg-neutral-100 dark:text-slate-900`
                  : `${mobileItemBase} text-slate-700 hover:bg-neutral-100 dark:text-slate-200 dark:hover:bg-slate-800`;

                if (item.href && item.href !== "#") {
                  return (
                    <Link
                      key={item.id}
                      href={item.href}
                      onClick={closeMobileNav}
                      aria-current={isActive ? "page" : undefined}
                      className={itemClasses}
                    >
                      <RailIcon name={item.icon} className="size-4 shrink-0" />
                      <span className="min-w-0 flex-1 whitespace-nowrap text-sm font-semibold leading-none tracking-tight">
                        {item.label}
                      </span>
                    </Link>
                  );
                }

                return (
                  <a
                    key={item.id}
                    href="#"
                    aria-current={isActive ? "page" : undefined}
                    onClick={(e) => {
                      e.preventDefault();
                      closeMobileNav();
                    }}
                    className={itemClasses}
                  >
                    <RailIcon name={item.icon} className="size-4 shrink-0" />
                    <span className="min-w-0 flex-1 whitespace-nowrap text-sm font-semibold leading-none tracking-tight">
                      {item.label}
                    </span>
                  </a>
                );
              })}
            </div>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
