"use client";

import type { TaskLogEntry } from "@/data/agentJobsMock";
import { AvatarBubble } from "@/components/avatar/AvatarBubble";
import { useHydrationSafeAgentAvatarUrl } from "@/lib/hooks/useHydrationSafeAgentAvatarUrl";
import { useResolvedAgentAccent } from "@/lib/nojo/useResolvedAgentAccent";

function effectiveActorKind(task: TaskLogEntry): NonNullable<TaskLogEntry["actorKind"]> {
  if (task.actorKind) return task.actorKind;
  return "agent";
}

function StateIcon({ state }: { state: TaskLogEntry["state"] }) {
  if (state === "done") {
    return (
      <span
        className="flex size-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400"
        aria-label="Done"
      >
        <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </span>
    );
  }
  if (state === "running") {
    return (
      <span
        className="relative flex size-6 shrink-0 items-center justify-center rounded-full bg-sky-100 dark:bg-sky-900/40"
        aria-label="Running"
      >
        <span className="absolute size-3.5 animate-pulse rounded-full bg-sky-500/80 dark:bg-sky-400/80" />
      </span>
    );
  }
  if (state === "blocked") {
    return (
      <span
        className="flex size-6 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-400"
        aria-label="Blocked"
      >
        <svg className="size-3.5 fill-current" viewBox="0 0 24 24">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
        </svg>
      </span>
    );
  }
  return (
    <span
      className="flex size-6 shrink-0 items-center justify-center rounded-full bg-neutral-200 text-neutral-500 dark:bg-slate-700 dark:text-neutral-400"
      aria-label="Queued"
    >
      <svg className="size-3" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" opacity={0.35} />
      </svg>
    </span>
  );
}

function SystemOrRunBadge({ kind }: { kind: "system" | "run" }) {
  return (
    <span
      className="inline-flex size-[18px] shrink-0 items-center justify-center rounded-full bg-neutral-200 text-[9px] font-bold text-neutral-600 ring-1 ring-white/80 dark:bg-slate-700 dark:text-neutral-300 dark:ring-slate-900/80"
      title={kind === "run" ? "OpenClaw run" : "System or timeline"}
      aria-hidden
    >
      {kind === "run" ? "▸" : "•"}
    </span>
  );
}

export function TaskLogItem({
  task,
  isNew,
}: {
  task: TaskLogEntry;
  isNew?: boolean;
}) {
  const hl = task.highlight;
  const border =
    hl === "running"
      ? "border-sky-200/90 bg-sky-50/90 dark:border-sky-800/60 dark:bg-sky-950/35"
      : hl === "milestone"
        ? "border-violet-200/80 bg-violet-50/50 dark:border-violet-800/50 dark:bg-violet-950/25"
        : hl === "blocked"
          ? "border-rose-200/80 bg-rose-50/60 dark:border-rose-800/50 dark:bg-rose-950/20"
          : "border-neutral-100/90 bg-neutral-50/70 dark:border-slate-700/60 dark:bg-slate-800/50";

  const kind = effectiveActorKind(task);
  const showPersonAvatar = kind === "agent";

  return (
    <div
      className={`flex gap-3 rounded-xl border p-3 shadow-sm transition-[opacity,transform] dark:shadow-black/10 ${border} ${isNew ? "task-log-item-enter" : ""}`}
    >
      <StateIcon state={task.state} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium leading-snug text-slate-900 dark:text-neutral-100">{task.text}</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center rounded-md bg-white/80 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600 ring-1 ring-neutral-200/80 dark:bg-slate-900/60 dark:text-neutral-400 dark:ring-slate-600/80">
            {showPersonAvatar ? (
              <TaskAgentAvatar
                displayName={task.agentName}
                avatarKey={task.participantId ?? task.agentName}
                participantId={task.participantId}
              />
            ) : (
              <SystemOrRunBadge kind={kind === "run" ? "run" : "system"} />
            )}
            <span className="ml-1 font-normal normal-case tracking-normal text-slate-500 dark:text-neutral-500">
              {task.agentName.replace(/ Agent$/, "")}
            </span>
          </span>
          {task.time ? (
            <span className="text-[10px] font-medium text-slate-400 dark:text-neutral-500">{task.time}</span>
          ) : null}
        </div>
        {task.meta ? (
          <p className="mt-1 text-xs font-medium text-sky-600 dark:text-sky-400">{task.meta}</p>
        ) : null}
      </div>
    </div>
  );
}

function TaskAgentAvatar({
  displayName,
  avatarKey,
  participantId,
}: {
  displayName: string;
  /** Filename key for `/avatar` map */
  avatarKey: string;
  /** Canonical roster id when known (drives accent with View details) */
  participantId?: string;
}) {
  const visual = useResolvedAgentAccent(participantId?.trim() || undefined);
  const src = useHydrationSafeAgentAvatarUrl(avatarKey);

  const category =
    visual.kind === "palette" ? visual.categoryLabel : undefined;
  const avatarAccent =
    visual.kind === "palette" ? visual.avatarAccent : undefined;

  return (
    <AvatarBubble
      label={displayName}
      accentKey={avatarKey}
      src={src}
      size={18}
      title={displayName}
      className="ring-1 ring-white/80 dark:ring-slate-900/80"
      category={category}
      avatarAccent={avatarAccent}
    />
  );
}
