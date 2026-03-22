"use client";

export function AdminFilterBar({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
      {children}
    </div>
  );
}
