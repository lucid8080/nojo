import { WorkflowTaskRow } from "@/components/dashboard/WorkflowTaskRow";
import type { WorkflowStage } from "@/data/dashboardSampleData";

export function WorkflowStageColumn({ stage }: { stage: WorkflowStage }) {
  return (
    <section className="flex min-h-0 min-w-0 flex-1 flex-col rounded-3xl border border-neutral-200/60 bg-white/90 shadow-sm shadow-slate-900/5 dark:border-slate-700/60 dark:bg-slate-900/60 dark:shadow-black/20">
      <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-4 dark:border-slate-700/80">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-neutral-100">
          {stage.name}
        </h3>
        <button
          type="button"
          aria-label="Stage options"
          className="flex size-8 items-center justify-center rounded-full text-slate-400 hover:bg-neutral-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
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
      <div className="flex flex-col gap-2 p-4">
        {stage.tasks.map((task) => (
          <WorkflowTaskRow key={task.id} task={task} />
        ))}
      </div>
    </section>
  );
}
