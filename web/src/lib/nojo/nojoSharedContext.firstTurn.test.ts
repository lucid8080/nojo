import { afterEach, describe, expect, it } from "vitest";
import { composeNojoSharedContextPrompt } from "./nojoSharedContext";

describe("composeNojoSharedContextPrompt first-turn identity fallback", () => {
  const prev = process.env.NOJO_FIRST_TURN_IDENTITY_FALLBACK;

  afterEach(() => {
    if (prev === undefined) {
      delete process.env.NOJO_FIRST_TURN_IDENTITY_FALLBACK;
    } else {
      process.env.NOJO_FIRST_TURN_IDENTITY_FALLBACK = prev;
    }
  });

  it("injects repo IDENTITY/SOUL when first user message and env allows", async () => {
    process.env.NOJO_FIRST_TURN_IDENTITY_FALLBACK = "1";
    const { composedPrompt, firstTurnIdentityFallbackApplied, isNojoAgent } =
      await composeNojoSharedContextPrompt({
        agentId: "nojo-content",
        prompt: "Hello",
        isFirstUserMessage: true,
      });

    expect(isNojoAgent).toBe(true);
    expect(firstTurnIdentityFallbackApplied).toBe(true);
    expect(composedPrompt).toContain("NOJO_AGENT_REPO_IDENTITY_FALLBACK");
    expect(composedPrompt).toContain("NOJO_SHARED_CONTEXT");
    expect(composedPrompt).toContain("IDENTITY.md");
    expect(composedPrompt).toContain("SOUL.md");
  });

  it("skips fallback when NOJO_FIRST_TURN_IDENTITY_FALLBACK is off", async () => {
    process.env.NOJO_FIRST_TURN_IDENTITY_FALLBACK = "0";
    const { composedPrompt, firstTurnIdentityFallbackApplied } = await composeNojoSharedContextPrompt({
      agentId: "nojo-content",
      prompt: "Hello",
      isFirstUserMessage: true,
    });

    expect(firstTurnIdentityFallbackApplied).toBe(false);
    expect(composedPrompt).not.toContain("NOJO_AGENT_REPO_IDENTITY_FALLBACK");
  });

  it("skips fallback on subsequent turns", async () => {
    process.env.NOJO_FIRST_TURN_IDENTITY_FALLBACK = "1";
    const { firstTurnIdentityFallbackApplied } = await composeNojoSharedContextPrompt({
      agentId: "nojo-content",
      prompt: "Hello again",
      isFirstUserMessage: false,
    });

    expect(firstTurnIdentityFallbackApplied).toBe(false);
  });
});

describe("composeNojoSharedContextPrompt nojo-support customer-facing framing", () => {
  it("injects NOJO_SUPPORT_ROLE for nojo-support", async () => {
    const { composedPrompt, isNojoAgent } = await composeNojoSharedContextPrompt({
      agentId: "nojo-support",
      prompt: "Need help with a stuck run",
      isFirstUserMessage: false,
    });

    expect(isNojoAgent).toBe(true);
    expect(composedPrompt).toContain("NOJO_SUPPORT_ROLE:");
    expect(composedPrompt).toContain("workspace owners and their teams");
    expect(composedPrompt).toContain("Do not present as Nojo corporate/internal support");
  });

  it("does not inject NOJO_SUPPORT_ROLE for other Nojo agents", async () => {
    const { composedPrompt } = await composeNojoSharedContextPrompt({
      agentId: "nojo-main",
      prompt: "Hello",
      isFirstUserMessage: false,
    });

    expect(composedPrompt).not.toContain("NOJO_SUPPORT_ROLE:");
  });
});
