import { describe, expect, it } from "vitest";

import {
  hasWorkspaceReminderIntent,
  parseWorkspaceReminderTimes,
} from "@/lib/reminders/parseWorkspaceReminderTimes";

describe("hasWorkspaceReminderIntent", () => {
  it("matches remind and reminder", () => {
    expect(hasWorkspaceReminderIntent("Please remind me tomorrow")).toBe(true);
    expect(hasWorkspaceReminderIntent("Set a reminder for Friday")).toBe(true);
    expect(hasWorkspaceReminderIntent("What is the weather")).toBe(false);
  });
});

describe("parseWorkspaceReminderTimes", () => {
  it("parses multiple expressions in one message", () => {
    const ref = new Date("2026-03-20T15:00:00.000Z");
    const text =
      "Remind me to serve the N4 to Jill in 5 minutes and also tomorrow at 9am";
    const times = parseWorkspaceReminderTimes(text, "America/Toronto", {
      refDate: ref,
      max: 5,
    });
    expect(times.length).toBeGreaterThanOrEqual(2);
    const iso = times.map((t) => t.at.toISOString());
    expect(iso.some((s) => s.includes("T"))).toBe(true);
  });

  it("respects max cap", () => {
    const ref = new Date("2026-03-20T12:00:00.000Z");
    const text =
      "Remind me in 1 hour, 2 hours, 3 hours, 4 hours, 5 hours, 6 hours";
    const times = parseWorkspaceReminderTimes(text, "UTC", { refDate: ref, max: 3 });
    expect(times.length).toBeLessThanOrEqual(3);
  });
});
