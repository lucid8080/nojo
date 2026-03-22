import type { UserWorkspaceAgent } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  prisma: {
    userWorkspaceAgent: {
      findUnique: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/db";
import { composeNojoSharedContextPrompt } from "./nojoSharedContext";

describe("composeNojoSharedContextPrompt user workspace agents", () => {
  const row: UserWorkspaceAgent = {
    id: "row-cuid",
    userId: "user-1",
    agentId: "nojo-team-chat-test",
    name: "Teddy Bonk",
    initials: "TB",
    role: "Residential Property Manager",
    avatarClass: "ring-sky-500",
    categoryLabel: "SPECIALIZED",
    identityJson: {
      vibe: "Professional and to the point",
      objective: "Run the building",
      description: "Ops",
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vi.mocked(prisma.userWorkspaceAgent.findUnique).mockReset();
    vi.mocked(prisma.userWorkspaceAgent.findUnique).mockResolvedValue(row);
  });

  it("injects product shared context and first-turn user-agent fallback", async () => {
    const { composedPrompt, isNojoAgent, firstTurnIdentityFallbackApplied } =
      await composeNojoSharedContextPrompt({
        agentId: "nojo-team-chat-test",
        prompt: "Hello",
        isFirstUserMessage: true,
        userId: "user-1",
      });

    expect(isNojoAgent).toBe(true);
    expect(firstTurnIdentityFallbackApplied).toBe(true);
    expect(composedPrompt).toContain("NOJO_USER_WORKSPACE_AGENT");
    expect(composedPrompt).toContain("NOJO_USER_AGENT_IDENTITY_FALLBACK");
    expect(composedPrompt).toContain("ACTIVE_CONTEXT.md");
    expect(composedPrompt).toContain("BRAND_VOICE.md");
    expect(composedPrompt).toContain("Teddy Bonk");
  });

  it("skips first-turn fallback when not first user message", async () => {
    const { firstTurnIdentityFallbackApplied, composedPrompt } =
      await composeNojoSharedContextPrompt({
        agentId: "nojo-team-chat-test",
        prompt: "Second",
        isFirstUserMessage: false,
        userId: "user-1",
      });

    expect(firstTurnIdentityFallbackApplied).toBe(false);
    expect(composedPrompt).not.toContain("NOJO_USER_AGENT_IDENTITY_FALLBACK");
    expect(composedPrompt).toContain("ACTIVE_CONTEXT.md");
  });

  it("lists bundled skill paths when assignedSkillIds includes sk-9", async () => {
    vi.mocked(prisma.userWorkspaceAgent.findUnique).mockResolvedValue({
      ...row,
      identityJson: {
        ...(typeof row.identityJson === "object" && row.identityJson !== null && !Array.isArray(row.identityJson)
          ? (row.identityJson as Record<string, unknown>)
          : {}),
        assignedSkillIds: ["sk-9"],
      },
    });
    const { composedPrompt } = await composeNojoSharedContextPrompt({
      agentId: "nojo-team-chat-test",
      prompt: "Hello",
      isFirstUserMessage: false,
      userId: "user-1",
    });
    expect(composedPrompt).toContain("skills/ontario-residential-tenancy/SKILL.md");
  });

  it("falls back to raw prompt when userId is missing", async () => {
    const { composedPrompt, isNojoAgent } = await composeNojoSharedContextPrompt({
      agentId: "nojo-team-chat-test",
      prompt: "Hello",
      isFirstUserMessage: true,
    });

    expect(isNojoAgent).toBe(false);
    expect(composedPrompt).toBe("Hello");
  });
});
