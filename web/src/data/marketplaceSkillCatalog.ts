/**
 * Canonical marketplace skill catalog: importable skills (`sk-*`) + Agency bundled agents.
 * Used by Team marketplace section, /marketplace, pickers (importable slice), and resolveSkillLabel.
 */

import agencyData from "@/data/agencyAgents.json";
import type { AgencyAgent, AgencyAgentsPayload } from "@/data/agencyAgents.types";

export type ImportableSkill = {
  id: string;
  name: string;
  category: string;
  description: string;
  compatibility: string;
  icon: string;
  /** When true, UI shows elevated “premium” styling (source of truth for presentation). */
  isPremium?: boolean;
  /**
   * When set, repo-bundled markdown lives at `{repo}/skills/{contentSlug}/` (SKILL.md, references/, …)
   * and is synced into the agent OpenClaw workspace under `workspace/skills/{contentSlug}/`.
   */
  contentSlug?: string;
};

export const importableSkills: ImportableSkill[] = [
  {
    id: "sk-1",
    name: "Deep research",
    category: "Research",
    description:
      "Multi-step web research with source aggregation and summaries.",
    compatibility: "All agents",
    icon: "🔍",
  },
  {
    id: "sk-2",
    name: "CRM sync",
    category: "Integrations",
    description: "Push notes and tasks to Salesforce / HubSpot automatically.",
    compatibility: "Sales & CS agents",
    icon: "🔗",
  },
  {
    id: "sk-3",
    name: "Code review assistant",
    category: "Engineering",
    description: "Suggests security and style fixes on pull requests.",
    compatibility: "Engineering agents",
    icon: "⚙️",
  },
  {
    id: "sk-4",
    name: "Brand voice",
    category: "Content",
    description: "Enforce tone and terminology from your style guide.",
    compatibility: "Content agents",
    icon: "✍️",
  },
  {
    id: "sk-5",
    name: "Meeting scribe",
    category: "Productivity",
    description: "Live notes, action items, and recap emails post-call.",
    compatibility: "All agents",
    icon: "📝",
  },
  {
    id: "sk-6",
    name: "Compliance check",
    category: "Legal",
    description: "Flag risky language in customer-facing drafts.",
    compatibility: "Support & sales",
    icon: "⚖️",
  },
  {
    id: "sk-7",
    name: "Data viz",
    category: "Analytics",
    description: "Turn tabular exports into chart-ready summaries.",
    compatibility: "Research & ops",
    icon: "📊",
  },
  {
    id: "sk-8",
    name: "Multilingual reply",
    category: "Support",
    description: "Draft replies in 20+ languages with glossary locks.",
    compatibility: "Support agents",
    icon: "🌐",
  },
  {
    id: "sk-9",
    name: "Ontario residential tenancy",
    category: "Property",
    description:
      "Ontario landlord–tenant workflows under the RTA: LTB-oriented guidance, standard notices (N4, N5 families), intake before drafting notices, and professional tenant or landlord correspondence.",
    compatibility: "Property, support & specialized agents",
    icon: "🏛️",
    isPremium: true,
    contentSlug: "ontario-residential-tenancy",
  },
];

/** @deprecated Prefer `importableSkills` — alias for legacy imports. */
export const importableSkillsMock = importableSkills;

export type BundledSkillCatalogEntry = {
  skillId: string;
  contentSlug: string;
  name: string;
};

/** Importable skills that have a repo `skills/{contentSlug}/` tree (for runtime sync and USER.md hints). */
export function bundledSkillEntriesForSkillIds(
  skillIds: string[] | undefined,
): BundledSkillCatalogEntry[] {
  if (!skillIds?.length) return [];
  const out: BundledSkillCatalogEntry[] = [];
  for (const skillId of skillIds) {
    const s = importableSkills.find((x) => x.id === skillId);
    const slug = s?.contentSlug?.trim();
    if (s && slug) {
      out.push({ skillId, contentSlug: slug, name: s.name });
    }
  }
  return out;
}

/** Slugs declared in the catalog (used to prune stale copies under workspace/skills/). */
export function knownBundledSkillContentSlugs(): ReadonlySet<string> {
  return new Set(
    importableSkills.map((s) => s.contentSlug?.trim()).filter((x): x is string => Boolean(x)),
  );
}

export const skillCategories = [
  "All",
  ...Array.from(new Set(importableSkills.map((s) => s.category))),
] as const;

export type MarketplaceSkillCardKind = "importable" | "agency" | "cms";

export type MarketplaceSkillCardModel = {
  kind: MarketplaceSkillCardKind;
  id: string;
  title: string;
  description: string;
  /** Tag shown on the card */
  categoryTag: string;
  /** Stable filter id: `imp:Category` or `div:division-slug` or `cms:Category` */
  facetId: string;
  icon?: string;
  isPremium?: boolean;
  githubUrl?: string;
  /** Present for importable rows — used for premium card styling */
  importable?: ImportableSkill;
  /** CMS skill cards — public URL uses slug */
  cmsSlug?: string;
  cmsTags?: string[];
};

export function facetIdForImportableCategory(category: string): string {
  return `imp:${category}`;
}

export function facetIdForAgencyDivision(division: string): string {
  return `div:${division}`;
}

export function facetIdForCmsCategory(category: string): string {
  return `cms:${category}`;
}

export function divisionChipLabel(division: string): string {
  return division.replace(/-/g, " ").toUpperCase();
}

export function sortMarketplaceCardItemsByTitle(
  list: MarketplaceSkillCardModel[],
): MarketplaceSkillCardModel[] {
  return [...list].sort((x, y) => x.title.localeCompare(y.title));
}

export function toMarketplaceSkillCardModels(
  importables: ImportableSkill[],
  agents: AgencyAgent[],
): MarketplaceSkillCardModel[] {
  const imp: MarketplaceSkillCardModel[] = importables.map((s) => ({
    kind: "importable",
    id: s.id,
    title: s.name,
    description: s.description,
    categoryTag: s.category,
    facetId: facetIdForImportableCategory(s.category),
    icon: s.icon,
    isPremium: s.isPremium,
    importable: s,
  }));
  const ag: MarketplaceSkillCardModel[] = agents.map((a) => ({
    kind: "agency",
    id: a.id,
    title: a.title,
    description: a.description,
    categoryTag: a.categoryLabel,
    facetId: facetIdForAgencyDivision(a.division),
    githubUrl: a.githubUrl,
  }));
  return [...imp, ...ag];
}

export function getMarketplaceSkillCardItems(
  payload: AgencyAgentsPayload = agencyData as AgencyAgentsPayload,
): MarketplaceSkillCardModel[] {
  return toMarketplaceSkillCardModels(importableSkills, payload.agents);
}

export type CmsSkillCardListInput = {
  slug: string;
  title: string;
  summary: string;
  category: string;
  tags: unknown;
};

/** Map published DB skill cards to marketplace models (canonical id `cms:{slug}`). */
export function cmsSkillCardsToMarketplaceModels(
  rows: CmsSkillCardListInput[],
): MarketplaceSkillCardModel[] {
  return rows.map((row) => {
    const tagArr = Array.isArray(row.tags)
      ? row.tags.filter((t): t is string => typeof t === "string")
      : [];
    return {
      kind: "cms",
      id: `cms:${row.slug}`,
      title: row.title,
      description: row.summary,
      categoryTag: row.category,
      facetId: facetIdForCmsCategory(row.category),
      icon: "📄",
      cmsSlug: row.slug,
      cmsTags: tagArr,
    };
  });
}

export function mergeMarketplaceSkillItems(
  base: MarketplaceSkillCardModel[],
  cms: MarketplaceSkillCardModel[],
): MarketplaceSkillCardModel[] {
  return [...base, ...cms];
}

export function marketplaceCardMatchesSearch(
  item: MarketplaceSkillCardModel,
  queryLower: string,
): boolean {
  if (!queryLower) return true;
  const tagHay =
    item.kind === "cms" && item.cmsTags?.length
      ? item.cmsTags.join(" ")
      : "";
  const hay = [
    item.title,
    item.description,
    item.categoryTag,
    item.kind,
    tagHay,
  ]
    .join(" ")
    .toLowerCase();
  return hay.includes(queryLower);
}

export function filterMarketplaceItemsByFacet(
  items: MarketplaceSkillCardModel[],
  facetId: string | "all",
): MarketplaceSkillCardModel[] {
  if (facetId === "all") return items;
  return items.filter((i) => i.facetId === facetId);
}

export type MarketplaceFacetChip = {
  id: string;
  label: string;
};

/** Facets for filter chips (importable categories + agency divisions + CMS categories). */
export function getMarketplaceFacetChips(
  importables: ImportableSkill[],
  agents: AgencyAgent[],
  cmsCategories: string[] = [],
): MarketplaceFacetChip[] {
  const cats = [...new Set(importables.map((s) => s.category))].sort();
  const divs = [...new Set(agents.map((a) => a.division))].sort();
  const cmsCats = [...new Set(cmsCategories)].sort();
  const chips: MarketplaceFacetChip[] = [];
  for (const c of cats) {
    chips.push({ id: facetIdForImportableCategory(c), label: c });
  }
  for (const d of divs) {
    chips.push({
      id: facetIdForAgencyDivision(d),
      label: divisionChipLabel(d),
    });
  }
  for (const c of cmsCats) {
    chips.push({ id: facetIdForCmsCategory(c), label: c });
  }
  return chips;
}

export function pickFeaturedAllDivisions(agents: AgencyAgent[]): AgencyAgent[] {
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

export function buildHomeSections(
  items: MarketplaceSkillCardModel[],
  agents: AgencyAgent[],
): { featured: MarketplaceSkillCardModel[]; popular: MarketplaceSkillCardModel[] } {
  const byId = new Map(items.map((i) => [i.id, i]));
  const premium = items.filter(
    (i) => i.kind === "importable" && i.isPremium === true,
  );
  const agencyFeaturedAgents = pickFeaturedAllDivisions(agents);
  const agencyFeaturedCards = agencyFeaturedAgents
    .map((a) => byId.get(a.id))
    .filter((x): x is MarketplaceSkillCardModel => x != null);

  const featured: MarketplaceSkillCardModel[] = [];
  const featuredIds = new Set<string>();

  for (const p of premium) {
    if (featured.length >= 5) break;
    featured.push(p);
    featuredIds.add(p.id);
  }
  for (const a of agencyFeaturedCards) {
    if (featured.length >= 5) break;
    if (!featuredIds.has(a.id)) {
      featured.push(a);
      featuredIds.add(a.id);
    }
  }

  const rest = sortMarketplaceCardItemsByTitle(
    items.filter((i) => !featuredIds.has(i.id)),
  );
  return { featured, popular: rest.slice(0, 15) };
}
