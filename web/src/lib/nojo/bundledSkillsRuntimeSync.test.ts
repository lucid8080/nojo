import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { clearRepoSkillsRootCacheForTests } from "./bundledSkillsPaths";
import { syncBundledSkillPacksToWorkspace } from "./bundledSkillsRuntimeSync";

describe("bundledSkillsRuntimeSync", () => {
  it("copies sk-9 pack into runtime workspace and prunes when unassigned", async () => {
    clearRepoSkillsRootCacheForTests();
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "nojo-bundled-sync-"));
    try {
      const r1 = await syncBundledSkillPacksToWorkspace({
        runtimeWorkspaceAbsPath: tmp,
        skillIds: ["sk-9"],
      });
      expect(r1.errors.length).toBe(0);
      expect(r1.syncedSlugs).toContain("ontario-residential-tenancy");
      const skillMd = await fs.readFile(
        path.join(tmp, "skills", "ontario-residential-tenancy", "SKILL.md"),
        "utf8",
      );
      expect(skillMd).toContain("Ontario residential tenancy");

      const r2 = await syncBundledSkillPacksToWorkspace({
        runtimeWorkspaceAbsPath: tmp,
        skillIds: [],
      });
      expect(r2.errors.length).toBe(0);
      await expect(
        fs.access(path.join(tmp, "skills", "ontario-residential-tenancy", "SKILL.md")),
      ).rejects.toBeDefined();
    } finally {
      await fs.rm(tmp, { recursive: true, force: true });
      clearRepoSkillsRootCacheForTests();
    }
  });
});
