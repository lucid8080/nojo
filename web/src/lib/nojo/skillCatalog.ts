import type { AgencyAgentsPayload } from "@/data/agencyAgents.types";
import agencyData from "@/data/agencyAgents.json";
import { importableSkillsMock } from "@/data/marketplaceSkillCatalog";

const skillNameById = new Map(
  importableSkillsMock.map((s) => [s.id, s.name] as const),
);

const agencyPayload = agencyData as AgencyAgentsPayload;
const agencyTitleById = new Map(
  agencyPayload.agents.map((a) => [a.id, a.title] as const),
);

function labelFromCmsCanonicalId(id: string): string | null {
  const prefix = "cms:";
  if (!id.startsWith(prefix)) return null;
  const slug = id.slice(prefix.length).trim();
  if (!slug) return null;
  return slug
    .split("-")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/** Single id → label (importable name, else agency catalog title, else CMS slug label, else raw id). */
export function resolveSkillLabel(id: string): string {
  const cms = labelFromCmsCanonicalId(id);
  if (cms) return cms;
  return skillNameById.get(id) ?? agencyTitleById.get(id) ?? id;
}

/** Resolve assigned skill ids to display names (importable + agency catalog). */
export function skillNamesFromIds(ids: string[] | undefined): string[] {
  if (!ids?.length) return [];
  return ids.map((id) => resolveSkillLabel(id));
}

const ROLE_KEYWORDS: { kw: RegExp; ids: string[] }[] = [
  { kw: /support|triage|customer/i, ids: ["sk-6", "sk-8"] },
  { kw: /sales|outbound|research/i, ids: ["sk-2", "sk-1"] },
  { kw: /engineer|code|pipeline|dev/i, ids: ["sk-3"] },
  { kw: /content|writer|marketing|brand/i, ids: ["sk-4", "sk-1"] },
  { kw: /ops|billing|invoice/i, ids: ["sk-7"] },
  {
    kw: /property|landlord|tenant|rental|ltb|ontario|tenancy/i,
    ids: ["sk-9"],
  },
];

const CATEGORY_HINTS: Record<string, string[]> = {
  SUPPORT: ["sk-6", "sk-8"],
  SALES: ["sk-2", "sk-5"],
  STRATEGY: ["sk-1", "sk-2"],
  ENGINEERING: ["sk-3", "sk-7"],
  MARKETING: ["sk-4", "sk-1"],
  TESTING: ["sk-3"],
  SPECIALIZED: ["sk-1", "sk-5", "sk-9"],
};

/** Heuristic recommendations for the skills picker (v1). */
export function recommendedSkillIdsForRole(
  role: string,
  categoryLabel: string,
): string[] {
  const cat = categoryLabel.trim().toUpperCase();
  const fromCat = CATEGORY_HINTS[cat];
  const fromRole: string[] = [];
  for (const { kw, ids } of ROLE_KEYWORDS) {
    if (kw.test(role)) fromRole.push(...ids);
  }
  const merged = [...(fromCat ?? []), ...fromRole];
  return [...new Set(merged)].filter((id) => skillNameById.has(id));
}
