import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import type { UserWorkspaceAgent } from "@prisma/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  prisma: {
    userWorkspaceAgent: {
      findUnique: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/db";
import { SCAFFOLD_FILES } from "./ensureNojoAgentIdentityScaffold";
import { ensureUserWorkspaceAgentIdentityScaffold } from "./ensureUserWorkspaceAgentIdentityScaffold";

describe("ensureUserWorkspaceAgentIdentityScaffold (integration)", () => {
  let agentsRoot: string | undefined;

  const row: UserWorkspaceAgent = {
    id: "row-cuid",
    userId: "user-1",
    agentId: "nojo-team-integration-test",
    name: "Teddy Bonk",
    initials: "TB",
    role: "Residential Property Manager",
    avatarClass: "ring-sky-500",
    categoryLabel: "SPECIALIZED",
    identityJson: {
      vibe: "Professional and to the point",
      objective: "Maximize occupancy",
      description: "Property ops",
      emoji: "🏠",
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vi.mocked(prisma.userWorkspaceAgent.findUnique).mockResolvedValue(row);
  });

  afterEach(async () => {
    if (agentsRoot) {
      await rm(agentsRoot, { recursive: true, force: true });
      agentsRoot = undefined;
    }
    delete process.env.OPENCLAW_AGENTS_ROOT;
    delete process.env.OPENCLAW_AGENT_WORKSPACES_ROOT;
    delete process.env.NOJO_OPENCLAW_RUNTIME_ROOT;
    delete process.env.OPENCLAW_RUNTIME_ROOT;
    vi.clearAllMocks();
  });

  it("writes generated IDENTITY/SOUL and fingerprint under runtime workspace", async () => {
    agentsRoot = await mkdtemp(path.join(tmpdir(), "nojo-team-scaffold-"));
    process.env.OPENCLAW_AGENTS_ROOT = agentsRoot;

    const r = await ensureUserWorkspaceAgentIdentityScaffold({
      userId: "user-1",
      agentId: "nojo-team-integration-test",
    });

    expect(r.seeded).toBe(true);
    expect(r.seededFiles).toEqual([...SCAFFOLD_FILES]);
    expect(r.templateRootResolved).toBe("user-workspace-agent-generated");
    expect(r.runtimeWorkspaceAbsPath).toBe(
      path.join(path.resolve(agentsRoot), "nojo-team-integration-test", "workspace"),
    );
    expect(r.genericFallbackRisk).toBe(false);

    const id = await readFile(path.join(r.runtimeWorkspaceAbsPath, "IDENTITY.md"), "utf8");
    expect(id).toContain("nojo-team-integration-test");
    expect(id).toContain("Teddy Bonk");

    const soul = await readFile(path.join(r.runtimeWorkspaceAbsPath, "SOUL.md"), "utf8");
    expect(soul).toContain("Residential Property Manager");

    const fp = await readFile(
      path.join(r.runtimeWorkspaceAbsPath, ".nojo-user-agent-identity-fingerprint"),
      "utf8",
    );
    expect(fp.length).toBe(64);
  });

  it("returns empty scaffold when agent id is not user-created", async () => {
    const r = await ensureUserWorkspaceAgentIdentityScaffold({
      userId: "user-1",
      agentId: "nojo-main",
    });
    expect(r.runtimeWorkspaceAbsPath).toBe("");
    expect(prisma.userWorkspaceAgent.findUnique).not.toHaveBeenCalled();
  });
});
