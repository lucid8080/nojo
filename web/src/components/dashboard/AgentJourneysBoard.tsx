import { Fragment } from "react";
import { WorkflowStageColumn } from "@/components/dashboard/WorkflowStageColumn";
import type { WorkflowStage } from "@/data/dashboardSampleData";

export function AgentJourneysBoard({ stages }: { stages: WorkflowStage[] }) {
  return (
    <div className="rounded-3xl border border-neutral-200/50 bg-gradient-to-br from-neutral-50/80 via-white/60 to-sky-50/30 p-4 shadow-sm dark:border-slate-700/50 dark:from-slate-900/60 dark:via-slate-900/40 dark:to-slate-900/60 dark:shadow-black/15 sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-stretch lg:gap-4">
        {stages.map((stage, index) => (
          <Fragment key={stage.id}>
            <div className="min-w-0 flex-1">
              <WorkflowStageColumn stage={stage} />
            </div>
            {index < stages.length - 1 ? (
              <div
                className="flex items-center justify-center py-3 lg:hidden"
                aria-hidden
              >
                <div className="h-1 w-full max-w-xs rounded-full bg-gradient-to-r from-sky-400/50 via-rose-300/50 to-sky-400/50 dark:from-sky-500/40 dark:via-rose-400/40 dark:to-sky-500/40" />
              </div>
            ) : null}
          </Fragment>
        ))}
      </div>
    </div>
  );
}
