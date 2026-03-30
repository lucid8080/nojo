/**
 * Shared diagram-intent detection for prompt contracts and server-side fallbacks.
 * Keep in sync with NOJO_DIAGRAM_GENERATION_CONTRACT injection in nojoSharedContext.
 */
const DIAGRAM_INTENT_RE = /diagram|flowchart|visual|excalidraw|mermaid/i;

export function userWantsDiagram(text: string | null | undefined): boolean {
  if (text == null || typeof text !== "string") return false;
  return DIAGRAM_INTENT_RE.test(text);
}

/** Safe filename stem for diagram artifacts derived from the user message. */
export function diagramArtifactTitleFromPrompt(prompt: string): string {
  const words = prompt
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 6);
  const base = words.length ? words.join("-").slice(0, 50) : "diagram";
  return base.length > 0 ? base : "diagram";
}

export function shouldOfferServerDiagramFallback(opts: {
  userPrompt: string;
  excalidrawPersistedForRun: boolean;
  fallbackAlreadyRan: boolean;
}): boolean {
  if (opts.fallbackAlreadyRan) return false;
  if (opts.excalidrawPersistedForRun) return false;
  return userWantsDiagram(opts.userPrompt);
}
