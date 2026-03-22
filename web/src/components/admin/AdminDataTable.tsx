"use client";

export function AdminDataTable({
  children,
  empty,
}: {
  children: React.ReactNode;
  empty?: boolean;
}) {
  if (empty) {
    return null;
  }
  return (
    <div className="overflow-x-auto rounded-lg border border-neutral-200 dark:border-slate-800">
      <table className="w-full min-w-[640px] border-collapse text-left text-[13px]">
        {children}
      </table>
    </div>
  );
}

export function AdminTableHead({ children }: { children: React.ReactNode }) {
  return (
    <thead className="border-b border-neutral-200 bg-neutral-50 dark:border-slate-800 dark:bg-slate-900/80">
      {children}
    </thead>
  );
}

export function AdminTableRow({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <tr
      className={`border-b border-neutral-100 dark:border-slate-800 ${
        onClick ? "cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50" : ""
      }`}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      tabIndex={onClick ? 0 : undefined}
      role={onClick ? "button" : undefined}
    >
      {children}
    </tr>
  );
}

export function AdminTableCell({
  children,
  className = "",
  compact,
}: {
  children: React.ReactNode;
  className?: string;
  compact?: boolean;
}) {
  return (
    <td className={`${compact ? "px-3 py-2" : "px-4 py-3"} align-top text-slate-700 dark:text-slate-200 ${className}`}>
      {children}
    </td>
  );
}

export function AdminTableHeaderCell({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      scope="col"
      className={`px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 ${className}`}
    >
      {children}
    </th>
  );
}
