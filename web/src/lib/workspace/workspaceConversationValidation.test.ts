import { describe, expect, it } from "vitest";
import {
  parseCreateWorkspaceConversationBody,
  validateCreateWorkspaceConversationBodyAsync,
} from "./workspaceConversationValidation";

describe("parseCreateWorkspaceConversationBody", () => {
  it("accepts user-created agent ids", () => {
    const result = parseCreateWorkspaceConversationBody({
      title: "Room",
      agentIds: ["nojo-main", "nojo-team-abc-def"],
      primaryAgentId: "nojo-team-abc-def",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.agentIds).toEqual(["nojo-main", "nojo-team-abc-def"]);
      expect(result.value.primaryAgentId).toBe("nojo-team-abc-def");
    }
  });
});

describe("validateCreateWorkspaceConversationBodyAsync", () => {
  it("rejects unknown custom id when not in DB", async () => {
    const result = await validateCreateWorkspaceConversationBodyAsync("user-1", {
      title: "Room",
      agentIds: ["nojo-team-nonexistent-xyz"],
      primaryAgentId: "nojo-team-nonexistent-xyz",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain("Unknown agent id");
    }
  });
});
