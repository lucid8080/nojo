import { describe, expect, it } from "vitest";
import {
  recommendedSkillIdsForRole,
  resolveSkillLabel,
  skillNamesFromIds,
} from "./skillCatalog";

describe("resolveSkillLabel", () => {
  it("resolves importable id", () => {
    expect(resolveSkillLabel("sk-1")).toBe("Deep research");
  });

  it("resolves agency catalog id to title", () => {
    expect(resolveSkillLabel("testing/testing-accessibility-auditor.md")).toBe(
      "Accessibility Auditor",
    );
  });

  it("passes through unknown ids", () => {
    expect(resolveSkillLabel("unknown-skill-id")).toBe("unknown-skill-id");
  });
});

describe("skillNamesFromIds", () => {
  it("resolves known ids to display names", () => {
    expect(skillNamesFromIds(["sk-1"])).toEqual(["Deep research"]);
  });

  it("resolves agency ids to titles", () => {
    expect(
      skillNamesFromIds(["testing/testing-accessibility-auditor.md"]),
    ).toEqual(["Accessibility Auditor"]);
  });

  it("passes through unknown ids", () => {
    expect(skillNamesFromIds(["unknown"])).toEqual(["unknown"]);
  });

  it("returns empty for undefined or empty input", () => {
    expect(skillNamesFromIds(undefined)).toEqual([]);
    expect(skillNamesFromIds([])).toEqual([]);
  });
});

describe("recommendedSkillIdsForRole", () => {
  it("suggests support-related skills for support roles", () => {
    const ids = recommendedSkillIdsForRole("Support Triage", "SUPPORT");
    expect(ids.length).toBeGreaterThan(0);
    expect(ids).toContain("sk-6");
  });

  it("returns only catalog ids", () => {
    const ids = recommendedSkillIdsForRole("Engineering", "ENGINEERING");
    for (const id of ids) {
      expect(id).toMatch(/^sk-/);
    }
  });
});
