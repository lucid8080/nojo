import type { nextActionTiles } from "@/data/dashboardSampleData";

type Tile = (typeof nextActionTiles)[number];

export function NextActionTiles({ tiles }: { tiles: readonly Tile[] }) {
  return (
    <div className="rounded-3xl border border-neutral-200/60 bg-gradient-to-b from-neutral-50/90 to-sky-50/20 p-5 shadow-sm dark:border-slate-700/60 dark:from-slate-900/80 dark:to-slate-900/40 dark:shadow-black/20">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-neutral-100">
          Next Actions
        </h3>
        <span className="rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-medium text-sky-800 dark:bg-sky-900/50 dark:text-sky-200">
          Pipeline
        </span>
      </div>
      <ul className="grid grid-cols-2 gap-3">
        {tiles.map((tile) => (
          <li key={tile.id}>
            <button
              type="button"
              className={
                tile.emphasized
                  ? "flex h-full min-h-24 w-full flex-col items-start justify-end rounded-2xl bg-slate-900 p-4 text-left text-white shadow-md transition hover:bg-slate-800 dark:bg-neutral-100 dark:text-slate-900 dark:hover:bg-white"
                  : "flex h-full min-h-20 w-full flex-col items-start justify-center rounded-2xl border border-neutral-200/80 bg-white/90 p-4 text-left text-sm font-medium text-slate-800 shadow-sm transition hover:border-sky-200/80 hover:bg-sky-50/30 dark:border-slate-600 dark:bg-slate-800/60 dark:text-slate-100 dark:hover:border-sky-700 dark:hover:bg-slate-800"
              }
            >
              {tile.emphasized ? (
                <span className="mb-1 text-xs font-medium uppercase tracking-wide text-sky-300 dark:text-sky-700">
                  Priority
                </span>
              ) : null}
              <span className={tile.emphasized ? "text-base font-semibold" : ""}>
                {tile.label}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
