/** Coerce Prisma Json tags field to string[] for API responses. */
export function tagsFromJson(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((x): x is string => typeof x === "string");
}

/** Validate body tags; empty strings dropped. */
export function parseTagsInput(raw: unknown): string[] {
  if (raw == null) return [];
  if (!Array.isArray(raw)) {
    if (typeof raw === "string") {
      return raw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }
    return [];
  }
  return raw
    .map((x) => (typeof x === "string" ? x.trim() : ""))
    .filter(Boolean);
}
