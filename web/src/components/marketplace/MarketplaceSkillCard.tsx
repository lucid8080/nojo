"use client";

import { PremiumSkillBadge } from "@/components/skills/PremiumSkillBadge";
import type { MarketplaceSkillCardModel } from "@/data/marketplaceSkillCatalog";
import { getCategoryCardClasses, getCategoryTagClasses } from "@/lib/categoryColors";
import {
  importableSkillCardIconWrapClass,
  importableSkillCardLinkClass,
} from "@/lib/skillPresentation";
import { skillDetailHref } from "@/lib/nojo/resolveSkill";
import Link from "next/link";

type Props = {
  item: MarketplaceSkillCardModel;
  /** Team page uses a slightly denser grid; marketplace uses taller cards. */
  variant?: "marketplace" | "team";
};

export function MarketplaceSkillCard({ item, variant = "marketplace" }: Props) {
  const detailHref = skillDetailHref(item.id);

  if (item.kind === "cms" && item.cmsSlug) {
    const href = `/skills/cms/${encodeURIComponent(item.cmsSlug)}`;
    const isTeam = variant === "team";
    const minH = variant === "marketplace" ? "min-h-[18rem]" : "";
    const teamPrimaryCta =
      "inline-flex w-full items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-center text-sm font-semibold text-white shadow-md shadow-slate-900/10 transition hover:bg-slate-800 dark:bg-neutral-100 dark:text-slate-900 dark:shadow-none dark:hover:bg-white";
    return (
      <Link
        href={href}
        className={`${getCategoryCardClasses(item.categoryTag)} flex flex-col overflow-hidden rounded-2xl border border-neutral-200/60 bg-white/90 shadow-sm transition hover:border-neutral-300 hover:shadow-md dark:border-slate-700/60 dark:bg-slate-900/60 dark:shadow-black/20 dark:hover:border-slate-600 ${minH}`}
      >
        <div className={`flex flex-1 flex-col ${isTeam ? "p-5" : "p-4 pl-3"}`}>
          <div className="flex items-start gap-3">
            <span
              className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-white text-xl shadow-sm dark:bg-slate-800"
              aria-hidden
            >
              {item.icon ?? "📄"}
            </span>
            <div className="min-w-0 flex-1">
              <h3
                className={
                  isTeam
                    ? "font-bold text-slate-900 dark:text-white"
                    : "line-clamp-2 text-sm font-bold leading-snug text-slate-900 dark:text-neutral-100"
                }
              >
                {item.title}
              </h3>
              <span
                className={`mt-1 inline-flex w-fit rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${getCategoryTagClasses(item.categoryTag)}`}
              >
                {item.categoryTag}
              </span>
            </div>
          </div>
          <p
            className={
              isTeam
                ? "mt-3 flex-1 text-sm leading-relaxed text-slate-600 dark:text-neutral-400"
                : "mt-3 line-clamp-3 flex-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400"
            }
          >
            {item.description}
          </p>
          {isTeam ? (
            <span className={`${teamPrimaryCta} mt-4`}>View details</span>
          ) : (
            <div className="mt-auto border-t border-neutral-200/60 pt-3 dark:border-slate-700/60">
              <span className="text-xs text-slate-500 dark:text-slate-500">
                Open detail page
              </span>
            </div>
          )}
        </div>
      </Link>
    );
  }

  if (item.kind === "importable" && item.importable) {
    const sk = item.importable;
    const isTeam = variant === "team";
    const minH = variant === "marketplace" ? "min-h-[18rem]" : "";
    const teamPrimaryCta =
      "inline-flex w-full items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-center text-sm font-semibold text-white shadow-md shadow-slate-900/10 transition hover:bg-slate-800 dark:bg-neutral-100 dark:text-slate-900 dark:shadow-none dark:hover:bg-white";
    return (
      <Link
        href={detailHref}
        className={`${importableSkillCardLinkClass(sk)} flex flex-col ${minH}`}
      >
        <div
          className={`flex flex-1 flex-col ${isTeam ? "p-5" : "p-4 pl-3"}`}
        >
          <div className="flex items-start gap-3">
            <span
              className={importableSkillCardIconWrapClass(sk)}
              aria-hidden
            >
              {item.icon}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3
                  className={
                    isTeam
                      ? "font-bold text-slate-900 dark:text-white"
                      : "line-clamp-2 text-sm font-bold leading-snug text-slate-900 dark:text-neutral-100"
                  }
                >
                  {item.title}
                </h3>
                {item.isPremium ? (
                  <PremiumSkillBadge className="shrink-0" />
                ) : null}
              </div>
              <span
                className={`mt-1 inline-flex w-fit rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${getCategoryTagClasses(item.categoryTag)}`}
              >
                {item.categoryTag}
              </span>
            </div>
          </div>
          <p
            className={
              isTeam
                ? "mt-3 flex-1 text-sm leading-relaxed text-slate-600 dark:text-neutral-400"
                : "mt-3 line-clamp-3 flex-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400"
            }
          >
            {item.description}
          </p>
          {isTeam ? (
            <p className="mt-3 text-xs text-slate-500 dark:text-neutral-500">
              <span className="font-semibold text-slate-700 dark:text-neutral-300">
                Compatible:{" "}
              </span>
              {sk.compatibility}
            </p>
          ) : null}
          {isTeam ? (
            <span className={`${teamPrimaryCta} mt-4`}>View details</span>
          ) : (
            <div className="mt-auto border-t border-neutral-200/60 pt-3 dark:border-slate-700/60">
              <span className="text-xs text-slate-500 dark:text-slate-500">
                Open detail page
              </span>
            </div>
          )}
        </div>
      </Link>
    );
  }

  const cardClass = `${getCategoryCardClasses(item.categoryTag)} flex h-full min-h-[18rem] flex-col overflow-hidden rounded-2xl border border-neutral-200/60 bg-white/90 shadow-sm transition hover:border-neutral-300 hover:shadow-md dark:border-slate-700/60 dark:bg-slate-900/60 dark:shadow-black/20 dark:hover:border-slate-600`;

  return (
    <div className={cardClass}>
      <Link
        href={detailHref}
        className="flex flex-1 flex-col p-4 pl-3 outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40"
      >
        <span
          className={`mb-2 inline-flex w-fit rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${getCategoryTagClasses(item.categoryTag)}`}
        >
          {item.categoryTag}
        </span>
        <h3 className="mb-2 line-clamp-2 text-sm font-bold leading-snug text-slate-900 dark:text-neutral-100">
          {item.title}
        </h3>
        <p className="mb-4 line-clamp-3 flex-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
          {item.description}
        </p>
        <div className="mt-auto flex items-center gap-1.5 text-slate-500 dark:text-slate-500">
          <span className="text-sm" aria-hidden>
            👍
          </span>
          <span className="text-xs tabular-nums">0</span>
        </div>
      </Link>
      <div className="flex items-center justify-between gap-2 border-t border-neutral-200/60 px-4 py-2.5 dark:border-slate-700/60">
        <span className="text-xs text-slate-500 dark:text-slate-500">
          Open detail page
        </span>
        {item.githubUrl ? (
          <a
            href={item.githubUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-semibold text-sky-600 hover:underline dark:text-sky-400"
          >
            GitHub
          </a>
        ) : null}
      </div>
    </div>
  );
}
