import { describe, expect, it } from "vitest";

import { applyAgentFileClaimGuard } from "./agentFileClaimGuard";

describe("agentFileClaimGuard", () => {
  it("detects and sanitizes projects/... claims with spaces in path segments", () => {
    const text = "Saved to projects/job hunting/mock_resume_walmart.docx";
    const result = applyAgentFileClaimGuard({
      text,
      persistedArtifactsForRunId: [],
    });

    expect(result.hasForbiddenPathClaims).toBe(true);
    expect(result.shouldShowFallbackBecauseNoDurablePersistence).toBe(true);
    expect(result.forbiddenPathClaims.join(" ")).toContain(
      "projects/job hunting/mock_resume_walmart.docx",
    );
    expect(result.sanitizedText).not.toMatch(/projects[\\/]/i);
    expect(result.sanitizedText).toContain("mock_resume_walmart.docx");
  });

  it("detects and sanitizes absolute Windows paths", () => {
    const text = "Generated at D:/agent/runtime/mock_resume_walmart.docx";
    const result = applyAgentFileClaimGuard({
      text,
      persistedArtifactsForRunId: [],
    });

    expect(result.hasForbiddenPathClaims).toBe(true);
    expect(result.shouldShowFallbackBecauseNoDurablePersistence).toBe(true);
    expect(result.sanitizedText).not.toMatch(/D:[/\\]agent[/\\]runtime/i);
    expect(result.sanitizedText).toContain("mock_resume_walmart.docx");
  });

  it("does not show fallback when persisted artifacts exist for the same runId, but still sanitizes", () => {
    const text = "Saved to projects/job hunting/mock_resume_walmart.docx";
    const result = applyAgentFileClaimGuard({
      text,
      persistedArtifactsForRunId: ["dummy"],
    });

    expect(result.hasForbiddenPathClaims).toBe(true);
    expect(result.shouldShowFallbackBecauseNoDurablePersistence).toBe(false);
    expect(result.sanitizedText).not.toMatch(/projects[\\/]/i);
    expect(result.sanitizedText).toContain("mock_resume_walmart.docx");
  });

  it("shows no fallback when there are no forbidden path claims", () => {
    const text = "Saved to Files: mock_resume_walmart.docx";
    const result = applyAgentFileClaimGuard({
      text,
      persistedArtifactsForRunId: [],
    });

    expect(result.hasForbiddenPathClaims).toBe(false);
    expect(result.shouldShowFallbackBecauseNoDurablePersistence).toBe(false);
    expect(result.sanitizedText).toBe(text);
  });
});

