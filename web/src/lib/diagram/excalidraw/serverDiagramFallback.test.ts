import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/diagram/excalidraw/storage", () => ({
  createDiagramArtifact: vi.fn(),
}));

import { createDiagramArtifact } from "@/lib/diagram/excalidraw/storage";
import { createServerDiagramFallbackArtifact } from "./serverDiagramFallback";

describe("createServerDiagramFallbackArtifact", () => {
  beforeEach(() => {
    vi.mocked(createDiagramArtifact).mockResolvedValue({
      id: "art-1",
      title: "user-login-flow",
      agentId: "nojo-main",
      files: [],
    } as Awaited<ReturnType<typeof createDiagramArtifact>>);
  });

  it("invokes createDiagramArtifact with JSON, SVG, and metadata", async () => {
    await createServerDiagramFallbackArtifact({
      userId: "user-1",
      workspaceId: "ws-1",
      agentId: "nojo-main",
      userPrompt: "Draw a flowchart of user login",
    });

    expect(createDiagramArtifact).toHaveBeenCalledTimes(1);
    const arg = vi.mocked(createDiagramArtifact).mock.calls[0][0];
    expect(arg.userId).toBe("user-1");
    expect(arg.workspaceId).toBe("ws-1");
    expect(arg.agentId).toBe("nojo-main");
    expect(arg.prompt).toBe("Draw a flowchart of user login");
    expect(arg.title).toBe("User Login");
    expect(arg.filenameStem).toBe("user-login");
    expect(arg.excalidrawJsonStr).toContain('"type"');
    expect(arg.svgStr).toContain("<svg");
  });
});
