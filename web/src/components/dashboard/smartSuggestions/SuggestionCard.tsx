import type { SmartSuggestion } from "@/data/smartSuggestionsMock";
import { CategoryChip } from "@/components/dashboard/smartSuggestions/CategoryChip";

export function SuggestionCard({
  suggestion,
  focused,
  onAction,
  onDismiss,
  compact = false,
}: {
  suggestion: SmartSuggestion;
  focused: boolean;
  onAction: () => void;
  onDismiss?: () => void;
  compact?: boolean;
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
      className={`group relative w-full shrink-0 overflow-hidden rounded-2xl border p-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${
        focused
          ? "border-sky-300/90 bg-white/90 ring-2 ring-sky-500/20"
          : "border-neutral-200/80 bg-white/75 hover:bg-white/95 dark:border-slate-700/80 dark:bg-slate-900/55 dark:hover:bg-slate-900/80"
      }`}
      aria-label={`Suggestion: ${suggestion.title}`}
    >
      <div className="absolute inset-0 opacity-0 transition group-hover:opacity-100 group-hover:bg-gradient-to-br group-hover:from-sky-50/30 group-hover:to-emerald-50/10" />

      <div className="relative flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <CategoryChip category={suggestion.category} />
          </div>
          <h5 className="mt-2 truncate text-sm font-bold text-slate-900 dark:text-white">
            {suggestion.title}
          </h5>
          <p className="mt-1 line-clamp-1 text-xs text-slate-600 dark:text-neutral-300">
            {suggestion.description}
          </p>

          {!compact ? (
            <p className="mt-2 truncate text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              Related:{" "}
              <span className="font-semibold text-slate-700 dark:text-neutral-200">
                {suggestion.relatedJob}
              </span>
            </p>
          ) : null}
        </div>

        {suggestion.dismissible && onDismiss ? (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onDismiss();
            }}
            aria-label={`Dismiss ${suggestion.title}`}
            className="relative z-10 inline-flex size-9 items-center justify-center rounded-xl border border-neutral-200/80 bg-white/70 text-slate-600 transition hover:bg-white dark:border-slate-700/60 dark:bg-slate-900/60 dark:text-neutral-200 dark:hover:bg-slate-900/80"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M6 6l12 12M18 6 6 18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        ) : null}
      </div>

      {!compact ? (
        <div className="relative mt-3 flex items-center justify-between gap-3">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Next action
          </span>
          <span className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white shadow-sm transition group-hover:bg-slate-800 dark:bg-neutral-100 dark:text-slate-900 dark:hover:bg-white">
            {suggestion.ctaLabel}
          </span>
        </div>
      ) : (
        <div className="relative mt-3">
          <span className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white shadow-sm transition group-hover:bg-slate-800 dark:bg-neutral-100 dark:text-slate-900 dark:hover:bg-white">
            {suggestion.ctaLabel}
          </span>
        </div>
      )}
    </div>
  );
}

