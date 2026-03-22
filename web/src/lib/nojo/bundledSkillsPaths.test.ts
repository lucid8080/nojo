import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  assertSafeBundledSkillSlug,
  clearRepoSkillsRootCacheForTests,
  resolveBundledSkillSourceDir,
  resolveRepoSkillsRoot,
} from "./bundledSkillsPaths";

describe("bundledSkillsPaths", () => {
  it("assertSafeBundledSkillSlug accepts kebab-case slugs", () => {
    expect(assertSafeBundledSkillSlug("ontario-residential-tenancy")).toBe(
      "ontario-residential-tenancy",
    );
  });

  it("assertSafeBundledSkillSlug rejects traversal", () => {
    expect(() => assertSafeBundledSkillSlug("../x")).toThrow();
    expect(() => assertSafeBundledSkillSlug("a/b")).toThrow();
  });

  it("resolveBundledSkillSourceDir stays under repo root", () => {
    const root = path.resolve("/repo/skills");
    const src = resolveBundledSkillSourceDir(root, "foo-bar");
    expect(src).toBe(path.join(root, "foo-bar"));
  });

  it("resolveRepoSkillsRoot finds monorepo skills/ from cwd", async () => {
    clearRepoSkillsRootCacheForTests();
    const root = await resolveRepoSkillsRoot();
    expect(root).not.toBeNull();
    const readme = path.join(root!, "README.md");
    await expect(fs.access(readme)).resolves.toBeUndefined();
  });

  it("resolveRepoSkillsRoot returns null when skills tree is absent", async () => {
    clearRepoSkillsRootCacheForTests();
    const prev = process.cwd();
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "nojo-skills-abs-"));
    try {
      process.chdir(tmp);
      const root = await resolveRepoSkillsRoot();
      expect(root).toBeNull();
    } finally {
      process.chdir(prev);
      clearRepoSkillsRootCacheForTests();
    }
  });
});
