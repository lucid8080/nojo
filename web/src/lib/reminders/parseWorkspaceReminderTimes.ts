import * as chrono from "chrono-node";

/** Matches "remind", "reminder", etc. */
export const REMINDER_INTENT_PATTERN = /\bremind(?:er)?\b/i;

export function hasWorkspaceReminderIntent(text: string): boolean {
  return REMINDER_INTENT_PATTERN.test(text);
}

export type ParsedWorkspaceReminderTime = {
  at: Date;
  matchedText: string;
};

const DEFAULT_MAX = 5;

/**
 * Extract one-shot reminder times from natural language using chrono-node in the user's timezone.
 */
export function parseWorkspaceReminderTimes(
  text: string,
  timeZone: string,
  opts?: { refDate?: Date; max?: number },
): ParsedWorkspaceReminderTime[] {
  const refDate = opts?.refDate ?? new Date();
  const max = Math.min(opts?.max ?? DEFAULT_MAX, DEFAULT_MAX);
  const results = chrono.parse(
    text,
    { instant: refDate, timezone: timeZone },
    { forwardDate: true },
  );

  const out: ParsedWorkspaceReminderTime[] = [];
  const nowMs = refDate.getTime();
  for (const r of results) {
    if (out.length >= max) break;
    const d = r.date();
    if (Number.isNaN(d.getTime())) continue;
    // Ignore matches already in the past (chrono can still surface stale anchors).
    if (d.getTime() < nowMs - 2_000) continue;
    out.push({ at: d, matchedText: r.text.trim() });
  }
  return dedupeByInstant(out);
}

function dedupeByInstant(items: ParsedWorkspaceReminderTime[]): ParsedWorkspaceReminderTime[] {
  const seen = new Set<number>();
  const out: ParsedWorkspaceReminderTime[] = [];
  for (const it of items) {
    const k = Math.floor(it.at.getTime() / 1000);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(it);
  }
  return out;
}
