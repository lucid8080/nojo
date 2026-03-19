"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { getAgentAvatarFilename, setAgentAvatarFilename } from "@/lib/agentAvatars";

type AvatarListResponse =
  | {
      avatars: { filename: string; url: string }[];
      count: number;
      sourceDir?: string;
    }
  | {
      error: string;
      details?: string;
      hint?: string;
      sourceDir?: string;
    };

export function AgentAvatarPicker({
  open,
  agentKey,
  agentLabel,
  onClose,
  onChanged,
}: {
  open: boolean;
  agentKey: string;
  agentLabel: string;
  onClose: () => void;
  onChanged?: (filename: string | null) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<AvatarListResponse | null>(null);

  const selectedFilename = useMemo(
    () => getAgentAvatarFilename(agentKey),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [open, agentKey],
  );

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setData(null);
    fetch("/api/avatars", { cache: "no-store" })
      .then((r) => r.json() as Promise<AvatarListResponse>)
      .then((json) => {
        if (!cancelled) setData(json);
      })
      .catch((e) => {
        if (!cancelled)
          setData({
            error: "Failed to load avatar list.",
            details: e instanceof Error ? e.message : String(e),
          });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  if (!open) return null;

  const isError = data != null && "error" in data;
  const avatars = data != null && "avatars" in data ? data.avatars : [];

  function choose(filename: string | null) {
    setAgentAvatarFilename(agentKey, filename);
    onChanged?.(filename);
  }

  const modal = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Choose avatar for ${agentLabel}`}
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
      <div className="relative w-full max-w-xl rounded-3xl border border-neutral-200/60 bg-white p-5 shadow-xl dark:border-slate-700/70 dark:bg-slate-900">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Agent Avatar
            </p>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-neutral-100">
              {agentLabel}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-neutral-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            Close
          </button>
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => choose(null)}
            className="rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-neutral-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            Clear
          </button>
          {selectedFilename ? (
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Selected: <span className="font-mono">{selectedFilename}</span>
            </span>
          ) : (
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Selected: initials
            </span>
          )}
        </div>

        {loading ? (
          <p className="text-sm text-slate-600 dark:text-slate-400">Loading…</p>
        ) : isError ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200">
            <div className="font-semibold">{(data as any).error}</div>
            {(data as any).hint ? <div className="mt-1">{(data as any).hint}</div> : null}
            {(data as any).sourceDir ? (
              <div className="mt-2 text-xs opacity-90">
                sourceDir: <span className="font-mono">{(data as any).sourceDir}</span>
              </div>
            ) : null}
            {(data as any).details ? (
              <div className="mt-2 text-xs opacity-90">
                details: <span className="font-mono">{(data as any).details}</span>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-3 sm:grid-cols-6">
            {avatars.map((a) => {
              const active = selectedFilename === a.filename;
              return (
                <button
                  key={a.filename}
                  type="button"
                  onClick={() => choose(a.filename)}
                  className={`group relative overflow-hidden rounded-2xl border p-1 transition ${
                    active
                      ? "border-sky-300 bg-sky-50 dark:border-sky-800 dark:bg-sky-950/30"
                      : "border-neutral-200 bg-white hover:bg-neutral-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800/60"
                  }`}
                  title={a.filename}
                >
                  <img
                    src={a.url}
                    alt={a.filename}
                    className="aspect-square w-full rounded-xl object-cover"
                    loading="lazy"
                  />
                </button>
              );
            })}
          </div>
        )}

        <div className="mt-5 flex items-center justify-end">
          <button
            type="button"
            onClick={() => {
              onChanged?.(getAgentAvatarFilename(agentKey));
              onClose();
            }}
            className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 dark:bg-neutral-100 dark:text-slate-900 dark:hover:bg-white"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== "undefined"
    ? createPortal(modal, document.body)
    : null;
}

