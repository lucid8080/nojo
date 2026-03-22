export function AdminSkeleton({ className = "h-8" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-md bg-slate-200/80 dark:bg-slate-800 ${className}`}
      aria-hidden
    />
  );
}

export function AdminTableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <AdminSkeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  );
}
