/**
 * Emails listed in NOJO_ADMIN_EMAIL (single) or NOJO_ADMIN_EMAILS (comma-separated)
 * are promoted to ADMIN on successful credential login (idempotent).
 */
export function parseAdminEmailsFromEnv(): Set<string> {
  const set = new Set<string>();
  const single = process.env.NOJO_ADMIN_EMAIL?.trim().toLowerCase();
  if (single) set.add(single);
  const multi = process.env.NOJO_ADMIN_EMAILS?.trim();
  if (multi) {
    for (const part of multi.split(",")) {
      const e = part.trim().toLowerCase();
      if (e) set.add(e);
    }
  }
  return set;
}
