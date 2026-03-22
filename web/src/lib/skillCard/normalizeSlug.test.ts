import { describe, expect, it } from "vitest";
import { normalizeSlug } from "./normalizeSlug";

describe("normalizeSlug", () => {
  it("lowercases and replaces spaces", () => {
    expect(normalizeSlug("  Ontario Residential Tenancy  ")).toBe(
      "ontario-residential-tenancy",
    );
  });

  it("strips unsafe characters", () => {
    expect(normalizeSlug("Hello & World!!!")).toBe("hello-world");
  });

  it("collapses multiple hyphens", () => {
    expect(normalizeSlug("a---b__c")).toBe("a-b-c");
  });
});
