import path from "path";
import { describe, expect, it } from "vitest";
import matter from "gray-matter";
import {
  assertSafeBundledRelativePath,
  loadAgencySkillMarkdown,
} from "./agencySkillLoader";

describe("assertSafeBundledRelativePath", () => {
  it("accepts normal repo-relative paths", () => {
    expect(assertSafeBundledRelativePath("testing/foo.md")).toBe(
      path.join("testing", "foo.md"),
    );
  });

  it("rejects path traversal", () => {
    expect(() => assertSafeBundledRelativePath("../secret")).toThrow();
    expect(() => assertSafeBundledRelativePath("a/../../b")).toThrow();
  });
});

describe("gray-matter fixture", () => {
  it("splits frontmatter and body like bundled files", () => {
    const raw = `---
name: Test Agent
description: A test.
---
# Hello

Body **here**.
`;
    const { content, data } = matter(raw);
    expect(data.name).toBe("Test Agent");
    expect(content.trim().startsWith("# Hello")).toBe(true);
  });
});

describe("loadAgencySkillMarkdown", () => {
  it("loads a known bundled skill when sync has run", () => {
    const loaded = loadAgencySkillMarkdown(
      "testing/testing-accessibility-auditor.md",
    );
    expect(loaded).not.toBeNull();
    expect(loaded!.body.length).toBeGreaterThan(100);
    expect(loaded!.data.name).toBeDefined();
  });

  it("returns null for missing files", () => {
    expect(loadAgencySkillMarkdown("does-not-exist/nope.md")).toBeNull();
  });
});
