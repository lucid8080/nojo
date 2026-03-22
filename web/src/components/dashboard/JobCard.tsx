import { AgentAvatarGroup } from "@/components/dashboard/AgentAvatarGroup";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { TaskLogItem } from "@/components/dashboard/TaskLogItem";
import type { Job } from "@/data/agentJobsMock";
import Link from "next/link";

const priorityStyles: Record<Job["priority"], string> = {
  High: "text-rose-600 dark:text-rose-400",
  Medium: "text-amber-700 dark:text-amber-400",
  Low: "text-neutral-500 dark:text-neutral-400",
};

export function JobCard({
  job,
  newTaskIds,
  isFocused = false,
  workspaceConversationId,
}: {
  job: Job;
  /** Task ids that appeared last tick (subtle enter animation) */
  newTaskIds?: Set<string>;
  isFocused?: boolean;
  /** When set, shows deep link to Agent Workspace and thread id in the footer. */
  workspaceConversationId?: string;
}) {
  return (
    <article
      className={`flex h-full min-h-[28rem] min-w-0 flex-col overflow-hidden rounded-3xl border border-neutral-200/70 bg-white/95 shadow-md shadow-slate-900/[0.06] dark:border-slate-700/70 dark:bg-slate-900/75 dark:shadow-black/25 ${
        isFocused
          ? "ring-2 ring-sky-500/40 dark:ring-sky-400/35"
          : ""
      }`}
    >
      <header className="shrink-0 space-y-3 border-b border-neutral-100 px-5 py-4 dark:border-slate-700/80">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-sky-600 dark:text-sky-400">
              {workspaceConversationId ? "Workspace thread" : "Active job"}
            </p>
            <h3 className="mt-0.5 text-base font-bold leading-tight text-slate-900 dark:text-white">
              {job.title}
            </h3>
            <p className="mt-1 text-sm text-slate-600 dark:text-neutral-400">{job.client}</p>
            {workspaceConversationId ? (
              <p className="mt-2">
                <Link
                  href={`/workspace?conversation=${encodeURIComponent(workspaceConversationId)}`}
                  className="text-xs font-semibold text-sky-600 underline-offset-2 hover:underline dark:text-sky-400"
                >
                  Open in workspace
                </Link>
              </p>
            ) : null}
          </div>
          <StatusBadge status={job.status} />
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <span className={`font-semibold ${priorityStyles[job.priority]}`}>Priority · {job.priority}</span>
          {job.startedAgo ? (
            <span className="text-slate-500 dark:text-neutral-500">
              {workspaceConversationId ? "Activity " : "Started "}
              {job.startedAgo}
            </span>
          ) : null}
        </div>
        <div>
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-neutral-500">
            {workspaceConversationId ? "Assigned agent(s)" : "Thread participants"}
          </p>
          <AgentAvatarGroup agents={job.agents} agentIds={job.agentIds} max={5} />
          {workspaceConversationId && job.primaryAgentName ? (
            <p className="mt-2 text-[10px] text-slate-500 dark:text-neutral-500">
              Lead for routing and replies:{" "}
              <span className="font-semibold text-slate-700 dark:text-neutral-300">
                {job.primaryAgentName}
              </span>
            </p>
          ) : null}
        </div>
      </header>

      <div className="min-h-0 flex-1 px-3 pb-2 pt-3">
        <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-neutral-500">
          Execution log
        </p>
        <div
          className="max-h-[min(22rem,52vh)] space-y-2 overflow-y-auto overflow-x-hidden rounded-2xl border border-neutral-100/80 bg-neutral-50/40 p-2 dark:border-slate-800/80 dark:bg-slate-950/40"
          aria-label={`Execution log for ${job.title}`}
        >
          {job.tasks.map((task) => (
            <TaskLogItem key={task.id} task={task} isNew={newTaskIds?.has(task.id)} />
          ))}
        </div>
      </div>

      <footer className="shrink-0 space-y-2 border-t border-neutral-100 bg-neutral-50/50 px-5 py-4 dark:border-slate-700/80 dark:bg-slate-900/80">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-neutral-500">
          Job details · delivery pipeline
        </p>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
          <span className="text-slate-500 dark:text-neutral-500">Est. completion</span>
          <span className="font-medium text-slate-800 dark:text-neutral-200">{job.footer.eta}</span>
          <span className="text-slate-500 dark:text-neutral-500">
            {workspaceConversationId ? "Thread" : "Tokens / tools"}
          </span>
          <span className="font-medium text-slate-800 dark:text-neutral-200">
            {workspaceConversationId ? workspaceConversationId : job.footer.tokensTools}
          </span>
          <span className="text-slate-500 dark:text-neutral-500">Current phase</span>
          <span className="font-medium text-slate-800 dark:text-neutral-200">{job.footer.phase}</span>
        </div>
        <div className="pt-1">
          <div className="mb-1 flex justify-between text-[10px] font-semibold text-slate-600 dark:text-neutral-400">
            <span>Agent workflow</span>
            <span>{job.footer.completionPct}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-neutral-200 dark:bg-slate-700">
            <div
              className="h-full rounded-full bg-gradient-to-r from-sky-500 to-emerald-500 transition-[width] duration-500 ease-out dark:from-sky-400 dark:to-emerald-500"
              style={{ width: `${Math.min(100, job.footer.completionPct)}%` }}
            />
          </div>
        </div>
      </footer>
    </article>
  );
}
