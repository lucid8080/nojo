"use client";

import { useEffect } from "react";

export function AdminDetailDrawer({
  open,
  title,
  onClose,
  children,
  footer,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex justify-end">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Close panel"
        onClick={onClose}
      />
      <div
        className="relative flex h-full w-full max-w-lg flex-col border-l border-neutral-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-950"
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-drawer-title"
      >
        <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3 dark:border-slate-800">
          <h2 id="admin-drawer-title" className="text-sm font-semibold text-slate-900 dark:text-white">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Close"
          >
            <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 text-sm text-slate-700 dark:text-slate-200">
          {children}
        </div>
        {footer ? (
          <div className="border-t border-neutral-200 px-4 py-3 dark:border-slate-800">{footer}</div>
        ) : null}
      </div>
    </div>
  );
}
