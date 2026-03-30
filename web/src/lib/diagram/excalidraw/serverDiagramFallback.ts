import "server-only";

import { deriveDiagramNaming } from "@/lib/nojo/diagramNaming";
import { createDiagramArtifact } from "./storage";
import {
  deriveFlowNodeLabels,
  generateExcalidrawDiagram,
  shouldUseDiagramTemplateMode,
} from "./generate";
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
  const naming = deriveDiagramNaming(params.userPrompt);
  const mode = shouldUseDiagramTemplateMode(params.userPrompt) ? "template" : "prompt";
  const nodeLabels = deriveFlowNodeLabels(naming.topicPhrase);

  console.info("[nojo][diagram_fallback]", {
    displayTitle: naming.displayTitle,
    filenameStem: naming.filenameStem,
    mode,
    nodeLabels,
    promptLength: params.userPrompt.length,
  });

  const diagram = generateExcalidrawDiagram({
    mode,
    displayTitle: naming.displayTitle,
    topicPhrase: naming.topicPhrase,
    userPrompt: params.userPrompt,
  });
  const excalidrawJsonStr = JSON.stringify(diagram);
  const svgStr = renderExcalidrawToSvg(diagram);

  return createDiagramArtifact({
    userId: params.userId,
    workspaceId: params.workspaceId,
    agentId: params.agentId,
    title: naming.displayTitle,
    filenameStem: naming.filenameStem,
    prompt: params.userPrompt,
    excalidrawJsonStr,
    svgStr,
  });
}
