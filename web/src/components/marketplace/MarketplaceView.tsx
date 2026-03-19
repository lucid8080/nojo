"use client";

import type { AgencyAgent, AgencyAgentsPayload } from "@/data/agencyAgents.types";
import { useEffect, useMemo, useState } from "react";
import { AgentCard } from "./AgentCard";

const FILTER_HOME = "HOME";
const FILTER_ALL = "ALL";

function divisionChipLabel(division: string) {
  return division.replace(/-/g, " ").toUpperCase();
}

function pickFeaturedAllDivisions(agents: AgencyAgent[]): AgencyAgent[] {
  const byDiv = new Map<string, AgencyAgent[]>();
  for (const a of agents) {
    if (!byDiv.has(a.division)) byDiv.set(a.division, []);
    byDiv.get(a.division)!.push(a);
  }
  for (const arr of byDiv.values()) {
    arr.sort((x, y) => x.title.localeCompare(y.title));
  }
  const divisions = [...byDiv.keys()].sort();
  const featured: AgencyAgent[] = [];
  let round = 0;
  while (featured.length < 5) {
    let added = false;
    for (const d of divisions) {
      const list = byDiv.get(d)!;
      if (list[round] && featured.length < 5) {
        featured.push(list[round]);
        added = true;
      }
    }
    if (!added) break;
    round++;
  }
  return featured.slice(0, 5);
}

function sortByTitle(list: AgencyAgent[]) {
  return [...list].sort((x, y) => x.title.localeCompare(y.title));
}

/** Case-insensitive match across title, description, category, division. */
function agentMatchesSearch(agent: AgencyAgent, queryLower: string): boolean {
  if (!queryLower) return true;
  const hay = [
    agent.title,
    agent.description,
    agent.categoryLabel,
    agent.division,
    divisionChipLabel(agent.division),
  ]
    .join(" ")
    .toLowerCase();
  return hay.includes(queryLower);
}

export function MarketplaceView({ data }: { data: AgencyAgentsPayload }) {
  const { agents, generatedAt } = data;
  const divisions = useMemo(() => {
    const s = new Set(agents.map((a) => a.division));
    return [...s].sort();
  }, [agents]);

  const [filter, setFilter] = useState<string>(FILTER_HOME);
  const [searchQuery, setSearchQuery] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const searchLower = searchQuery.trim().toLowerCase();
  const isSearching = searchLower.length > 0;

  const searchMatchedAgents = useMemo(() => {
    if (!isSearching) return [];
    return sortByTitle(agents.filter((a) => agentMatchesSearch(a, searchLower)));
  }, [agents, searchLower, isSearching]);

  const { homeFeatured, homePopular } = useMemo(() => {
    const feat = pickFeaturedAllDivisions(agents);
    const ids = new Set(feat.map((a) => a.id));
    const rest = sortByTitle(agents.filter((a) => !ids.has(a.id)));
    return { homeFeatured: feat, homePopular: rest.slice(0, 15) };
  }, [agents]);

  const homeTotalShown = homeFeatured.length + homePopular.length;

  const gridAgents = useMemo(() => {
    if (filter === FILTER_HOME) return [];
    if (filter === FILTER_ALL) return sortByTitle(agents);
    return sortByTitle(agents.filter((a) => a.division === filter));
  }, [agents, filter]);

  const gridAgentsFiltered = useMemo(() => {
    if (!isSearching) return gridAgents;
    return gridAgents.filter((a) => agentMatchesSearch(a, searchLower));
  }, [gridAgents, searchLower, isSearching]);

  const syncLabel = useMemo(() => {
    if (!mounted) return "—";
    try {
      return new Date(generatedAt).toLocaleString(undefined, {
        dateStyle: "short",
        timeStyle: "short",
      });
    } catch {
      return generatedAt;
    }
  }, [generatedAt, mounted]);

  const showingLine = useMemo(() => {
    if (isSearching) {
      const n =
        filter === FILTER_HOME
          ? searchMatchedAgents.length
          : gridAgentsFiltered.length;
      const q = searchQuery.trim();
      return `${n} skill${n === 1 ? "" : "s"} match “${q}”`;
    }
    if (filter === FILTER_HOME) {
      return `${homeTotalShown} highlights of ${agents.length} skills (Home)`;
    }
    if (filter === FILTER_ALL) {
      return `Showing all ${agents.length} skills`;
    }
    const n = agents.filter((a) => a.division === filter).length;
    return `Showing ${n} of ${agents.length} skills`;
  }, [
    filter,
    agents,
    homeTotalShown,
    isSearching,
    searchMatchedAgents.length,
    gridAgentsFiltered.length,
    searchQuery,
  ]);

  const chipBase =
    "shrink-0 rounded-full px-2 py-1 text-[11px] font-semibold uppercase tracking-normal transition sm:text-xs";
  const chipInactive =
    "bg-neutral-100/90 text-slate-600 hover:bg-neutral-200/90 hover:text-slate-900 dark:bg-slate-800/90 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-100";
  const chipActive =
    "bg-slate-900 text-white shadow-sm dark:bg-neutral-100 dark:text-slate-900";

  return (
    <div>
      <div className="relative mb-4">
        <label htmlFor="agent-skills-search" className="sr-only">
          Search agent skills
        </label>
        <span
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"
          aria-hidden
        >
          <svg
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </span>
        <input
          id="agent-skills-search"
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search skills by name, category, or description…"
          autoComplete="off"
          className="w-full rounded-2xl border border-neutral-200/90 bg-white py-2.5 pl-10 pr-10 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-neutral-100 dark:placeholder:text-slate-500 dark:focus:border-sky-400"
        />
        {searchQuery ? (
          <button
            type="button"
            onClick={() => setSearchQuery("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-xs font-medium text-slate-500 hover:bg-neutral-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            aria-label="Clear search"
          >
            Clear
          </button>
        ) : null}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-0.5 rounded-2xl bg-neutral-100/90 p-0.5 dark:bg-slate-800/90">
        <button
          type="button"
          onClick={() => setFilter(FILTER_HOME)}
          className={`${chipBase} ${filter === FILTER_HOME ? chipActive : chipInactive}`}
        >
          Home
        </button>
        <button
          type="button"
          onClick={() => setFilter(FILTER_ALL)}
          className={`${chipBase} ${filter === FILTER_ALL ? chipActive : chipInactive}`}
        >
          All
        </button>
        {divisions.map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setFilter(d)}
            className={`${chipBase} ${filter === d ? chipActive : chipInactive}`}
          >
            {divisionChipLabel(d)}
          </button>
        ))}
      </div>

      <p className="mb-8 text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {showingLine}
        <span className="mx-2 text-slate-300 dark:text-slate-600">·</span>
        Last sync: {syncLabel}
      </p>

      {filter === FILTER_HOME && isSearching ? (
        searchMatchedAgents.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {searchMatchedAgents.map((a) => (
              <AgentCard key={a.id} agent={a} />
            ))}
          </div>
        ) : (
          <p className="text-slate-500 dark:text-slate-400">
            No skills match your search. Try another keyword or clear the
            search box.
          </p>
        )
      ) : filter === FILTER_HOME ? (
        <>
          {homeFeatured.length > 0 && (
            <section className="mb-10">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-900 dark:text-neutral-100">
                Featured
              </h2>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {homeFeatured.map((a) => (
                  <AgentCard key={a.id} agent={a} />
                ))}
              </div>
            </section>
          )}
          {homePopular.length > 0 && (
            <section>
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-900 dark:text-neutral-100">
                Popular
              </h2>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {homePopular.map((a) => (
                  <AgentCard key={a.id} agent={a} />
                ))}
              </div>
            </section>
          )}
          {homeTotalShown === 0 && (
            <p className="text-slate-500 dark:text-slate-400">
              No skills to show yet.
            </p>
          )}
        </>
      ) : gridAgentsFiltered.length > 0 ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {gridAgentsFiltered.map((a) => (
            <AgentCard key={a.id} agent={a} />
          ))}
        </div>
      ) : gridAgents.length > 0 && isSearching ? (
        <p className="text-slate-500 dark:text-slate-400">
          No skills match your search in this category. Try a different
          keyword or pick &quot;All&quot;.
        </p>
      ) : (
        <p className="text-slate-500 dark:text-slate-400">
          No skills match this filter.
        </p>
      )}
    </div>
  );
}
