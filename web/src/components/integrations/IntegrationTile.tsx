import type { Integration } from "@/data/integrationsData";
import { IntegrationBrandLogo } from "./IntegrationBrandLogo";

export function IntegrationTile({ integration }: { integration: Integration }) {
  return (
    <button
      type="button"
      className="flex w-full aspect-square flex-col items-center justify-center gap-1 rounded-xl border border-neutral-200/60 bg-white/90 p-2 text-center shadow-sm transition hover:border-neutral-300 hover:shadow-md dark:border-slate-700/60 dark:bg-slate-900/60 dark:shadow-black/20 dark:hover:border-slate-600"
    >
      <IntegrationBrandLogo integrationId={integration.id} name={integration.name} />
      <h3 className="line-clamp-1 text-sm font-bold leading-snug text-slate-900 dark:text-neutral-100">
        {integration.name}
      </h3>
      <p className="line-clamp-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
        {integration.description}
      </p>
    </button>
  );
}
