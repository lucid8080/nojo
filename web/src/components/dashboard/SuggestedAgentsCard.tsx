"use client";

import type { suggestedAgentsRows } from "@/data/dashboardSampleData";
import { AgentAvatarPicker } from "@/components/avatar/AgentAvatarPicker";
import { AvatarBubble } from "@/components/avatar/AvatarBubble";
import { getAgentAvatarUrl } from "@/lib/agentAvatars";
import { useEffect, useMemo, useState } from "react";

type Row = (typeof suggestedAgentsRows)[number];

function statusPill(status: string) {
  const base =
    "inline-flex shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset";
  if (status === "Active") {
    return `${base} bg-sky-50 text-sky-800 ring-sky-200 dark:bg-sky-950/50 dark:text-sky-200 dark:ring-sky-800`;
  }
  if (status === "Queued") {
    return `${base} bg-rose-50 text-rose-800 ring-rose-200 dark:bg-rose-950/40 dark:text-rose-200 dark:ring-rose-800`;
  }
  return `${base} bg-neutral-100 text-neutral-600 ring-neutral-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-600`;
}

export function SuggestedAgentsCard({ rows }: { rows: readonly Row[] }) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [activeAgentKey, setActiveAgentKey] = useState<string | null>(null);
  const [activeAgentLabel, setActiveAgentLabel] = useState<string | null>(null);
  const [bust, setBust] = useState(0);

  function openPicker(agentName: string) {
    setActiveAgentKey(agentName);
    setActiveAgentLabel(agentName);
    setPickerOpen(true);
  }

  return (
    <section className="rounded-3xl border border-neutral-200/60 bg-white/90 p-5 shadow-sm dark:border-slate-700/60 dark:bg-slate-900/60 dark:shadow-black/20 sm:p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-base font-semibold text-slate-900 dark:text-neutral-100">
          Suggested Agents
        </h3>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Add"
            className="flex size-9 items-center justify-center rounded-full border border-neutral-200 bg-white text-slate-600 hover:bg-neutral-50 dark:border-slate-600 dark:bg-slate-800 dark:hover:bg-slate-700"
          >
            <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          </button>
          <button
            type="button"
            aria-label="Share"
            className="flex size-9 items-center justify-center rounded-full border border-neutral-200 bg-white text-slate-600 hover:bg-neutral-50 dark:border-slate-600 dark:bg-slate-800 dark:hover:bg-slate-700"
          >
            <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
          </button>
          <button
            type="button"
            aria-label="Filter"
            className="flex size-9 items-center justify-center rounded-full border border-neutral-200 bg-white text-slate-600 hover:bg-neutral-50 dark:border-slate-600 dark:bg-slate-800 dark:hover:bg-slate-700"
          >
            <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </button>
        </div>
      </div>

      <ul className="divide-y divide-neutral-100 dark:divide-slate-700/80">
        {rows.map((row) => (
          <SuggestedAgentRow
            key={row.agent}
            row={row}
            bust={bust}
            onPick={() => openPicker(row.agent)}
            statusPillCls={statusPill(row.status)}
          />
        ))}
      </ul>

      {activeAgentKey && activeAgentLabel ? (
        <AgentAvatarPicker
          open={pickerOpen}
          agentKey={activeAgentKey}
          agentLabel={activeAgentLabel}
          onClose={() => setPickerOpen(false)}
          onChanged={() => setBust((x) => x + 1)}
        />
      ) : null}
    </section>
  );
}

function SuggestedAgentRow({
  row,
  bust,
  onPick,
  statusPillCls,
}: {
  row: Row;
  bust: number;
  onPick: () => void;
  statusPillCls: string;
}) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    setSrc(getAgentAvatarUrl(row.agent, { withDefault: true }));
  }, [row.agent, bust]);

  const initialsLabel = useMemo(() => row.agent, [row.agent]);

  return (
    <li className="py-4 first:pt-0 last:pb-0">
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onPick}
          className="shrink-0 self-start rounded-full outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-sky-500"
          aria-label={`Set avatar for ${row.agent}`}
        >
          <AvatarBubble label={initialsLabel} src={src} size={36} />
        </button>
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="text-sm font-semibold text-slate-900 dark:text-neutral-100">
              {row.agent}
            </span>
            <span className={statusPillCls}>{row.status}</span>
          </div>
          <div className="space-y-1 text-xs text-slate-600 dark:text-slate-400">
            <p className="break-words">
              <span className="font-medium text-slate-500 dark:text-slate-500">Added</span>{" "}
              <span className="text-slate-800 dark:text-slate-300">{row.added}</span>
            </p>
            <p className="break-words">
              <span className="font-medium text-slate-500 dark:text-slate-500">Last active</span>{" "}
              <span className="text-slate-800 dark:text-slate-300">{row.lastActive}</span>
            </p>
            <p className="break-words">
              <span className="font-medium text-slate-500 dark:text-slate-500">Assigned</span>{" "}
              <span className="text-slate-800 dark:text-slate-300">{row.assignedTo}</span>
            </p>
          </div>
        </div>
      </div>
    </li>
  );
}
