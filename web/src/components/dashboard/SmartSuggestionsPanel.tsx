"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import type { SmartSuggestion } from "@/data/smartSuggestionsMock";
import { getSmartSuggestionsMock } from "@/data/smartSuggestionsMock";
import { JOB_FOCUS_EVENT } from "@/lib/jobFocusEvent";
import { FeaturedSuggestionCard } from "@/components/dashboard/smartSuggestions/FeaturedSuggestionCard";
import { SuggestionCard } from "@/components/dashboard/smartSuggestions/SuggestionCard";

const SMART_SUGGESTIONS_COLLAPSED_KEY = "hireflow:smartSuggestionsCollapsed";

const collapsedListeners = new Set<() => void>();

function subscribeSmartSuggestionsCollapsed(cb: () => void) {
  collapsedListeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key === SMART_SUGGESTIONS_COLLAPSED_KEY || e.key === null) cb();
  };
  if (typeof window !== "undefined") {
    window.addEventListener("storage", onStorage);
  }
  return () => {
    collapsedListeners.delete(cb);
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", onStorage);
    }
  };
}

function emitSmartSuggestionsCollapsed() {
  collapsedListeners.forEach((cb) => cb());
}

function getSmartSuggestionsCollapsedSnapshot(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(SMART_SUGGESTIONS_COLLAPSED_KEY) === "1";
  } catch {
    return false;
  }
}

function getSmartSuggestionsCollapsedServerSnapshot(): boolean {
  return false;
}

function setSmartSuggestionsCollapsedStored(next: boolean) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SMART_SUGGESTIONS_COLLAPSED_KEY, next ? "1" : "0");
  } catch {
    // private mode, etc.
  }
  emitSmartSuggestionsCollapsed();
}

const PRIORITY_WEIGHT: Record<SmartSuggestion["priority"], number> = {
  high: 300,
  medium: 160,
  low: 70,
};

function statusRelevanceBoost(status: SmartSuggestion["status"]) {
  // Small urgency nudges so "Queued/Blocked" rises into view.
  if (status === "Blocked") return 60;
  if (status === "Queued") return 40;
  if (status === "Running") return 30;
  if (status === "In Progress") return 25;
  if (status === "Analyzing") return 20;
  if (status === "Reviewing") return 15;
  return 0;
}

function computeSuggestionScore(s: SmartSuggestion) {
  return PRIORITY_WEIGHT[s.priority] + statusRelevanceBoost(s.status);
}

function SparkleIcon() {
  return (
    <svg className="h-4 w-4 text-sky-500 dark:text-sky-400" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 2l1.2 6.2L20 10l-6.8 1.8L12 18l-1.2-6.2L4 10l6.8-1.8L12 2z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function SmartSuggestionsPanel() {
  const baseSuggestions = useMemo(() => getSmartSuggestionsMock(), []);
  const baseIndexById = useMemo(() => {
    const m = new Map<string, number>();
    baseSuggestions.forEach((s, idx) => m.set(s.id, idx));
    return m;
  }, [baseSuggestions]);

  const [dismissedIds, setDismissedIds] = useState<Set<string>>(() => new Set());
  const [focusedSuggestionId, setFocusedSuggestionId] = useState<string | null>(
    baseSuggestions[0]?.id ?? null,
  );
  const collapsed = useSyncExternalStore(
    subscribeSmartSuggestionsCollapsed,
    getSmartSuggestionsCollapsedSnapshot,
    getSmartSuggestionsCollapsedServerSnapshot,
  );

  const activeSuggestions = useMemo(() => {
    if (dismissedIds.size === 0) return baseSuggestions;
    return baseSuggestions.filter((s) => !dismissedIds.has(s.id));
  }, [baseSuggestions, dismissedIds]);

  const orderedSuggestions = useMemo(() => {
    const list = [...activeSuggestions];
    list.sort((a, b) => {
      const scoreDelta = computeSuggestionScore(b) - computeSuggestionScore(a);
      if (scoreDelta !== 0) return scoreDelta;
      return (baseIndexById.get(a.id) ?? 0) - (baseIndexById.get(b.id) ?? 0);
    });
    return list;
  }, [activeSuggestions, baseIndexById]);

  const featured = orderedSuggestions[0];
  const list = orderedSuggestions.slice(1);

  function focusConversation(conversationId: string) {
    if (typeof window === "undefined") return;
    window.dispatchEvent(
      new CustomEvent(JOB_FOCUS_EVENT, {
        detail: { conversationId },
      }),
    );
  }

  function onSuggestionAction(s: SmartSuggestion) {
    setFocusedSuggestionId(s.id);
    focusConversation(s.relatedConversationId);
  }

  function dismissSuggestion(id: string) {
    setDismissedIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    setFocusedSuggestionId((cur) => (cur === id ? null : cur));
  }

  function refreshSuggestions() {
    setDismissedIds(new Set());
    setFocusedSuggestionId(baseSuggestions[0]?.id ?? null);
  }

  return (
    <section
      className="rounded-3xl border border-neutral-200/60 bg-gradient-to-b from-neutral-50/90 to-sky-50/20 p-5 shadow-sm dark:border-slate-700/60 dark:from-slate-900/80 dark:to-slate-900/40 dark:shadow-black/20 sm:p-6"
      aria-label="Smart suggestions"
    >
      <header className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-neutral-100">
              Smart Suggestions
            </h3>
            <SparkleIcon />
          </div>
          <p className="mt-1 text-xs text-slate-600 dark:text-neutral-300">
            <span className="hidden sm:inline">
              Recommended next steps across your active agent workflows
            </span>
            <span className="sm:hidden">Recommended next steps</span>
          </p>
        </div>

        <div className="shrink-0 flex items-center gap-2">
          <button
            type="button"
            aria-label={collapsed ? "Expand Smart Suggestions" : "Collapse Smart Suggestions"}
            aria-expanded={!collapsed}
            aria-controls="smart-suggestions-body"
            onClick={() => setSmartSuggestionsCollapsedStored(!collapsed)}
            className="flex size-9 items-center justify-center rounded-full border border-neutral-200/70 bg-white/70 text-slate-700 shadow-sm transition hover:bg-white dark:border-slate-700/60 dark:bg-slate-900/55 dark:text-neutral-200 dark:hover:bg-slate-900/80"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden stroke="currentColor" strokeWidth={2}>
              {collapsed ? <path strokeLinecap="round" strokeLinejoin="round" d="M9 18l6-6-6-6" /> : <path strokeLinecap="round" strokeLinejoin="round" d="M15 18l-6-6 6-6" />}
            </svg>
          </button>

          <div className="relative inline-flex items-center gap-2 rounded-full bg-sky-100/80 px-3 py-1 text-[11px] font-semibold text-sky-800 ring-1 ring-sky-200/70 dark:bg-sky-950/50 dark:text-sky-200 dark:ring-sky-800/60">
            <span className="status-chip-glow-pulse pointer-events-none absolute -inset-0.5 rounded-full shadow-[0_0_0_2px_rgba(56,189,248,0.20)] dark:shadow-[0_0_0_2px_rgba(56,189,248,0.14)]" />
            <span className="relative z-10">AI Powered</span>
          </div>
        </div>
      </header>

      <div
        id="smart-suggestions-body"
        className={`grid overflow-hidden transition-[grid-template-rows,opacity,transform] duration-300 ease-out ${
          collapsed
            ? "grid-rows-[0fr] opacity-0 -translate-x-1 pointer-events-none"
            : "grid-rows-[1fr] opacity-100 translate-x-0"
        }`}
      >
        <div className="overflow-hidden">
          {featured ? (
            <FeaturedSuggestionCard
              suggestion={featured}
              focused={focusedSuggestionId === featured.id}
              onAction={() => onSuggestionAction(featured)}
              onDismiss={
                featured.dismissible ? () => dismissSuggestion(featured.id) : undefined
              }
            />
          ) : (
            <div className="rounded-3xl border border-neutral-200/80 bg-white/60 p-4 text-center text-sm text-slate-700 dark:text-neutral-200">
              <p className="font-semibold">You&apos;re all caught up</p>
              <p className="mt-1 text-xs text-slate-600 dark:text-neutral-300">
                No recommendations right now. We&apos;ll surface new suggestions as work progresses.
              </p>
            </div>
          )}

          {list.length > 0 ? (
            <div className="mt-4">
              <div className="hidden lg:block space-y-3">
                {list.map((s) => (
                  <SuggestionCard
                    key={s.id}
                    suggestion={s}
                    focused={focusedSuggestionId === s.id}
                    onAction={() => onSuggestionAction(s)}
                    onDismiss={s.dismissible ? () => dismissSuggestion(s.id) : undefined}
                  />
                ))}
              </div>

              <div className="lg:hidden flex gap-3 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {list.map((s) => (
                  <div key={s.id} className="w-[18.5rem] shrink-0">
                    <SuggestionCard
                      suggestion={s}
                      focused={focusedSuggestionId === s.id}
                      onAction={() => onSuggestionAction(s)}
                      onDismiss={s.dismissible ? () => dismissSuggestion(s.id) : undefined}
                      compact
                    />
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <footer className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-neutral-100 pt-4 dark:border-slate-800/80">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  // Demo behavior: no routes yet; keep the affordance for later.
                  if (typeof window !== "undefined") {
                    window.console.info("[SmartSuggestionsPanel] View all recommendations");
                  }
                }}
                className="text-sm font-semibold text-slate-700 transition hover:text-slate-900 dark:text-neutral-300 dark:hover:text-white"
              >
                View all recommendations
              </button>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Suggestions update as your agents complete work
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={refreshSuggestions}
                className="inline-flex items-center justify-center rounded-xl border border-neutral-200 bg-white/70 px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-white dark:border-slate-700/70 dark:bg-slate-900/50 dark:text-neutral-200 dark:hover:bg-slate-900/80"
              >
                Refresh suggestions
              </button>

              {/* Reserved for future: accepts all low-risk suggestions (not implemented). */}
              <button
                type="button"
                disabled
                aria-disabled="true"
                className="inline-flex items-center justify-center rounded-xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-400 opacity-60 dark:bg-slate-800 dark:text-slate-500"
              >
                Accept all low-risk
              </button>
            </div>
          </footer>
        </div>
      </div>
    </section>
  );
}

