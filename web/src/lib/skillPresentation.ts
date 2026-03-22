import type { ImportableSkill } from "@/data/marketplaceSkillCatalog";
import { getCategoryCardClasses } from "@/lib/categoryColors";

export function isPremiumImportableSkill(skill: ImportableSkill): boolean {
  return skill.isPremium === true;
}

/** Team / marketplace grid card (Link wrapper). */
export function importableSkillCardLinkClass(skill: ImportableSkill): string {
  if (isPremiumImportableSkill(skill)) {
    return [
      "flex flex-col rounded-2xl border border-amber-200/85 bg-gradient-to-br from-amber-50/90 via-white to-sky-50/35 p-5 shadow-md shadow-amber-900/[0.06] ring-1 ring-amber-400/25 transition",
      "hover:border-amber-300 hover:shadow-lg hover:shadow-amber-900/[0.08] hover:ring-amber-400/35",
      "dark:border-amber-500/30 dark:from-amber-950/45 dark:via-slate-900 dark:to-slate-950 dark:shadow-amber-950/20 dark:ring-amber-500/20",
      "dark:hover:border-amber-500/50 dark:hover:ring-amber-400/30",
    ].join(" ");
  }
  return [
    "flex flex-col rounded-2xl border border-neutral-200/90 bg-gradient-to-b from-white to-neutral-50/80 p-5 shadow-sm transition",
    "hover:border-sky-300/80 hover:shadow-md dark:border-slate-700 dark:from-slate-900 dark:to-slate-900/80 dark:hover:border-sky-800/80",
  ].join(" ");
}

/** Icon well inside marketplace skill cards. */
export function importableSkillCardIconWrapClass(skill: ImportableSkill): string {
  if (isPremiumImportableSkill(skill)) {
    return [
      "flex size-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-50 to-white text-xl shadow-md ring-1 ring-amber-200/60",
      "dark:from-amber-950/55 dark:to-slate-800 dark:ring-amber-500/25",
    ].join(" ");
  }
  return "flex size-11 shrink-0 items-center justify-center rounded-xl bg-white text-xl shadow-sm dark:bg-slate-800";
}

const IMPORTABLE_DETAIL_BASE =
  "rounded-2xl border p-6 shadow-sm dark:border-slate-700/60";

/** Skill detail page hero card for importable skills. */
/** Large icon well on importable skill detail header. */
export function importableSkillDetailIconWrapClass(
  skill: ImportableSkill,
): string {
  if (isPremiumImportableSkill(skill)) {
    return [
      "flex size-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-50 to-white text-2xl shadow-md ring-1 ring-amber-200/60",
      "dark:from-amber-950/50 dark:to-slate-800 dark:ring-amber-500/25",
    ].join(" ");
  }
  return "flex size-14 shrink-0 items-center justify-center rounded-2xl bg-white text-2xl shadow-sm dark:bg-slate-800";
}

export function importableSkillDetailArticleClass(skill: ImportableSkill): string {
  const categoryTint = getCategoryCardClasses(skill.category);
  if (!isPremiumImportableSkill(skill)) {
    return [
      IMPORTABLE_DETAIL_BASE,
      "border-neutral-200/60 bg-white/90 dark:bg-slate-900/60",
      categoryTint,
    ].join(" ");
  }
  return [
    IMPORTABLE_DETAIL_BASE,
    "border-amber-200/85 bg-gradient-to-br from-amber-50/85 via-white/95 to-sky-50/45 shadow-md shadow-amber-900/[0.07] ring-1 ring-amber-400/25",
    "dark:border-amber-500/35 dark:from-amber-950/40 dark:via-slate-900/92 dark:to-slate-950 dark:shadow-amber-950/25 dark:ring-amber-500/18",
    categoryTint,
  ].join(" ");
}
