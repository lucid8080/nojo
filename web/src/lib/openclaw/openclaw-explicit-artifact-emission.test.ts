import { describe, expect, it } from "vitest";

import { extractArtifactsFromUnknownPayload } from "./openclaw-chat-bridge";

describe("OpenClaw explicit artifact emission contract", () => {
  it("does not extract artifacts from runtime-path-only assistant payloads", () => {
    const artifacts = extractArtifactsFromUnknownPayload({
      message: {
        text: "Saved copy here: projects/job hunting/mock_resume_walmart.docx",
      },
    });

    expect(artifacts).toHaveLength(0);
  });

  it("extracts artifacts from structured attachment-like payloads (tempPath)", () => {
    const artifacts = extractArtifactsFromUnknownPayload({
      attachments: [
        {
          filename: "mock_resume_walmart.docx",
          mimeType:
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          tempPath: "D:/agent/runtime/mock_resume_walmart.docx",
          // bytesBase64 intentionally omitted; tempPath-only is still structured.
        },
      ],
    });

    expect(artifacts).toHaveLength(1);
    expect(artifacts[0].filename).toBe("mock_resume_walmart.docx");
    expect(artifacts[0].tempPath).toBe("D:/agent/runtime/mock_resume_walmart.docx");
    expect(artifacts[0].bytesBase64).toBeUndefined();
  });

  it("extracts artifacts from structured files payloads (contentText)", () => {
    const artifacts = extractArtifactsFromUnknownPayload({
      files: [
        {
          name: "draft.md",
          mimeType: "text/markdown",
          contentText: "# Hello",
        },
      ],
    });

    expect(artifacts).toHaveLength(1);
    expect(artifacts[0].filename).toBe("draft.md");
    expect(artifacts[0].contentText).toBe("# Hello");
  });
});

