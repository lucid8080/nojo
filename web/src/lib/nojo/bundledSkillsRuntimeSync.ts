import "server-only";

import fs from "node:fs/promises";
import path from "node:path";

import {
  bundledSkillEntriesForSkillIds,
  knownBundledSkillContentSlugs,
} from "@/data/marketplaceSkillCatalog";

import {
  assertSafeBundledSkillSlug,
  resolveBundledSkillSourceDir,
  resolveRepoSkillsRoot,
} from "./bundledSkillsPaths";

const MANIFEST_NAME = ".nojo-bundled-manifest.json";

export type BundledSkillSyncError = { slug?: string; skillId?: string; message: string };

export type SyncBundledSkillPacksResult = {
  repoSkillsRoot: string | null;
  runtimeSkillsDir: string;
  syncedSlugs: string[];
  removedSlugs: string[];
  skippedSkillIds: string[];
  errors: BundledSkillSyncError[];
};

function parseCommaSeparatedSkillIds(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Env: comma-separated catalog ids (e.g. `sk-9`) for canonical Nojo agents. */
export const NOJO_CANONICAL_AGENT_BUNDLED_SKILL_IDS_ENV = "NOJO_CANONICAL_AGENT_BUNDLED_SKILL_IDS";

export function parseBundledSkillIdsFromEnv(raw: string | undefined): string[] {
  return parseCommaSeparatedSkillIds(raw);
}

/**
 * Optional opt-in for **canonical** agents (`nojo-main`, …): copy bundled skill trees when
 * `NOJO_CANONICAL_AGENT_BUNDLED_SKILL_IDS` is set (e.g. `sk-9`). No effect when unset.
 */
export async function syncBundledSkillPacksForCanonicalAgentFromEnv(
  runtimeWorkspaceAbsPath: string,
): Promise<SyncBundledSkillPacksResult | null> {
  const ids = parseBundledSkillIdsFromEnv(process.env[NOJO_CANONICAL_AGENT_BUNDLED_SKILL_IDS_ENV]);
  if (!ids.length) return null;
  return syncBundledSkillPacksToWorkspace({ runtimeWorkspaceAbsPath, skillIds: ids });
}

/**
 * Copy `{repo}/skills/{slug}/**` → `{runtimeWorkspace}/skills/{slug}/**` for assigned catalog ids;
 * remove known-catalog slugs that are no longer assigned (does not delete unknown dirs under `skills/`).
 */
export async function syncBundledSkillPacksToWorkspace(opts: {
  runtimeWorkspaceAbsPath: string;
  skillIds: string[];
}): Promise<SyncBundledSkillPacksResult> {
  const runtimeRoot = path.resolve(opts.runtimeWorkspaceAbsPath.trim());
  const runtimeSkillsDir = path.join(runtimeRoot, "skills");
  const skippedSkillIds = opts.skillIds.filter(
    (id) => !bundledSkillEntriesForSkillIds([id]).length,
  );
  const entries = bundledSkillEntriesForSkillIds(opts.skillIds);
  const targetSlugs = new Set(entries.map((e) => e.contentSlug));
  const syncedSlugs: string[] = [];
  const removedSlugs: string[] = [];
  const errors: BundledSkillSyncError[] = [];

  const repoSkillsRoot = await resolveRepoSkillsRoot();
  if (!repoSkillsRoot) {
    errors.push({
      message:
        "Could not resolve repo skills root (expected skills/README.md in a parent of process.cwd()).",
    });
    return {
      repoSkillsRoot: null,
      runtimeSkillsDir,
      syncedSlugs,
      removedSlugs,
      skippedSkillIds,
      errors,
    };
  }

  try {
    await fs.mkdir(runtimeSkillsDir, { recursive: true });
  } catch (err) {
    errors.push({
      message: err instanceof Error ? err.message : String(err),
    });
    return {
      repoSkillsRoot,
      runtimeSkillsDir,
      syncedSlugs,
      removedSlugs,
      skippedSkillIds,
      errors,
    };
  }

  for (const e of entries) {
    let safeSlug: string;
    try {
      safeSlug = assertSafeBundledSkillSlug(e.contentSlug);
    } catch (err) {
      errors.push({
        skillId: e.skillId,
        slug: e.contentSlug,
        message: err instanceof Error ? err.message : String(err),
      });
      continue;
    }
    let src: string;
    try {
      src = resolveBundledSkillSourceDir(repoSkillsRoot, safeSlug);
    } catch (err) {
      errors.push({
        skillId: e.skillId,
        slug: safeSlug,
        message: err instanceof Error ? err.message : String(err),
      });
      continue;
    }
    const dest = path.join(runtimeSkillsDir, safeSlug);
    try {
      await fs.access(src);
    } catch {
      errors.push({
        skillId: e.skillId,
        slug: safeSlug,
        message: `Bundled skill source missing on disk: ${src}`,
      });
      continue;
    }
    try {
      await fs.cp(src, dest, { recursive: true, force: true });
      syncedSlugs.push(safeSlug);
    } catch (err) {
      errors.push({
        skillId: e.skillId,
        slug: safeSlug,
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  const known = knownBundledSkillContentSlugs();
  try {
    const dirents = await fs.readdir(runtimeSkillsDir, { withFileTypes: true });
    for (const d of dirents) {
      if (!d.isDirectory()) continue;
      const name = d.name;
      if (name.startsWith(".")) continue;
      if (known.has(name) && !targetSlugs.has(name)) {
        try {
          await fs.rm(path.join(runtimeSkillsDir, name), { recursive: true, force: true });
          removedSlugs.push(name);
        } catch (err) {
          errors.push({
            slug: name,
            message: err instanceof Error ? err.message : String(err),
          });
        }
      }
    }
  } catch {
    // skills dir missing — already handled
  }

  try {
    const manifest = {
      skillIds: opts.skillIds,
      syncedSlugs,
      removedSlugs,
      updatedAt: new Date().toISOString(),
    };
    await fs.writeFile(
      path.join(runtimeSkillsDir, MANIFEST_NAME),
      `${JSON.stringify(manifest, null, 2)}\n`,
      "utf8",
    );
  } catch (err) {
    errors.push({
      message: `Failed to write manifest: ${err instanceof Error ? err.message : String(err)}`,
    });
  }

  return {
    repoSkillsRoot,
    runtimeSkillsDir,
    syncedSlugs,
    removedSlugs,
    skippedSkillIds,
    errors,
  };
}
