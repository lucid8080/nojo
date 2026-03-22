/**
 * Effective IANA timezone for parsing local reminder phrases ("tomorrow at 9am").
 * Priority: user's profile → NOJO_REMINDER_DEFAULT_TIMEZONE → UTC.
 */

export function isValidIanaTimeZone(tz: string): boolean {
  const t = tz.trim();
  if (!t) return false;
  try {
    Intl.DateTimeFormat(undefined, { timeZone: t });
    return true;
  } catch {
    return false;
  }
}

export function getEffectiveReminderTimeZone(userTimeZone: string | null | undefined): string {
  const fromUser = typeof userTimeZone === "string" && userTimeZone.trim() !== "" ? userTimeZone.trim() : "";
  if (fromUser && isValidIanaTimeZone(fromUser)) return fromUser;

  const envRaw = process.env.NOJO_REMINDER_DEFAULT_TIMEZONE;
  const fromEnv = typeof envRaw === "string" && envRaw.trim() !== "" ? envRaw.trim() : "";
  if (fromEnv && isValidIanaTimeZone(fromEnv)) return fromEnv;

  return "UTC";
}
