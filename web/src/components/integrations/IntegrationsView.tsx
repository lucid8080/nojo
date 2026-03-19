"use client";

import type { IntegrationCategory } from "@/data/integrationsData";
import { integrationCategories } from "@/data/integrationsData";
import { IntegrationTile } from "./IntegrationTile";

export function IntegrationsView({
  categories = integrationCategories,
}: {
  categories?: readonly IntegrationCategory[];
}) {
  return (
    <div className="space-y-12">
      {categories.map((category) => (
        <section key={category.id} className="space-y-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-900 dark:text-neutral-100">
            <span
              className="h-4 w-0.5 shrink-0 rounded-full bg-slate-400 dark:bg-slate-500"
              aria-hidden
            />
            {category.name}
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {category.integrations.map((integration) => (
              <IntegrationTile key={integration.id} integration={integration} />
            ))}
          </div>
        </section>
      ))}

      <footer className="flex flex-wrap items-center gap-4 border-t border-neutral-200/60 pt-10 dark:border-slate-700/60">
        <a
          href="#"
          onClick={(e) => e.preventDefault()}
          className="inline-flex items-center justify-center rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 dark:bg-neutral-100 dark:text-slate-900 dark:hover:bg-white dark:focus-visible:outline-neutral-200"
        >
          Get Started
        </a>
        <a
          href="#"
          onClick={(e) => e.preventDefault()}
          className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 dark:focus-visible:outline-neutral-200"
        >
          Create Skill
        </a>
      </footer>
    </div>
  );
}
