"use client";

import { AgentDetailsSheet, TeamAgentAvatar } from "@/components/team/AgentDetailsSheet";
import { CreateAgentSheet } from "@/components/team/CreateAgentSheet";
import {
  CollaboratorStrip,
  type CollaboratorStripAgent,
} from "@/components/dashboard/CollaboratorStrip";
import type { TeamAgent, TeamAgentStatus, TeamStats } from "@/data/teamPageMock";
import agencyData from "@/data/agencyAgents.json";
import type { AgencyAgentsPayload } from "@/data/agencyAgents.types";
import type { MarketplaceSkillCardModel } from "@/data/marketplaceSkillCatalog";
import {
  filterMarketplaceItemsByFacet,
  getMarketplaceFacetChips,
  getMarketplaceSkillCardItems,
  importableSkills,
  marketplaceCardMatchesSearch,
  mergeMarketplaceSkillItems,
} from "@/data/marketplaceSkillCatalog";
import { MarketplaceSkillCard } from "@/components/marketplace/MarketplaceSkillCard";
import {
  getCategoryCardClasses,
  getCategoryFilterSelectedClasses,
} from "@/lib/categoryColors";
import type { NojoWorkspaceRosterEntry } from "@/data/nojoWorkspaceRoster";
import { useHydratedTeamAgents } from "@/lib/nojo/useHydratedTeamAgents";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const STRIP_MAX = 7;

function buildStripAgents(teamAgents: TeamAgent[]): CollaboratorStripAgent[] {
  const slice = teamAgents.slice(0, STRIP_MAX).map((a) => ({
    id: a.id,
    initials: a.initials,
    categoryLabel: a.categoryLabel,
    avatarAccent: a.avatarAccent,
  }));
  return [...slice, { id: "add", initials: "+", isAdd: true as const }];
}

const statusStyles: Record<
  TeamAgentStatus,
  { chipClassName: string; glowClassName: string; label: string }
> = {
  active: {
    chipClassName:
      "bg-emerald-100 text-emerald-800 ring-emerald-200/80 dark:bg-emerald-950/50 dark:text-emerald-300 dark:ring-emerald-800/50",
    glowClassName:
      "shadow-[0_0_0_2px_rgba(16,185,129,0.18)] dark:shadow-[0_0_0_2px_rgba(16,185,129,0.13)]",
    label: "Active",
  },
  idle: {
    chipClassName:
      "bg-neutral-100 text-neutral-700 ring-neutral-200/80 dark:bg-slate-800 dark:text-neutral-300 dark:ring-slate-600/80",
    glowClassName:
      "shadow-[0_0_0_2px_rgba(245,158,11,0.16)] dark:shadow-[0_0_0_2px_rgba(245,158,11,0.12)]",
    label: "Idle",
  },
  busy: {
    chipClassName:
      "bg-sky-100 text-sky-800 ring-sky-200/80 dark:bg-sky-950/60 dark:text-sky-300 dark:ring-sky-800/60",
    glowClassName:
      "shadow-[0_0_0_2px_rgba(14,165,233,0.18)] dark:shadow-[0_0_0_2px_rgba(56,189,248,0.12)]",
    label: "Busy",
  },
  paused: {
    chipClassName:
      "bg-amber-100 text-amber-900 ring-amber-200/80 dark:bg-amber-950/40 dark:text-amber-200 dark:ring-amber-800/50",
    glowClassName:
      "shadow-[0_0_0_2px_rgba(245,158,11,0.18)] dark:shadow-[0_0_0_2px_rgba(217,119,6,0.12)]",
    label: "Paused",
  },
  archived: {
    chipClassName:
      "bg-slate-200 text-slate-700 ring-slate-300/80 dark:bg-slate-700 dark:text-neutral-200 dark:ring-slate-500",
    glowClassName:
      "shadow-[0_0_0_2px_rgba(244,63,94,0.16)] dark:shadow-[0_0_0_2px_rgba(244,63,94,0.12)]",
    label: "Archived",
  },
};

function StatusChip({ status }: { status: TeamAgentStatus }) {
  const s = statusStyles[status];
  return (
    <span
      className={`relative inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${s.chipClassName}`}
      title={`Status: ${s.label}`}
    >
      <span
        aria-hidden
        className={`status-chip-glow-pulse pointer-events-none absolute -inset-0.5 rounded-full ${s.glowClassName}`}
      />
      <span className="relative z-10">{s.label}</span>
    </span>
  );
}

function deriveStats(agents: TeamAgent[]): TeamStats {
  return {
    totalAgents: agents.length,
    activeNow: agents.filter((a) => a.status === "active" || a.status === "busy")
      .length,
    onTasks: agents.filter((a) => a.currentTask).length,
    savedSkillPacks: agents.length > 0 ? 12 : 0,
  };
}

function toastStub(msg: string) {
  if (typeof window !== "undefined" && window.console) {
    console.info("[Team page demo]", msg);
  }
}

function AgentCardActions({
  agent,
  onViewDetails,
  onScrollSkills,
}: {
  agent: TeamAgent;
  onViewDetails: () => void;
  onScrollSkills: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function onDoc(e: MouseEvent) {
      if (wrapRef.current?.contains(e.target as Node)) return;
      setMenuOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [menuOpen]);

  const itemClass =
    "flex w-full px-3 py-2 text-left text-sm text-slate-800 hover:bg-neutral-50 dark:text-neutral-200 dark:hover:bg-slate-800";

  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-neutral-100 pt-3 dark:border-slate-800">
      <button
        type="button"
        onClick={onViewDetails}
        className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-800 dark:bg-neutral-100 dark:text-slate-900 dark:hover:bg-white"
      >
        View details
      </button>
      <div className="relative z-20" ref={wrapRef}>
        <button
          type="button"
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          onClick={() => setMenuOpen((v) => !v)}
          className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-neutral-50 dark:border-slate-600 dark:bg-slate-800 dark:text-neutral-200 dark:hover:bg-slate-700"
        >
          More
        </button>
        {menuOpen ? (
          <ul
            role="menu"
            aria-orientation="vertical"
            className="absolute bottom-full right-0 z-50 mb-1 min-w-[11rem] rounded-xl border border-neutral-200 bg-white py-1 shadow-lg dark:border-slate-600 dark:bg-slate-900"
          >
            <li>
              <button
                type="button"
                role="menuitem"
                className={itemClass}
                onClick={() => {
                  onViewDetails();
                  setMenuOpen(false);
                }}
              >
                Edit agent
              </button>
            </li>
            <li>
              <button
                type="button"
                role="menuitem"
                className={itemClass}
                onClick={() => {
                  toastStub(`Assign task: ${agent.name}`);
                  setMenuOpen(false);
                }}
              >
                Assign task
              </button>
            </li>
            <li>
              <button
                type="button"
                role="menuitem"
                className={itemClass}
                onClick={() => {
                  onViewDetails();
                  onScrollSkills();
                  setMenuOpen(false);
                }}
              >
                Add skills
              </button>
            </li>
          </ul>
        ) : null}
      </div>
    </div>
  );
}

export function TeamPageView({
  baseRoster,
  autoScrollToCreateAgent,
  cmsSkillModels = [],
}: {
  baseRoster: readonly NojoWorkspaceRosterEntry[];
  autoScrollToCreateAgent?: boolean;
  cmsSkillModels?: MarketplaceSkillCardModel[];
}) {
  const agents = useHydratedTeamAgents(baseRoster);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [skillQuery, setSkillQuery] = useState("");
  /** "all" or facet id (`imp:…` / `div:…`) — same catalog as /marketplace */
  const [skillFacet, setSkillFacet] = useState<string>("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [createSession, setCreateSession] = useState(0);

  const stats = useMemo(() => deriveStats(agents), [agents]);
  const selectedAgent = useMemo(
    () => agents.find((a) => a.id === selectedId) ?? null,
    [agents, selectedId],
  );
  const stripAgents = useMemo(() => buildStripAgents(agents), [agents]);

  const marketplaceSkillItems = useMemo(
    () =>
      mergeMarketplaceSkillItems(
        getMarketplaceSkillCardItems(agencyData as AgencyAgentsPayload),
        cmsSkillModels,
      ),
    [cmsSkillModels],
  );

  const teamFacetChips = useMemo(
    () =>
      getMarketplaceFacetChips(
        importableSkills,
        (agencyData as AgencyAgentsPayload).agents,
        cmsSkillModels.map((i) => i.categoryTag),
      ),
    [cmsSkillModels],
  );

  const filteredSkillItems = useMemo(() => {
    let items = marketplaceSkillItems;
    if (skillFacet !== "all") {
      items = filterMarketplaceItemsByFacet(items, skillFacet);
    }
    const q = skillQuery.trim().toLowerCase();
    if (!q) return items;
    return items.filter((i) => marketplaceCardMatchesSearch(i, q));
  }, [marketplaceSkillItems, skillFacet, skillQuery]);

  const scrollToSkills = useCallback(() => {
    document.getElementById("marketplace-skills")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, []);

  const scrollToCreateAgent = useCallback(() => {
    document.getElementById("create-agent")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });

    // Focus a primary CTA for keyboard users after the scroll.
    window.setTimeout(() => {
      document
        .querySelector<HTMLButtonElement>(
          '[data-create-agent-primary="true"]',
        )
        ?.focus();
    }, 250);
  }, []);

  const openCreateSheet = useCallback(() => {
    setCreateSession((s) => s + 1);
    setCreateOpen(true);
  }, []);

  useEffect(() => {
    if (!autoScrollToCreateAgent) return;
    scrollToCreateAgent();
  }, [autoScrollToCreateAgent, scrollToCreateAgent]);

  const btnPrimary =
    "inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-slate-900/10 transition hover:bg-slate-800 dark:bg-neutral-100 dark:text-slate-900 dark:shadow-none dark:hover:bg-white";
  const btnSecondary =
    "inline-flex items-center justify-center rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-neutral-50 dark:border-slate-600 dark:bg-slate-800 dark:text-neutral-100 dark:hover:bg-slate-700";
  const btnOutline =
    "inline-flex items-center justify-center rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 shadow-sm transition hover:bg-neutral-50 dark:border-slate-600 dark:bg-slate-900 dark:text-neutral-200 dark:hover:bg-slate-800";

  return (
    <div className="space-y-0">
      <CreateAgentSheet
        key={createSession}
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(id) => {
          setSelectedId(id);
        }}
      />

      <AgentDetailsSheet
        agent={selectedAgent}
        open={Boolean(selectedId && selectedAgent)}
        onClose={() => setSelectedId(null)}
      />

      {/* Header */}
      <header className="border-b border-neutral-200/80 bg-transparent pb-6 pt-1 dark:border-slate-800/80">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 max-w-3xl">
            <p className="mb-1 text-sm font-medium text-sky-600 dark:text-sky-400">
              Workforce
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
              My Agent Team
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-neutral-400">
              Manage your AI workforce, create custom agents, and expand their
              capabilities with Marketplace skills.
            </p>
          </div>
          <div className="flex w-full flex-col gap-4 lg:w-auto lg:min-w-[280px] lg:items-end">
            <div className="flex flex-wrap gap-2 sm:justify-end sm:gap-3">
              <button
                type="button"
                className={btnPrimary}
                onClick={openCreateSheet}
              >
                Create Agent
              </button>
              <button
                type="button"
                className={btnSecondary}
                onClick={scrollToSkills}
              >
                Import Skills
              </button>
              <Link href="/marketplace" className={btnSecondary}>
                Browse Marketplace
              </Link>
            </div>
            <CollaboratorStrip
              agents={stripAgents}
              onAgentClick={(id) => setSelectedId(id)}
            />
          </div>
        </div>

        {/* Stats */}
        <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {(
            [
              ["Total Agents", stats.totalAgents],
              ["Active Now", stats.activeNow],
              ["On Tasks", stats.onTasks],
              ["Saved Skill Packs", stats.savedSkillPacks],
            ] as const
          ).map(([label, value]) => (
            <div
              key={label}
              className="rounded-2xl border border-neutral-200/90 bg-white p-4 shadow-sm dark:border-slate-700/90 dark:bg-slate-900/60 dark:shadow-none"
            >
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-neutral-500">
                {label}
              </p>
              <p className="mt-2 text-2xl font-bold tabular-nums text-slate-900 dark:text-white">
                {value}
              </p>
            </div>
          ))}
        </div>
      </header>

      {/* Current team */}
      <section className="border-t border-neutral-200/80 bg-transparent py-10 dark:border-slate-800/80 lg:py-12">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            Current team
          </h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-neutral-400">
            Same canonical agents as Agent workspace — use ids to match runtime
            and OpenClaw logs.
          </p>
        </div>

        {agents.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-neutral-300 bg-white/80 px-6 py-16 text-center shadow-sm dark:border-slate-600 dark:bg-slate-900/40">
            <div className="mb-4 flex size-16 items-center justify-center rounded-2xl bg-sky-100 text-3xl dark:bg-sky-950/50">
              🤖
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">
              Build your first agent team
            </h3>
            <p className="mt-2 max-w-md text-sm text-slate-600 dark:text-neutral-400">
              Create agents from scratch, start from a template, or browse the
              Marketplace for skills — then assign work in one place.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-2">
              <button
                type="button"
                className={btnPrimary}
                onClick={openCreateSheet}
              >
                Create your first agent
              </button>
              <button
                type="button"
                className={btnSecondary}
                onClick={openCreateSheet}
              >
                Use a template
              </button>
              <Link href="/marketplace" className={btnSecondary}>
                Browse Marketplace
              </Link>
            </div>
            <p className="mt-6 text-xs text-slate-500 dark:text-neutral-500">
              Tip: add <code className="rounded bg-neutral-100 px-1 dark:bg-slate-800">?empty=1</code>{" "}
              to URL to toggle this state (dev).
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {agents.map((agent) => {
              const visibleTags = agent.skillTags.slice(0, 3);
              const extra = agent.skillTags.length - visibleTags.length;
              const missing = agent.rosterFieldsMissing;
              const nameMuted =
                missing?.name &&
                "italic text-slate-500 dark:text-neutral-500";
              const roleMuted =
                missing?.role &&
                "text-slate-500 dark:text-neutral-500";
              return (
                <article
                  key={agent.id}
                  className={`flex flex-col rounded-2xl border border-neutral-200/90 bg-white py-4 pl-3 pr-4 shadow-sm transition hover:shadow-md dark:border-slate-700/90 dark:bg-slate-900/70 dark:hover:border-slate-600 ${getCategoryCardClasses(agent.categoryLabel)}`}
                >
                  <div className="flex items-start gap-3">
                    <TeamAgentAvatar
                      agent={agent}
                      size="card"
                      onClick={() => setSelectedId(agent.id)}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <h3
                          className={`truncate text-base font-bold text-slate-900 dark:text-white ${nameMuted ?? ""}`}
                        >
                          {agent.emoji ? (
                            <span className="mr-1" aria-hidden>
                              {agent.emoji}
                            </span>
                          ) : null}
                          {agent.name}
                        </h3>
                        <StatusChip status={agent.status} />
                      </div>
                      <p
                        className={`truncate text-xs font-medium text-sky-700 dark:text-sky-400 ${roleMuted ?? ""}`}
                      >
                        {agent.role}
                      </p>
                      <p
                        className="mt-0.5 truncate font-mono text-[10px] text-slate-500 dark:text-neutral-500"
                        title="Stable agent id (workspace / API)"
                      >
                        {agent.id}
                      </p>
                    </div>
                  </div>
                  <p className="mt-2 line-clamp-2 text-xs leading-snug text-slate-600 dark:text-neutral-400">
                    {agent.description}
                  </p>
                  <div className="mt-2 flex min-h-[1.5rem] flex-wrap gap-1">
                    {visibleTags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-md bg-neutral-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-700 dark:bg-slate-800 dark:text-neutral-300"
                      >
                        {tag}
                      </span>
                    ))}
                    {extra > 0 ? (
                      <span className="rounded-md bg-neutral-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 dark:bg-slate-800 dark:text-neutral-500">
                        +{extra}
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-neutral-50 px-2 py-1.5 text-[11px] dark:bg-slate-800/80">
                    <span className="shrink-0 text-slate-400" aria-hidden>
                      <svg
                        className="size-3.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                        />
                      </svg>
                    </span>
                    <span className="min-w-0 truncate text-slate-700 dark:text-neutral-300">
                      <span className="font-medium text-slate-500 dark:text-neutral-500">
                        Task:{" "}
                      </span>
                      {agent.currentTask ?? "None"}
                    </span>
                  </div>
                  <p className="mt-1.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
                    {agent.performanceLabel}
                  </p>
                  <AgentCardActions
                    agent={agent}
                    onViewDetails={() => setSelectedId(agent.id)}
                    onScrollSkills={scrollToSkills}
                  />
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Build from scratch */}
      <section
        id="create-agent"
        className="border-t border-neutral-200/80 bg-transparent py-10 dark:border-slate-800/80 lg:py-12"
      >
        <h2 className="text-lg font-bold text-slate-800 dark:text-neutral-200">
          Create an agent
        </h2>
        <p className="mt-1 max-w-xl text-xs text-slate-500 dark:text-neutral-500">
          Open the builder to set name, role, avatar, personality, and skills.
          Pick a template or start blank — everything saves to this browser.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            className={btnPrimary}
            data-create-agent-primary="true"
            onClick={openCreateSheet}
          >
            Open create agent
          </button>
          <button
            type="button"
            className={btnSecondary}
            onClick={openCreateSheet}
          >
            Templates &amp; skills
          </button>
          <button
            type="button"
            className={btnOutline}
            onClick={() => toastStub("Clone from roster — coming soon")}
          >
            Clone agent
          </button>
        </div>
      </section>

      {/* Marketplace skills */}
      <section
        id="marketplace-skills"
        className="scroll-mt-24 border-t border-neutral-200/80 bg-transparent py-10 dark:border-slate-800/80 lg:py-12"
      >
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
          Marketplace skills
        </h2>
        <p className="mt-1 max-w-2xl text-sm text-slate-600 dark:text-neutral-400">
          Import capabilities into your agents. Filter by category, division, or
          search by name — same catalog as the Skills marketplace.
        </p>
        <label className="mt-5 block max-w-xl">
          <span className="sr-only">Search skills</span>
          <input
            type="search"
            placeholder="Search skills…"
            value={skillQuery}
            onChange={(e) => setSkillQuery(e.target.value)}
            className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-sm shadow-sm outline-none placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white dark:placeholder:text-neutral-500"
          />
        </label>
        <div
          className="mt-5 flex flex-wrap gap-2"
          role="group"
          aria-label="Filter by category or division"
        >
          <button
            type="button"
            onClick={() => setSkillFacet("all")}
            className={
              skillFacet === "all"
                ? "rounded-full bg-slate-900 px-4 py-1.5 text-xs font-semibold text-white dark:bg-neutral-100 dark:text-slate-900"
                : "rounded-full border border-neutral-300 bg-white px-4 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-neutral-50 dark:border-slate-600 dark:bg-slate-800 dark:text-neutral-200 dark:hover:bg-slate-700"
            }
          >
            All
          </button>
          {teamFacetChips.map((f) => {
            const selected = skillFacet === f.id;
            const importableCategory =
              f.id.startsWith("imp:") ? f.id.slice(4) : null;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setSkillFacet(f.id)}
                className={
                  selected
                    ? importableCategory
                      ? `rounded-full px-4 py-1.5 text-xs font-semibold ${getCategoryFilterSelectedClasses(importableCategory)}`
                      : "rounded-full bg-slate-900 px-4 py-1.5 text-xs font-semibold text-white dark:bg-neutral-100 dark:text-slate-900"
                    : "rounded-full border border-neutral-300 bg-white px-4 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-neutral-50 dark:border-slate-600 dark:bg-slate-800 dark:text-neutral-200 dark:hover:bg-slate-700"
                }
              >
                {f.label}
              </button>
            );
          })}
        </div>
        {filteredSkillItems.length === 0 ? (
          <p className="mt-6 text-center text-sm text-slate-500 dark:text-neutral-500">
            No skills match your filters.
          </p>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredSkillItems.map((item) => (
              <MarketplaceSkillCard
                key={item.id}
                item={item}
                variant="team"
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
