import agencyData from "@/data/agencyAgents.json";
import type { AgencyAgentsPayload } from "@/data/agencyAgents.types";
import { describe, expect, it } from "vitest";
import {
  buildHomeSections,
  bundledSkillEntriesForSkillIds,
  cmsSkillCardsToMarketplaceModels,
  filterMarketplaceItemsByFacet,
  getMarketplaceSkillCardItems,
  importableSkills,
  marketplaceCardMatchesSearch,
  mergeMarketplaceSkillItems,
  facetIdForImportableCategory,
} from "./marketplaceSkillCatalog";

const payload = agencyData as AgencyAgentsPayload;

describe("marketplaceSkillCatalog", () => {
  it("includes all importables and agency agents in merged card list", () => {
    const items = getMarketplaceSkillCardItems(payload);
    const importableIds = new Set(importableSkills.map((s) => s.id));
    const agencyIds = new Set(payload.agents.map((a) => a.id));
    expect(items.length).toBe(importableSkills.length + payload.agents.length);
    for (const id of importableIds) {
      expect(items.some((i) => i.id === id && i.kind === "importable")).toBe(
        true,
      );
    }
    for (const id of agencyIds) {
      expect(items.some((i) => i.id === id && i.kind === "agency")).toBe(true);
    }
  });

  it("marks sk-9 Ontario skill as premium importable", () => {
    const items = getMarketplaceSkillCardItems(payload);
    const sk9 = items.find((i) => i.id === "sk-9");
    expect(sk9?.kind).toBe("importable");
    expect(sk9?.isPremium).toBe(true);
    expect(sk9?.title).toBe("Ontario residential tenancy");
    const cat = importableSkills.find((s) => s.id === "sk-9");
    expect(cat?.contentSlug).toBe("ontario-residential-tenancy");
  });

  it("bundledSkillEntriesForSkillIds maps sk-9 to repo slug", () => {
    const rows = bundledSkillEntriesForSkillIds(["sk-9", "sk-1"]);
    expect(rows).toEqual([
      {
        skillId: "sk-9",
        contentSlug: "ontario-residential-tenancy",
        name: "Ontario residential tenancy",
      },
    ]);
  });

  it("filters by importable facet", () => {
    const items = getMarketplaceSkillCardItems(payload);
    const property = filterMarketplaceItemsByFacet(
      items,
      facetIdForImportableCategory("Property"),
    );
    expect(property.every((i) => i.facetId === "imp:Property")).toBe(true);
    expect(property.some((i) => i.id === "sk-9")).toBe(true);
  });

  it("search matches title and description", () => {
    const items = getMarketplaceSkillCardItems(payload);
    const ontario = items.filter((i) =>
      marketplaceCardMatchesSearch(i, "ontario"),
    );
    expect(ontario.some((i) => i.id === "sk-9")).toBe(true);
  });

  it("buildHomeSections includes premium in featured when present", () => {
    const items = getMarketplaceSkillCardItems(payload);
    const { featured } = buildHomeSections(items, payload.agents);
    expect(featured.some((i) => i.id === "sk-9")).toBe(true);
  });

  it("merges CMS skill cards into marketplace list", () => {
    const base = getMarketplaceSkillCardItems(payload);
    const cms = cmsSkillCardsToMarketplaceModels([
      {
        slug: "custom-topic",
        title: "Custom Topic",
        summary: "Summary text",
        category: "Research",
        tags: ["a", "b"],
      },
    ]);
    const merged = mergeMarketplaceSkillItems(base, cms);
    expect(merged.some((i) => i.kind === "cms" && i.id === "cms:custom-topic")).toBe(
      true,
    );
  });
});
