import "server-only";

import { diagramArtifactTitleFromPrompt } from "@/lib/nojo/diagramIntent";
import { createDiagramArtifact } from "./storage";
import { generateExcalidrawDiagram } from "./generate";
import { renderExcalidrawToSvg } from "./render";

/**
 * Server-side diagram when the user asked for a visual but no `.excalidraw` artifact was persisted for the run.
 */
export async function createServerDiagramFallbackArtifact(params: {
  userId: string;
  workspaceId: string;
  agentId: string;
  userPrompt: string;
}) {
  const title = diagramArtifactTitleFromPrompt(params.userPrompt);
  const diagram = generateExcalidrawDiagram(title, params.userPrompt);
  const excalidrawJsonStr = JSON.stringify(diagram);
  const svgStr = renderExcalidrawToSvg(diagram);
  return createDiagramArtifact({
    userId: params.userId,
    workspaceId: params.workspaceId,
    agentId: params.agentId,
    title,
    prompt: params.userPrompt,
    excalidrawJsonStr,
    svgStr,
  });
}
