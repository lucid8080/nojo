export function AdminSectionCard({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-neutral-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between gap-3 border-b border-neutral-200 px-4 py-3 dark:border-slate-800">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white">{title}</h2>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}
