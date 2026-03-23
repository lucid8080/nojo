import { describe, expect, it } from "vitest";

import { extractUserVisibleMessageFromNojoGatewayText } from "./extractUserVisibleChatMessage";

describe("extractUserVisibleMessageFromNojoGatewayText", () => {
  it("returns text after User request: marker (Nojo composed prompt)", () => {
    const composed = [
      "NOJO_SHARED_CONTEXT (read-only reference).",
      "",
      "---",
      "ACTIVE_CONTEXT.md",
      "---",
      "# Context",
      "",
      "User request:",
      "how are you",
    ].join("\n");

    expect(extractUserVisibleMessageFromNojoGatewayText(composed)).toBe("how are you");
  });

  it("returns original when no marker (short message stored as-is)", () => {
    expect(extractUserVisibleMessageFromNojoGatewayText("hello")).toBe("hello");
  });

  it("handles CRLF before user line", () => {
    expect(extractUserVisibleMessageFromNojoGatewayText("prefix\r\n\r\nUser request:\r\nok")).toBe("ok");
  });

  it("strips NOJO_SCHEDULED_REMINDERS block after User request body", () => {
    const composed = [
      "NOJO_SHARED_CONTEXT…",
      "",
      "User request:",
      "remind me to draft a n4 in 5 mins",
      "",
      "NOJO_SCHEDULED_REMINDERS (authoritative — server already created these OpenClaw cron jobs):",
      "- 2026-03-22T03:45:35.612Z (UTC) — in 5 mins — jobId=22228fcb-dd96-42ad-967d-7177f15ec3ca",
      "Acknowledge these times to the user. Do not claim timed reminders cannot be scheduled or tell them to use a phone/calendar instead.",
    ].join("\n");

    expect(extractUserVisibleMessageFromNojoGatewayText(composed)).toBe(
      "remind me to draft a n4 in 5 mins",
    );
  });

  it("strips NOJO_REMINDER_ERRORS when no User request marker", () => {
    const t = "hello\n\nNOJO_REMINDER_ERRORS: gateway down";
    expect(extractUserVisibleMessageFromNojoGatewayText(t)).toBe("hello");
  });
});
