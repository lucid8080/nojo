import { describe, expect, it } from "vitest";
import {
  buildUserWorkspaceFirstTurnFallbackBlock,
  buildUserWorkspaceIdentityMd,
  buildUserWorkspaceSoulMd,
  fingerprintUserWorkspaceIdentity,
} from "./userWorkspaceAgentIdentityMarkdown";

describe("userWorkspaceAgentIdentityMarkdown", () => {
  const input = {
    agentId: "nojo-team-test-1",
    name: "Teddy Bonk",
    role: "Residential Property Manager",
    identity: {
      description: "Helps with leases",
      objective: "Keep tenants satisfied",
      vibe: "Professional and to the point",
      emoji: "🏠",
    },
  };

  it("fingerprintUserWorkspaceIdentity changes when identity changes", () => {
    const a = fingerprintUserWorkspaceIdentity(input);
    const b = fingerprintUserWorkspaceIdentity({
      ...input,
      identity: { ...input.identity, vibe: "Different" },
    });
    expect(a).not.toBe(b);
  });

  it("buildUserWorkspaceIdentityMd includes agent id and role", () => {
    const md = buildUserWorkspaceIdentityMd(input);
    expect(md).toContain("nojo-team-test-1");
    expect(md).toContain("Teddy Bonk");
    expect(md).toContain("Residential Property Manager");
    expect(md).toContain("Professional and to the point");
  });

  it("buildUserWorkspaceSoulMd forbids generic bootstrap", () => {
    const md = buildUserWorkspaceSoulMd(input);
    expect(md).toContain("just came online");
    expect(md).toContain("who am I");
  });

  it("buildUserWorkspaceFirstTurnFallbackBlock includes fallback header and SOUL", () => {
    const block = buildUserWorkspaceFirstTurnFallbackBlock(input);
    expect(block).not.toBeNull();
    expect(block).toContain("NOJO_USER_AGENT_IDENTITY_FALLBACK");
    expect(block).toContain("IDENTITY.md");
    expect(block).toContain("SOUL.md");
    expect(block).toContain("Teddy Bonk");
  });
});
