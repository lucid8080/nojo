import { NOJO_WORKSPACE_AGENTS } from "@/data/nojoWorkspaceRoster";
import { describe, expect, it } from "vitest";
import {
  isCustomTeamAgentId,
  mergeSeedWithCustomRoster,
  mergeSeedWithCustomRosterEntries,
} from "./teamWorkspaceStore";

describe("mergeSeedWithCustomRoster", () => {
  it("returns only seed when includeCustom is false", () => {
    const merged = mergeSeedWithCustomRoster(NOJO_WORKSPACE_AGENTS, false);
    expect(merged).toHaveLength(NOJO_WORKSPACE_AGENTS.length);
    expect(merged[0]?.id).toBe(NOJO_WORKSPACE_AGENTS[0]?.id);
  });

  it("includes seed when includeCustom is true (no window in test env)", () => {
    const merged = mergeSeedWithCustomRoster(NOJO_WORKSPACE_AGENTS, true);
    expect(merged.length).toBeGreaterThanOrEqual(NOJO_WORKSPACE_AGENTS.length);
  });
});

describe("mergeSeedWithCustomRosterEntries", () => {
  it("appends custom rows after seed", () => {
    const custom = [
      {
        id: "nojo-team-1",
        name: "T",
        initials: "T",
        role: "R",
        avatarClass: "bg-slate-500",
      },
    ];
    const merged = mergeSeedWithCustomRosterEntries(NOJO_WORKSPACE_AGENTS, custom);
    expect(merged).toHaveLength(NOJO_WORKSPACE_AGENTS.length + 1);
    expect(merged[merged.length - 1]?.id).toBe("nojo-team-1");
  });
});

describe("isCustomTeamAgentId", () => {
  it("detects nojo-team- prefix", () => {
    expect(isCustomTeamAgentId("nojo-team-abc")).toBe(true);
    expect(isCustomTeamAgentId("nojo-main")).toBe(false);
  });
});
