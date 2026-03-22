"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ADMIN_NAV_ITEMS } from "@/components/admin/adminNav";

function segmentsForPath(pathname: string): { label: string; href: string }[] {
  const items = [{ label: "Admin", href: "/admin" }];
  const rest = pathname.replace(/^\//, "").split("/").filter(Boolean);
  if (rest.length <= 1) return items;
  const page = rest[1];
  if (!page) return items;
  const nav = ADMIN_NAV_ITEMS.find((n) => n.href === `/${rest.join("/")}`);
  const label = nav?.label ?? page.charAt(0).toUpperCase() + page.slice(1);
  return [...items, { label, href: `/${rest.join("/")}` }];
}

export function AdminPageShell({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname() ?? "";
  const crumbs = segmentsForPath(pathname);

  return (
    <div className="mx-auto w-full max-w-7xl">
      <nav className="mb-4 text-[13px] text-slate-500 dark:text-slate-400" aria-label="Breadcrumb">
        <ol className="flex flex-wrap items-center gap-1.5">
          {crumbs.map((c, i) => (
            <li key={c.href} className="flex items-center gap-1.5">
              {i > 0 ? <span className="text-slate-400">/</span> : null}
              {i < crumbs.length - 1 ? (
                <Link href={c.href} className="hover:text-slate-800 dark:hover:text-slate-200">
                  {c.label}
                </Link>
              ) : (
                <span className="font-medium text-slate-700 dark:text-slate-200">{c.label}</span>
              )}
            </li>
          ))}
        </ol>
      </nav>

      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
          {title}
        </h1>
        {description ? (
          <p className="mt-1 max-w-3xl text-sm text-slate-600 dark:text-slate-400">{description}</p>
        ) : null}
      </div>
      {children}
    </div>
  );
}
