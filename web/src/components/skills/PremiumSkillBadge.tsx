/**
 * Label for importable skills with `isPremium` in catalog metadata.
 */
export function PremiumSkillBadge({
  className = "",
}: {
  /** Extra classes for layout (e.g. shrink-0). */
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full border border-amber-300/70 bg-gradient-to-r from-amber-100/90 to-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-950 shadow-sm dark:border-amber-500/40 dark:from-amber-900/50 dark:to-amber-950/40 dark:text-amber-100 ${className}`}
    >
      Premium
    </span>
  );
}
