import type { SmartSuggestion } from "@/data/smartSuggestionsMock";
import { CategoryChip } from "@/components/dashboard/smartSuggestions/CategoryChip";
import { PriorityBadge } from "@/components/dashboard/smartSuggestions/PriorityBadge";

export function FeaturedSuggestionCard({
  suggestion,
  focused,
  onAction,
  onDismiss,
}: {
  suggestion: SmartSuggestion;
  focused: boolean;
  onAction: () => void;
  onDismiss?: () => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onAction()}
      onKeyDown={(e) => {
        if (e.key === "Enter") onAction();
        if (e.key === " ") {
          e.preventDefault();
          onAction();
        }
      }}
      className={`group relative overflow-hidden rounded-3xl border transition ${
        focused
          ? "border-sky-300/80 bg-white/90 ring-2 ring-sky-500/35 dark:bg-neutral-900/60"
          : "border-neutral-200/80 bg-white/80 hover:bg-white/95 dark:border-slate-700/80 dark:bg-slate-900/55"
      }`}
      aria-label={`Featured suggestion: ${suggestion.title}`}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-sky-50/40 via-white/0 to-emerald-50/30 opacity-60 transition group-hover:opacity-100" />
      <div className="relative p-4 sm:p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <PriorityBadge priority={suggestion.priority} glowing />
          <CategoryChip category={suggestion.category} />
        </div>

        <h4 className="text-base font-bold leading-snug text-slate-900 dark:text-white">
          {suggestion.title}
        </h4>

        <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-neutral-300">
          {suggestion.description}
        </p>

        <div className="mt-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-neutral-400">
              Related job
            </p>
            <p className="truncate text-sm font-semibold text-slate-800 dark:text-neutral-200">
              {suggestion.relatedJob}
            </p>
          </div>

          <div className="shrink-0 text-right">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-neutral-400">
              Status
            </p>
            <p className="text-xs font-semibold text-slate-800 dark:text-neutral-200">
              {suggestion.status}
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onAction();
            }}
            className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 dark:bg-neutral-100 dark:text-slate-900 dark:hover:bg-white"
          >
            {suggestion.ctaLabel}
          </button>

          {suggestion.dismissible && onDismiss ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDismiss();
              }}
              className="text-sm font-semibold text-slate-700 transition hover:text-slate-900 dark:text-neutral-300 dark:hover:text-white"
            >
              Dismiss
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

