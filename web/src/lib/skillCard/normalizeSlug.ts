/**
 * URL-safe slug for skill card paths. Lowercase, hyphens, alphanumeric only.
 */
export function normalizeSlug(input: string): string {
  const t = input
    .trim()
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return t;
}
