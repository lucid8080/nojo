import { normalizeSlug } from "./normalizeSlug";

const FULL_SKILL_DEF_SUFFIX = /-full-skill-definition$/i;

export type ParseSkillMarkdownImportResult = {
  title: string;
  slug: string;
  fullDefinitionMarkdown: string;
  /** Suggested when content came from file/paste import flow */
  sourceTypeSuggestion: "IMPORTED_MARKDOWN" | "MANUAL";
};

function firstMarkdownHeadingTitle(markdown: string): string | null {
  const lines = markdown.split(/\r?\n/);
  for (const line of lines) {
    const m = /^#\s+(.+)$/.exec(line.trim());
    if (m?.[1]) return m[1].trim();
  }
  return null;
}

function stemFromFilename(filename: string): string {
  const base = filename.replace(/^.*[/\\]/, "").replace(/\.md$/i, "");
  return base.replace(FULL_SKILL_DEF_SUFFIX, "").trim();
}

/**
 * Parse pasted/uploaded markdown: extract title from first `#` heading when possible,
 * derive slug from title or filename (stripping *-full-skill-definition before .md).
 */
export function parseSkillMarkdownImport(
  markdown: string,
  options?: { filename?: string | null },
): ParseSkillMarkdownImportResult {
  const fullDefinitionMarkdown = markdown;
  const fromHeading = firstMarkdownHeadingTitle(markdown);
  const stem = options?.filename ? stemFromFilename(options.filename) : "";

  let title: string;
  if (fromHeading) {
    title = fromHeading;
  } else if (stem) {
    title = stem
      .replace(/-/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  } else {
    title = "Untitled skill";
  }

  let slug: string;
  if (fromHeading) {
    slug = normalizeSlug(fromHeading);
  } else if (stem) {
    slug = normalizeSlug(stem);
  } else {
    slug = normalizeSlug(title);
  }

  if (!slug) {
    slug = "skill";
  }

  return {
    title,
    slug,
    fullDefinitionMarkdown,
    sourceTypeSuggestion: "IMPORTED_MARKDOWN",
  };
}
