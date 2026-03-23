import { describe, expect, it } from "vitest";

import {
  extractArtifactsFromUnknownPayload,
  extractAssistantVisibleTextForTests,
} from "./openclaw-chat-bridge";

describe("extractArtifactsFromUnknownPayload", () => {
  it("extracts bytes from data: URLs inside attachment-like payloads", () => {
    const artifacts = extractArtifactsFromUnknownPayload({
      runId: "run_1",
      message: {
        text: "Here is your file",
        attachments: [
          {
            fileName: "mock_resume_walmart.rtf",
            mimeType: "application/rtf",
            dataUrl: "data:application/rtf;base64,SGVsbG8=",
          },
        ],
      },
    });

    expect(artifacts).toHaveLength(1);
    expect(artifacts[0].filename).toBe("mock_resume_walmart.rtf");
    expect(artifacts[0].bytesBase64).toBe("SGVsbG8=");
    expect(artifacts[0].contentText).toBeUndefined();
    expect(artifacts[0].tempPath).toBeUndefined();
  });

  it("derives filename from tempPath when filename keys are missing", () => {
    const artifacts = extractArtifactsFromUnknownPayload({
      artifacts: [
        {
          tempPath: "D:/agent/runtime/mock_resume_walmart.rtf",
          bytesBase64: "SGVsbG8=",
          mimeType: "application/rtf",
        },
      ],
    });

    expect(artifacts).toHaveLength(1);
    expect(artifacts[0].filename).toBe("mock_resume_walmart.rtf");
    expect(artifacts[0].bytesBase64).toBe("SGVsbG8=");
  });

  it("supports numeric bytes arrays", () => {
    const artifacts = extractArtifactsFromUnknownPayload({
      files: [
        {
          name: "note.txt",
          mimeType: "text/plain",
          bytes: [104, 105],
        },
      ],
    });

    expect(artifacts).toHaveLength(1);
    expect(artifacts[0].filename).toBe("note.txt");
    expect(artifacts[0].bytesBase64).toBe(Buffer.from([104, 105]).toString("base64"));
  });

  it("extracts text artifacts from contentText fields", () => {
    const artifacts = extractArtifactsFromUnknownPayload({
      outputs: [
        {
          filename: "draft.md",
          contentText: "# Hello",
          mimeType: "text/markdown",
        },
      ],
    });

    expect(artifacts).toHaveLength(1);
    expect(artifacts[0].filename).toBe("draft.md");
    expect(artifacts[0].contentText).toBe("# Hello");
  });

  it("parses JSON-string payloads and extracts bytesBase64 attachments", () => {
    const payload = JSON.stringify({
      attachments: [
        {
          filename: "24hr-entry-notice-template.docx",
          mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          bytesBase64: "SGVsbG8gd29ybGQ=",
        },
      ],
    });

    const artifacts = extractArtifactsFromUnknownPayload(payload);
    expect(artifacts).toHaveLength(1);
    expect(artifacts[0].filename).toBe("24hr-entry-notice-template.docx");
    expect(artifacts[0].bytesBase64).toBe("SGVsbG8gd29ybGQ=");
  });

  it("does not surface raw JSON assistant messages that only contain attachments", () => {
    const message = JSON.stringify({
      attachments: [
        {
          filename: "note.txt",
          mimeType: "text/plain",
          bytesBase64: "SGVsbG8gd29ybGQ=",
        },
      ],
    });

    expect(extractAssistantVisibleTextForTests(message)).toBe("");
  });

  it("still surfaces assistant text when JSON-string payloads include a text field", () => {
    const message = JSON.stringify({
      text: "Here is your document.",
      attachments: [
        {
          filename: "note.txt",
          mimeType: "text/plain",
          bytesBase64: "SGVsbG8gd29ybGQ=",
        },
      ],
    });

    expect(extractAssistantVisibleTextForTests(message)).toBe("Here is your document.");
  });
});

