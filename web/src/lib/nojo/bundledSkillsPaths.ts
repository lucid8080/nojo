import "server-only";

import fs from "node:fs/promises";
import path from "node:path";

const repoSkillsRootByCwd = new Map<string, Promise<string | null>>();

/**
 * Walk upward from `process.cwd()` until `skills/README.md` exists (repo root skills pack).
 * Matches the layout described in `skills/README.md` at the monorepo root.
 */
async function doResolveRepoSkillsRoot(): Promise<string | null> {
  let dir = process.cwd();
  for (let i = 0; i < 12; i++) {
    const candidate = path.join(dir, "skills");
    const readme = path.join(candidate, "README.md");
    try {
      await fs.access(readme);
      const st = await fs.stat(candidate);
      if (st.isDirectory()) {
        return path.resolve(candidate);
      }
    } catch {
      // not found or unreadable
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

export function resolveRepoSkillsRoot(): Promise<string | null> {
  const cwd = process.cwd();
  let p = repoSkillsRootByCwd.get(cwd);
  if (!p) {
    p = doResolveRepoSkillsRoot();
    repoSkillsRootByCwd.set(cwd, p);
  }
  return p;
}

/** Test-only: reset memoized cache so `process.cwd()` can change between tests. */
export function clearRepoSkillsRootCacheForTests(): void {
  repoSkillsRootByCwd.clear();
}

/**
 * Validate a directory name under `skills/` (no path traversal, single segment).
 */
export function assertSafeBundledSkillSlug(slug: string): string {
  const t = slug.trim();
  if (!t || t.includes("..") || t.includes("/") || t.includes("\\")) {
    throw new Error("Invalid bundled skill slug");
  }
  const normalized = path.normalize(t);
  if (normalized !== t || path.isAbsolute(t)) {
    throw new Error("Invalid bundled skill slug");
  }
  if (!/^[a-z0-9][a-z0-9-]*$/i.test(t)) {
    throw new Error("Invalid bundled skill slug");
  }
  return t;
}

/**
 * Resolved absolute path to `{repoSkillsRoot}/{slug}`; must stay under `repoSkillsRoot`.
 */
export function resolveBundledSkillSourceDir(repoSkillsRoot: string, slug: string): string {
  const safe = assertSafeBundledSkillSlug(slug);
  const rootResolved = path.resolve(repoSkillsRoot);
  const src = path.resolve(rootResolved, safe);
  const prefix = rootResolved.endsWith(path.sep) ? rootResolved : rootResolved + path.sep;
  if (src !== rootResolved && !src.startsWith(prefix)) {
    throw new Error("Bundled skill path escapes repo skills root");
  }
  return src;
}
