import fs from "fs";
import path from "path";
import matter from "gray-matter";

export const AGENCY_AGENTS_BUNDLED_DIR = "src/data/agency-agents-bundled";

/**
 * Resolve and validate a repo-relative path (e.g. testing/foo.md). No path traversal.
 */
export function assertSafeBundledRelativePath(relativePath: string): string {
  if (!relativePath || relativePath.includes("..")) {
    throw new Error("Invalid content path");
  }
  const normalized = path.normalize(relativePath.replace(/\//g, path.sep));
  if (path.isAbsolute(normalized) || normalized.startsWith("..")) {
    throw new Error("Invalid content path");
  }
  return relativePath.split("/").join(path.sep);
}

export type LoadedAgencyMarkdown = {
  /** Markdown body only (after frontmatter), for rendering. */
  body: string;
  data: Record<string, unknown>;
};

/**
 * Read bundled agency-agents markdown from disk (server-only). Parses frontmatter;
 * returns body for react-markdown.
 */
export function loadAgencySkillMarkdown(relativePath: string): LoadedAgencyMarkdown | null {
  try {
    const safe = assertSafeBundledRelativePath(relativePath);
    const full = path.join(process.cwd(), AGENCY_AGENTS_BUNDLED_DIR, safe);
    const root = path.join(process.cwd(), AGENCY_AGENTS_BUNDLED_DIR);
    const resolved = path.resolve(full);
    if (!resolved.startsWith(path.resolve(root))) {
      return null;
    }
    if (!fs.existsSync(resolved)) {
      return null;
    }
    const raw = fs.readFileSync(resolved, "utf8");
    const { content, data } = matter(raw);
    return {
      body: typeof content === "string" ? content : "",
      data: data && typeof data === "object" && !Array.isArray(data)
        ? (data as Record<string, unknown>)
        : {},
    };
  } catch {
    return null;
  }
}
