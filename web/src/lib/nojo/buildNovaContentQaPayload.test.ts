import { describe, expect, it } from "vitest";
import { buildNovaContentQaPayload } from "./ensureNojoAgentIdentityScaffold";
import type { NojoAgentIdentityScaffoldResult } from "./nojoScaffoldQaTypes";

describe("buildNovaContentQaPayload", () => {
  it("maps scaffold diagnostics into the nojo-content QA bundle", () => {
    const emptySnap = { exists: false, byteLength: 0, sha256: "" };
    const scaffold = {
      seeded: true,
      seededFiles: ["IDENTITY.md"],
      scaffoldSkippedBecauseFilesExist: false,
      runtimeWorkspaceAbsPath: "/tmp/agents/nojo-content/workspace",
      preExistingNonEmptyFiles: [] as string[],
      configuredAgentsRoot: "/tmp/agents",
      templateRootResolved: "/repo/projects/nojo/agents/nojo-content",
      fileReports: [
        { fileName: "IDENTITY.md", outcome: "seeded" as const },
        { fileName: "SOUL.md", outcome: "pre_existing_non_empty" as const },
      ],
      runtimeFileSnapshot: {
        "IDENTITY.md": { exists: true, byteLength: 10, sha256: "ab" },
        "SOUL.md": emptySnap,
        "USER.md": emptySnap,
        "MEMORY.md": emptySnap,
        "AGENTS.md": emptySnap,
      },
      runtimeIdentityFingerprint: "deadbeef",
      genericFallbackRisk: false,
    } satisfies NojoAgentIdentityScaffoldResult;

    const q = buildNovaContentQaPayload(scaffold);
    expect(q.routedToNojoContent).toBe(true);
    expect(q.runtimeWorkspaceAbsPath).toBe(scaffold.runtimeWorkspaceAbsPath);
    expect(q.seededFiles).toEqual(["IDENTITY.md"]);
    expect(q.runtimeIdentityFingerprint).toBe("deadbeef");
    expect(q.genericFallbackRisk).toBe(false);
    expect(q.fileReports).toHaveLength(2);
  });
});
