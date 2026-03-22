import { describe, expect, it, vi, afterEach } from "vitest";

import { getEffectiveReminderTimeZone, isValidIanaTimeZone } from "@/lib/reminders/reminderTimeZone";

describe("isValidIanaTimeZone", () => {
  it("accepts real zones", () => {
    expect(isValidIanaTimeZone("America/Toronto")).toBe(true);
    expect(isValidIanaTimeZone("UTC")).toBe(true);
  });
  it("rejects junk", () => {
    expect(isValidIanaTimeZone("Not/AZone")).toBe(false);
  });
});

describe("getEffectiveReminderTimeZone", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("prefers user profile when valid", () => {
    vi.stubEnv("NOJO_REMINDER_DEFAULT_TIMEZONE", "Europe/Berlin");
    expect(getEffectiveReminderTimeZone("America/Vancouver")).toBe("America/Vancouver");
  });

  it("falls back to env then UTC", () => {
    vi.stubEnv("NOJO_REMINDER_DEFAULT_TIMEZONE", "Europe/Berlin");
    expect(getEffectiveReminderTimeZone(null)).toBe("Europe/Berlin");
    vi.stubEnv("NOJO_REMINDER_DEFAULT_TIMEZONE", "");
    expect(getEffectiveReminderTimeZone(null)).toBe("UTC");
  });
});
