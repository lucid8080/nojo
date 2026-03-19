"use client";

import type { TeamAgent } from "@/data/teamPageMock";
import {
  getCategoryAvatarFallbackClass,
  getCategoryAvatarFrameClass,
} from "@/lib/categoryColors";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

function toastStub(msg: string) {
  if (typeof window !== "undefined" && window.console) {
    console.info("[Agent details]", msg);
  }
}

export function TeamAgentAvatar({
  agent,
  size,
}: {
  agent: TeamAgent;
  size: "card" | "panel";
}) {
  const [imgError, setImgError] = useState(false);
  const src = `/avatar/${encodeURIComponent(agent.avatarFile)}`;
  const isPanel = size === "panel";
  const frame = getCategoryAvatarFrameClass(agent.categoryLabel);

  if (imgError) {
    return (
      <div
        className={`flex shrink-0 items-center justify-center text-sm font-bold shadow-sm ring-2 ring-white dark:ring-slate-900 transition-transform duration-200 ease-out hover:scale-110 ${getCategoryAvatarFallbackClass(agent.categoryLabel)} ${isPanel ? "size-14 text-lg rounded-2xl" : "size-11 text-xs rounded-xl"}`}
        aria-hidden
      >
        {agent.initials}
      </div>
    );
  }

  const inner = isPanel ? "size-14 rounded-2xl" : "size-11 rounded-xl";
  return (
    <span
      className={`inline-flex shrink-0 p-0.5 shadow-sm ring-2 ring-white dark:ring-slate-900 transition-transform duration-200 ease-out hover:scale-110 ${frame} ${isPanel ? "rounded-2xl" : "rounded-xl"}`}
    >
      <Image
        src={src}
        alt=""
        width={isPanel ? 56 : 44}
        height={isPanel ? 56 : 44}
        className={`shrink-0 object-cover ${inner}`}
        onError={() => setImgError(true)}
      />
    </span>
  );
}

export function AgentDetailsSheet({
  agent,
  open,
  onClose,
}: {
  agent: TeamAgent | null;
  open: boolean;
  onClose: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => closeBtnRef.current?.focus(), 100);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open || !agent) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end"
      role="presentation"
    >
      <button
        type="button"
        aria-label="Close panel"
        className="team-panel-backdrop absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] dark:bg-black/50"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="team-agent-panel-title"
        data-team-panel
        className="team-panel-sheet relative flex h-full w-full max-w-full flex-col bg-white shadow-2xl dark:bg-slate-900 sm:max-w-md sm:rounded-l-3xl sm:shadow-xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-neutral-200 px-5 py-4 dark:border-slate-700">
          <div className="flex min-w-0 items-center gap-3">
            <TeamAgentAvatar agent={agent} size="panel" />
            <div className="min-w-0">
              <h2
                id="team-agent-panel-title"
                className="truncate text-lg font-bold text-slate-900 dark:text-white"
              >
                {agent.name}
              </h2>
              <p className="text-sm text-slate-600 dark:text-neutral-400">
                {agent.role}
              </p>
            </div>
          </div>
          <button
            ref={closeBtnRef}
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-500 transition hover:bg-neutral-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white"
            aria-label="Close"
          >
            <svg
              className="size-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <section className="mb-6">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-neutral-500">
              Profile
            </h3>
            <p className="text-sm leading-relaxed text-slate-700 dark:text-neutral-300">
              {agent.description}
            </p>
          </section>

          <section className="mb-6">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-neutral-500">
              Role & objective
            </h3>
            <p className="text-sm text-slate-700 dark:text-neutral-300">
              {agent.objective}
            </p>
          </section>

          <section className="mb-6">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-neutral-500">
              Tools connected
            </h3>
            <ul className="flex flex-wrap gap-2">
              {agent.tools.map((t) => (
                <li
                  key={t}
                  className="rounded-lg bg-neutral-100 px-2.5 py-1 text-xs font-medium text-slate-800 dark:bg-slate-800 dark:text-neutral-200"
                >
                  {t}
                </li>
              ))}
            </ul>
          </section>

          <section className="mb-6">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-neutral-500">
              Installed skills
            </h3>
            <ul className="flex flex-wrap gap-2">
              {agent.installedSkills.map((s) => (
                <li
                  key={s}
                  className="rounded-full bg-sky-100 px-3 py-1 text-xs font-medium text-sky-900 dark:bg-sky-950/50 dark:text-sky-200"
                >
                  {s}
                </li>
              ))}
            </ul>
          </section>

          <section className="mb-6">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-neutral-500">
              Task queue
            </h3>
            {agent.taskQueue.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-neutral-500">
                No queued tasks.
              </p>
            ) : (
              <ul className="space-y-2">
                {agent.taskQueue.map((q) => (
                  <li
                    key={q.id}
                    className="flex items-center justify-between gap-2 rounded-xl border border-neutral-200 bg-neutral-50/80 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800/50"
                  >
                    <span className="min-w-0 flex-1 text-slate-800 dark:text-neutral-200">
                      {q.title}
                    </span>
                    <span className="shrink-0 text-xs font-medium capitalize text-slate-500 dark:text-neutral-400">
                      {q.state}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="mb-2">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-neutral-500">
              Performance
            </h3>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {agent.performanceStats.map((p) => (
                <div
                  key={p.label}
                  className="rounded-xl border border-neutral-200 bg-white px-3 py-2 shadow-sm dark:border-slate-700 dark:bg-slate-800/80"
                >
                  <p className="text-xs text-slate-500 dark:text-neutral-500">
                    {p.label}
                  </p>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    {p.value}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="border-t border-neutral-200 bg-neutral-50/90 px-5 py-4 dark:border-slate-700 dark:bg-slate-900/90">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                toastStub(`Edit: ${agent.name}`);
                onClose();
              }}
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 dark:bg-neutral-100 dark:text-slate-900 dark:hover:bg-white"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => toastStub(`Duplicate: ${agent.name}`)}
              className="rounded-xl border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-neutral-50 dark:border-slate-600 dark:bg-slate-800 dark:text-neutral-100 dark:hover:bg-slate-700"
            >
              Duplicate
            </button>
            <button
              type="button"
              onClick={() => toastStub(`Archive: ${agent.name}`)}
              className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-800 transition hover:bg-rose-100 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-200 dark:hover:bg-rose-950/60"
            >
              Archive
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
