"use client";

import type { WorkflowTask } from "@/data/dashboardSampleData";
import { AvatarBubble } from "@/components/avatar/AvatarBubble";
import { getAgentAvatarUrl } from "@/lib/agentAvatars";
import { useEffect, useState } from "react";

function InitialsAvatar({ initials }: { initials: string }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    setSrc(getAgentAvatarUrl(initials, { withDefault: true }));
  }, [initials]);
  return <AvatarBubble label={initials} src={src} size={32} />;
}

export function WorkflowTaskRow({ task }: { task: WorkflowTask }) {
  return (
    <div
      className={
        task.highlighted
          ? "flex items-start gap-3 rounded-2xl border border-sky-200/80 bg-sky-50/80 p-4 dark:border-sky-800/60 dark:bg-sky-950/40"
          : "flex items-start gap-3 rounded-2xl border border-transparent bg-neutral-50/50 p-4 transition hover:border-neutral-200/80 hover:bg-white dark:bg-slate-800/40 dark:hover:border-slate-600 dark:hover:bg-slate-800/80"
      }
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-slate-900 dark:text-neutral-100">
          {task.title}
        </p>
        {task.meta ? (
          <p className="mt-1 text-xs font-medium text-sky-600 dark:text-sky-400">
            {task.meta}
          </p>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {task.avatars?.map((initials) => (
          <InitialsAvatar key={initials} initials={initials} />
        ))}
        <button
          type="button"
          aria-label="More actions"
          className="flex size-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-neutral-200/80 hover:text-slate-700 dark:hover:bg-slate-600 dark:hover:text-slate-200"
        >
          <svg
            className="size-4"
            fill="currentColor"
            viewBox="0 0 24 24"
            aria-hidden
          >
            <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
