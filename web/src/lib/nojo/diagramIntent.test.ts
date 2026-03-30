import { describe, expect, it } from "vitest";

import {
  diagramArtifactTitleFromPrompt,
  shouldOfferServerDiagramFallback,
  userWantsDiagram,
} from "./diagramIntent";

describe("userWantsDiagram", () => {
  it("is true for diagram-related prompts", () => {
    expect(userWantsDiagram("Please draw a diagram of our API")).toBe(true);
    expect(userWantsDiagram("FLOWCHART for checkout")).toBe(true);
    expect(userWantsDiagram("visual overview")).toBe(true);
    expect(userWantsDiagram("export to excalidraw")).toBe(true);
    expect(userWantsDiagram("use mermaid for this")).toBe(true);
  });

  it("is false for unrelated prompts", () => {
    expect(userWantsDiagram("")).toBe(false);
    expect(userWantsDiagram("   ")).toBe(false);
    expect(userWantsDiagram(null as unknown as string)).toBe(false);
    expect(userWantsDiagram("Summarize this paragraph")).toBe(false);
  });
});

describe("diagramArtifactTitleFromPrompt", () => {
  it("slugifies words from the prompt", () => {
    expect(diagramArtifactTitleFromPrompt("Draw a diagram of user login")).toMatch(/login/);
    expect(diagramArtifactTitleFromPrompt("!!!")).toBe("diagram");
  });
});

describe("shouldOfferServerDiagramFallback", () => {
  it("allows fallback when user wants diagram and no excalidraw yet", () => {
    expect(
      shouldOfferServerDiagramFallback({
        userPrompt: "make a flowchart",
        excalidrawPersistedForRun: false,
        fallbackAlreadyRan: false,
      }),
    ).toBe(true);
  });

  it("skips when excalidraw already persisted", () => {
    expect(
      shouldOfferServerDiagramFallback({
        userPrompt: "diagram please",
        excalidrawPersistedForRun: true,
        fallbackAlreadyRan: false,
      }),
    ).toBe(false);
  });

  it("skips when fallback already ran", () => {
    expect(
      shouldOfferServerDiagramFallback({
        userPrompt: "diagram please",
        excalidrawPersistedForRun: false,
        fallbackAlreadyRan: true,
      }),
    ).toBe(false);
  });

  it("skips when user did not ask for a diagram", () => {
    expect(
      shouldOfferServerDiagramFallback({
        userPrompt: "what is 2+2",
        excalidrawPersistedForRun: false,
        fallbackAlreadyRan: false,
      }),
    ).toBe(false);
  });
});
