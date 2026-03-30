import { describe, expect, it } from "vitest";

import {
  deriveFlowNodeLabels,
  generateExcalidrawDiagram,
  shouldUseDiagramTemplateMode,
} from "./generate";

describe("deriveFlowNodeLabels", () => {
  it("splits comma-separated topics into node labels", () => {
    const labels = deriveFlowNodeLabels("apply, interview, offer");
    expect(labels).toEqual(["apply", "interview", "offer"]);
  });

  it("builds a short chain from a two-word topic", () => {
    const labels = deriveFlowNodeLabels("job searching");
    expect(labels.length).toBeGreaterThanOrEqual(2);
    expect(labels.some((l) => /job/i.test(l))).toBe(true);
  });
});

describe("shouldUseDiagramTemplateMode", () => {
  it("is false for normal prompts", () => {
    expect(shouldUseDiagramTemplateMode("make a diagram for job searching")).toBe(false);
  });

  it("is true when phrasing asks for example template", () => {
    expect(shouldUseDiagramTemplateMode("use an example template for my API")).toBe(true);
  });
});

describe("generateExcalidrawDiagram prompt mode", () => {
  it("does not emit Component A/B labels in prompt mode", () => {
    const json = JSON.stringify(
      generateExcalidrawDiagram({
        mode: "prompt",
        displayTitle: "Job Searching",
        topicPhrase: "job searching",
        userPrompt: "make a diagram for job searching",
      }),
    );
    expect(json).not.toContain("Component A");
    expect(json).not.toContain("Component B");
    expect(json).toContain("Job Searching");
  });

  it("includes template labels only in template mode", () => {
    const json = JSON.stringify(
      generateExcalidrawDiagram({
        mode: "template",
        displayTitle: "Sample",
        topicPhrase: "",
        userPrompt: "example template",
      }),
    );
    expect(json).toContain("Component A");
    expect(json).toContain("Component B");
  });
});
