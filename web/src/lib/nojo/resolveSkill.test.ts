import { describe, expect, it } from "vitest";
import {
  decodeSkillIdParam,
  resolveSkillByCanonicalId,
  resolveSkillByEncodedId,
  skillDetailHref,
} from "./resolveSkill";
import { resolveSkillLabel } from "./skillCatalog";

describe("decodeSkillIdParam / skillDetailHref round-trip", () => {
  it("round-trips importable id", () => {
    const id = "sk-1";
    const path = skillDetailHref(id);
    expect(path).toBe("/skills/sk-1");
    const seg = path.replace(/^\/skills\//, "");
    expect(decodeSkillIdParam(seg)).toBe(id);
  });

  it("round-trips agency id with slashes", () => {
    const id = "testing/testing-accessibility-auditor.md";
    const path = skillDetailHref(id);
    expect(path).toContain("%2F");
    const seg = path.replace(/^\/skills\//, "");
    expect(decodeSkillIdParam(seg)).toBe(id);
  });
});

describe("resolveSkillByCanonicalId", () => {
  it("resolves importable skill", () => {
    const r = resolveSkillByCanonicalId("sk-1");
    expect(r?.kind).toBe("importable");
    if (r?.kind === "importable") {
      expect(r.skill.name).toBe("Deep research");
    }
  });

  it("resolves agency skill", () => {
    const id = "testing/testing-accessibility-auditor.md";
    const r = resolveSkillByCanonicalId(id);
    expect(r?.kind).toBe("agency");
    if (r?.kind === "agency") {
      expect(r.agent.title).toBe("Accessibility Auditor");
    }
  });

  it("returns null for unknown id", () => {
    expect(resolveSkillByCanonicalId("no-such-skill")).toBeNull();
  });
});

describe("resolveSkillByEncodedId", () => {
  it("accepts encoded segment", () => {
    const encoded = encodeURIComponent(
      "testing/testing-accessibility-auditor.md",
    );
    const r = resolveSkillByEncodedId(encoded);
    expect(r?.kind).toBe("agency");
  });
});

describe("resolveSkillLabel", () => {
  it("uses agency title for agency id", () => {
    const label = resolveSkillLabel("testing/testing-accessibility-auditor.md");
    expect(label).toBe("Accessibility Auditor");
  });
});
