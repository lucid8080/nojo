export function AdminEmptyState({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="rounded-lg border border-dashed border-neutral-300 bg-neutral-50/80 px-6 py-12 text-center dark:border-slate-700 dark:bg-slate-900/50">
      <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{title}</p>
      {description ? (
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{description}</p>
      ) : null}
    </div>
  );
}
