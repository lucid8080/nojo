import { deriveDiagramNaming } from "./diagramNaming";

export { deriveDiagramNaming, type DerivedDiagramNaming } from "./diagramNaming";

/**
 * Shared diagram-intent detection for prompt contracts and server-side fallbacks.
 * Keep in sync with NOJO_DIAGRAM_GENERATION_CONTRACT injection in nojoSharedContext.
 */
const DIAGRAM_INTENT_RE = /diagram|flowchart|visual|excalidraw|mermaid/i;

export function userWantsDiagram(text: string | null | undefined): boolean {
  if (text == null || typeof text !== "string") return false;
  return DIAGRAM_INTENT_RE.test(text);
}

/** Safe filename stem for diagram artifacts derived from the user message (slug). */
export function diagramArtifactTitleFromPrompt(prompt: string): string {
  return deriveDiagramNaming(prompt).filenameStem;
}

export function shouldOfferServerDiagramFallback(opts: {
  userPrompt: string;
  /** True when the agent produced a persisted diagram (Excalidraw, SVG/PNG, or JSON recovered from assistant text). */
  agentDiagramPersistedForRun: boolean;
  fallbackAlreadyRan: boolean;
}): boolean {
  if (opts.fallbackAlreadyRan) return false;
  if (opts.agentDiagramPersistedForRun) return false;
  return userWantsDiagram(opts.userPrompt);
}
