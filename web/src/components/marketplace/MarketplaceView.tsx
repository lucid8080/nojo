"use client";

import { MarketplaceSkillCard } from "@/components/marketplace/MarketplaceSkillCard";
import type { AgencyAgentsPayload } from "@/data/agencyAgents.types";
import {
  type MarketplaceSkillCardModel,
  buildHomeSections,
  filterMarketplaceItemsByFacet,
  getMarketplaceFacetChips,
  getMarketplaceSkillCardItems,
  importableSkills,
  marketplaceCardMatchesSearch,
  mergeMarketplaceSkillItems,
  sortMarketplaceCardItemsByTitle,
} from "@/data/marketplaceSkillCatalog";
import { useHasMounted } from "@/lib/hooks/useHasMounted";
import { useMemo, useState } from "react";

const FILTER_HOME = "HOME";
const FILTER_ALL = "ALL";

export function MarketplaceView({
  data,
  cmsSkillModels = [],
}: {
  data: AgencyAgentsPayload;
  cmsSkillModels?: MarketplaceSkillCardModel[];
}) {
  const { agents, generatedAt } = data;

  const allItems = useMemo(() => {
    const base = getMarketplaceSkillCardItems(data);
    return mergeMarketplaceSkillItems(base, cmsSkillModels);
  }, [data, cmsSkillModels]);

  const facetChips = useMemo(
    () =>
      getMarketplaceFacetChips(
        importableSkills,
        agents,
        cmsSkillModels.map((i) => i.categoryTag),
      ),
    [agents, cmsSkillModels],
  );

  const { featured: homeFeatured, popular: homePopular } = useMemo(
    () => buildHomeSections(allItems, agents),
    [allItems, agents],
  );

  const homeTotalShown = homeFeatured.length + homePopular.length;

  const [filter, setFilter] = useState<string>(FILTER_HOME);
  const [searchQuery, setSearchQuery] = useState("");
  const hasMounted = useHasMounted();

  const searchLower = searchQuery.trim().toLowerCase();
  const isSearching = searchLower.length > 0;

  const searchMatchedItems = useMemo(() => {
    if (!isSearching) return [];
    return sortMarketplaceCardItemsByTitle(
      allItems.filter((i) => marketplaceCardMatchesSearch(i, searchLower)),
    );
  }, [allItems, searchLower, isSearching]);

  const gridItems = useMemo(() => {
    if (filter === FILTER_HOME) return [];
    if (filter === FILTER_ALL) {
      return sortMarketplaceCardItemsByTitle(allItems);
    }
    return sortMarketplaceCardItemsByTitle(
      filterMarketplaceItemsByFacet(allItems, filter),
    );
  }, [allItems, filter]);

  const gridItemsFiltered = useMemo(() => {
    if (!isSearching) return gridItems;
    return gridItems.filter((i) => marketplaceCardMatchesSearch(i, searchLower));
  }, [gridItems, searchLower, isSearching]);

  const syncLabel = useMemo(() => {
    if (!hasMounted) return "—";
    try {
      return new Date(generatedAt).toLocaleString(undefined, {
        dateStyle: "short",
        timeStyle: "short",
      });
    } catch {
      return generatedAt;
    }
  }, [generatedAt, hasMounted]);

  const showingLine = useMemo(() => {
    if (isSearching) {
      const n =
        filter === FILTER_HOME
          ? searchMatchedItems.length
          : gridItemsFiltered.length;
      const q = searchQuery.trim();
      return `${n} skill${n === 1 ? "" : "s"} match “${q}”`;
    }
    if (filter === FILTER_HOME) {
      return `${homeTotalShown} highlights of ${allItems.length} skills (Home)`;
    }
    if (filter === FILTER_ALL) {
      return `Showing all ${allItems.length} skills`;
    }
    const n = filterMarketplaceItemsByFacet(allItems, filter).length;
    return `Showing ${n} of ${allItems.length} skills`;
  }, [
    filter,
    allItems,
    homeTotalShown,
    isSearching,
    searchMatchedItems.length,
    gridItemsFiltered.length,
    searchQuery,
  ]);

  const chipBase =
    "shrink-0 rounded-full px-2 py-1 text-[11px] font-semibold uppercase tracking-normal transition sm:text-xs";
  const chipInactive =
    "bg-neutral-100/90 text-slate-600 hover:bg-neutral-200/90 hover:text-slate-900 dark:bg-slate-800/90 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-100";
  const chipActive =
    "bg-slate-900 text-white shadow-sm dark:bg-neutral-100 dark:text-slate-900";

  const gridClass =
    "grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5";

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
        {facetChips.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={`${chipBase} ${filter === f.id ? chipActive : chipInactive}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <p className="mb-8 text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {showingLine}
        <span className="mx-2 text-slate-300 dark:text-slate-600">·</span>
        Last sync: {syncLabel}
      </p>

      {filter === FILTER_HOME && isSearching ? (
        searchMatchedItems.length > 0 ? (
          <div className={gridClass}>
            {searchMatchedItems.map((item: MarketplaceSkillCardModel) => (
              <MarketplaceSkillCard
                key={item.id}
                item={item}
                variant="marketplace"
              />
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
              <div className={gridClass}>
                {homeFeatured.map((item: MarketplaceSkillCardModel) => (
                  <MarketplaceSkillCard
                    key={item.id}
                    item={item}
                    variant="marketplace"
                  />
                ))}
              </div>
            </section>
          )}
          {homePopular.length > 0 && (
            <section>
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-900 dark:text-neutral-100">
                Popular
              </h2>
              <div className={gridClass}>
                {homePopular.map((item: MarketplaceSkillCardModel) => (
                  <MarketplaceSkillCard
                    key={item.id}
                    item={item}
                    variant="marketplace"
                  />
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
      ) : gridItemsFiltered.length > 0 ? (
        <div className={gridClass}>
          {gridItemsFiltered.map((item: MarketplaceSkillCardModel) => (
            <MarketplaceSkillCard
              key={item.id}
              item={item}
              variant="marketplace"
            />
          ))}
        </div>
      ) : gridItems.length > 0 && isSearching ? (
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
