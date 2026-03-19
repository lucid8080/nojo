/**
 * Single source of truth for agent category colors (Tailwind + charts).
 * Add new categories by extending AGENT_CATEGORY_COLORS — unknown → slate.
 */

export type CategoryColorName =
  | "indigo"
  | "pink"
  | "blue"
  | "purple"
  | "orange"
  | "amber"
  | "cyan"
  | "teal"
  | "green"
  | "violet"
  | "stone"
  | "sky"
  | "emerald"
  | "red"
  | "slate";

/** Edit this map to register categories. Keys: normalized uppercase labels. */
export const AGENT_CATEGORY_COLORS: Record<string, CategoryColorName> = {
  ACADEMIC: "indigo",
  DESIGN: "pink",
  ENGINEERING: "blue",
  "GAME DEVELOPMENT": "purple",
  MARKETING: "orange",
  "PAID MEDIA": "amber",
  PRODUCT: "cyan",
  "PROJECT MANAGEMENT": "teal",
  SALES: "green",
  "SPATIAL COMPUTING": "violet",
  SPECIALIZED: "stone",
  STRATEGY: "sky",
  SUPPORT: "emerald",
  TESTING: "red",
};

export function normalizeCategoryKey(input: string): string {
  return input.trim().replace(/\s+/g, " ").toUpperCase();
}

/** Returns Tailwind palette name, e.g. getCategoryColor("SALES") → "green" */
export function getCategoryColor(category: string): CategoryColorName {
  if (!category?.trim()) return "slate";
  const key = normalizeCategoryKey(category);
  return AGENT_CATEGORY_COLORS[key] ?? "slate";
}

const TAG_BY_COLOR: Record<CategoryColorName, string> = {
  indigo:
    "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
  pink: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400",
  blue: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  purple:
    "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  orange:
    "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  amber:
    "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  cyan: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
  teal: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
  green:
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  violet:
    "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
  stone:
    "bg-stone-100 text-stone-700 dark:bg-stone-900/40 dark:text-stone-400",
  sky: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",
  emerald:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  red: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  slate:
    "bg-slate-100 text-slate-700 dark:bg-slate-800/50 dark:text-slate-400",
};

const CARD_BY_COLOR: Record<CategoryColorName, string> = {
  indigo:
    "border-l-4 border-indigo-500 bg-indigo-50/60 dark:border-indigo-400 dark:bg-indigo-950/20",
  pink: "border-l-4 border-pink-500 bg-pink-50/60 dark:border-pink-400 dark:bg-pink-950/20",
  blue: "border-l-4 border-blue-500 bg-blue-50/60 dark:border-blue-400 dark:bg-blue-950/20",
  purple:
    "border-l-4 border-purple-500 bg-purple-50/60 dark:border-purple-400 dark:bg-purple-950/20",
  orange:
    "border-l-4 border-orange-500 bg-orange-50/60 dark:border-orange-400 dark:bg-orange-950/20",
  amber:
    "border-l-4 border-amber-500 bg-amber-50/60 dark:border-amber-400 dark:bg-amber-950/20",
  cyan: "border-l-4 border-cyan-500 bg-cyan-50/60 dark:border-cyan-400 dark:bg-cyan-950/20",
  teal: "border-l-4 border-teal-500 bg-teal-50/60 dark:border-teal-400 dark:bg-teal-950/20",
  green:
    "border-l-4 border-green-500 bg-green-50/60 dark:border-green-400 dark:bg-green-950/20",
  violet:
    "border-l-4 border-violet-500 bg-violet-50/60 dark:border-violet-400 dark:bg-violet-950/20",
  stone:
    "border-l-4 border-stone-500 bg-stone-50/60 dark:border-stone-400 dark:bg-stone-950/25",
  sky: "border-l-4 border-sky-500 bg-sky-50/60 dark:border-sky-400 dark:bg-sky-950/20",
  emerald:
    "border-l-4 border-emerald-500 bg-emerald-50/60 dark:border-emerald-400 dark:bg-emerald-950/20",
  red: "border-l-4 border-red-500 bg-red-50/60 dark:border-red-400 dark:bg-red-950/20",
  slate:
    "border-l-4 border-slate-400 bg-slate-50/60 dark:border-slate-500 dark:bg-slate-900/30",
};

/** Skill / filter pill: bg-100, text-700 + dark tints */
export function getCategoryTagClasses(category: string): string {
  return TAG_BY_COLOR[getCategoryColor(category)];
}

/** Marketplace-style card: left border + light background tint */
export function getCategoryCardClasses(category: string): string {
  return CARD_BY_COLOR[getCategoryColor(category)];
}

/** Filter chip selected (category-specific) */
export function getCategoryFilterSelectedClasses(category: string): string {
  const c = getCategoryColor(category);
  const selected: Record<CategoryColorName, string> = {
    indigo:
      "border-2 border-indigo-500 bg-indigo-100 text-indigo-900 dark:border-indigo-400 dark:bg-indigo-950/40 dark:text-indigo-300",
    pink: "border-2 border-pink-500 bg-pink-100 text-pink-900 dark:border-pink-400 dark:bg-pink-950/40 dark:text-pink-300",
    blue: "border-2 border-blue-500 bg-blue-100 text-blue-900 dark:border-blue-400 dark:bg-blue-950/40 dark:text-blue-300",
    purple:
      "border-2 border-purple-500 bg-purple-100 text-purple-900 dark:border-purple-400 dark:bg-purple-950/40 dark:text-purple-300",
    orange:
      "border-2 border-orange-500 bg-orange-100 text-orange-900 dark:border-orange-400 dark:bg-orange-950/40 dark:text-orange-300",
    amber:
      "border-2 border-amber-500 bg-amber-100 text-amber-950 dark:border-amber-400 dark:bg-amber-950/40 dark:text-amber-300",
    cyan: "border-2 border-cyan-500 bg-cyan-100 text-cyan-900 dark:border-cyan-400 dark:bg-cyan-950/40 dark:text-cyan-300",
    teal: "border-2 border-teal-500 bg-teal-100 text-teal-900 dark:border-teal-400 dark:bg-teal-950/40 dark:text-teal-300",
    green:
      "border-2 border-green-500 bg-green-100 text-green-900 dark:border-green-400 dark:bg-green-950/40 dark:text-green-300",
    violet:
      "border-2 border-violet-500 bg-violet-100 text-violet-900 dark:border-violet-400 dark:bg-violet-950/40 dark:text-violet-300",
    stone:
      "border-2 border-stone-500 bg-stone-100 text-stone-900 dark:border-stone-400 dark:bg-stone-950/40 dark:text-stone-300",
    sky: "border-2 border-sky-500 bg-sky-100 text-sky-900 dark:border-sky-400 dark:bg-sky-950/40 dark:text-sky-300",
    emerald:
      "border-2 border-emerald-500 bg-emerald-100 text-emerald-900 dark:border-emerald-400 dark:bg-emerald-950/40 dark:text-emerald-300",
    red: "border-2 border-red-500 bg-red-100 text-red-900 dark:border-red-400 dark:bg-red-950/40 dark:text-red-300",
    slate:
      "border-2 border-slate-500 bg-slate-200 text-slate-900 dark:border-slate-500 dark:bg-slate-800 dark:text-slate-200",
  };
  return selected[c];
}

const AVATAR_FRAME: Record<CategoryColorName, string> = {
  indigo: "bg-indigo-200 dark:bg-indigo-900/50",
  pink: "bg-pink-200 dark:bg-pink-900/50",
  blue: "bg-blue-200 dark:bg-blue-900/50",
  purple: "bg-purple-200 dark:bg-purple-900/50",
  orange: "bg-orange-200 dark:bg-orange-900/50",
  amber: "bg-amber-200 dark:bg-amber-900/50",
  cyan: "bg-cyan-200 dark:bg-cyan-900/50",
  teal: "bg-teal-200 dark:bg-teal-900/50",
  green: "bg-green-200 dark:bg-green-900/50",
  violet: "bg-violet-200 dark:bg-violet-900/50",
  stone: "bg-stone-200 dark:bg-stone-800/60",
  sky: "bg-sky-200 dark:bg-sky-900/50",
  emerald: "bg-emerald-200 dark:bg-emerald-900/50",
  red: "bg-red-200 dark:bg-red-900/50",
  slate: "bg-slate-200 dark:bg-slate-700/50",
};

const AVATAR_FALLBACK: Record<CategoryColorName, string> = {
  indigo: "bg-indigo-200 text-indigo-950 dark:bg-indigo-900/60 dark:text-indigo-200",
  pink: "bg-pink-200 text-pink-950 dark:bg-pink-900/60 dark:text-pink-200",
  blue: "bg-blue-200 text-blue-950 dark:bg-blue-900/60 dark:text-blue-200",
  purple: "bg-purple-200 text-purple-950 dark:bg-purple-900/60 dark:text-purple-200",
  orange: "bg-orange-200 text-orange-950 dark:bg-orange-900/60 dark:text-orange-200",
  amber: "bg-amber-200 text-amber-950 dark:bg-amber-900/60 dark:text-amber-200",
  cyan: "bg-cyan-200 text-cyan-950 dark:bg-cyan-900/60 dark:text-cyan-200",
  teal: "bg-teal-200 text-teal-950 dark:bg-teal-900/60 dark:text-teal-200",
  green: "bg-green-200 text-green-950 dark:bg-green-900/60 dark:text-green-200",
  violet: "bg-violet-200 text-violet-950 dark:bg-violet-900/60 dark:text-violet-200",
  stone: "bg-stone-200 text-stone-900 dark:bg-stone-800 dark:text-stone-200",
  sky: "bg-sky-200 text-sky-950 dark:bg-sky-900/60 dark:text-sky-200",
  emerald: "bg-emerald-200 text-emerald-950 dark:bg-emerald-900/60 dark:text-emerald-200",
  red: "bg-red-200 text-red-950 dark:bg-red-900/60 dark:text-red-200",
  slate: "bg-slate-200 text-slate-900 dark:bg-slate-700 dark:text-slate-100",
};

export function getCategoryAvatarFrameClass(category: string): string {
  return AVATAR_FRAME[getCategoryColor(category)];
}

export function getCategoryAvatarFallbackClass(category: string): string {
  return AVATAR_FALLBACK[getCategoryColor(category)];
}

/** Tailwind 500-aligned hex for Recharts (deterministic per category) */
const CHART_HEX_500: Record<CategoryColorName, string> = {
  indigo: "#6366f1",
  pink: "#ec4899",
  blue: "#3b82f6",
  purple: "#a855f7",
  orange: "#f97316",
  amber: "#f59e0b",
  cyan: "#06b6d4",
  teal: "#14b8a6",
  green: "#22c55e",
  violet: "#8b5cf6",
  stone: "#78716c",
  sky: "#0ea5e9",
  emerald: "#10b981",
  red: "#ef4444",
  slate: "#64748b",
};

export function getCategoryChartHex(category: string): string {
  return CHART_HEX_500[getCategoryColor(category)];
}

const ROW_ACCENT: Record<CategoryColorName, string> = {
  indigo: "border-l-[3px] border-l-indigo-500 dark:border-l-indigo-400",
  pink: "border-l-[3px] border-l-pink-500 dark:border-l-pink-400",
  blue: "border-l-[3px] border-l-blue-500 dark:border-l-blue-400",
  purple: "border-l-[3px] border-l-purple-500 dark:border-l-purple-400",
  orange: "border-l-[3px] border-l-orange-500 dark:border-l-orange-400",
  amber: "border-l-[3px] border-l-amber-500 dark:border-l-amber-400",
  cyan: "border-l-[3px] border-l-cyan-500 dark:border-l-cyan-400",
  teal: "border-l-[3px] border-l-teal-500 dark:border-l-teal-400",
  green: "border-l-[3px] border-l-green-500 dark:border-l-green-400",
  violet: "border-l-[3px] border-l-violet-500 dark:border-l-violet-400",
  stone: "border-l-[3px] border-l-stone-500 dark:border-l-stone-400",
  sky: "border-l-[3px] border-l-sky-500 dark:border-l-sky-400",
  emerald: "border-l-[3px] border-l-emerald-500 dark:border-l-emerald-400",
  red: "border-l-[3px] border-l-red-500 dark:border-l-red-400",
  slate: "border-l-[3px] border-l-slate-400 dark:border-l-slate-500",
};

/** Table row left accent by agent category */
export function getCategoryRowAccentClasses(category: string): string {
  return ROW_ACCENT[getCategoryColor(category)];
}
