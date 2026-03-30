import { NextRequest } from "next/server";
import { getSessionUserId } from "@/lib/auth-server";
import { createDiagramArtifact } from "@/lib/diagram/excalidraw/storage";
import {
  generateExcalidrawDiagram,
  shouldUseDiagramTemplateMode,
} from "@/lib/diagram/excalidraw/generate";
import { renderExcalidrawToSvg } from "@/lib/diagram/excalidraw/render";
import { deriveDiagramNaming, slugifyDiagramStem } from "@/lib/nojo/diagramNaming";

export async function POST(req: NextRequest) {
  try {
    const userId = await getSessionUserId(req);
    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized." }), { status: 401 });
    }

    const body = await req.json();
    const { workspaceId, agentId, messageId, title, prompt } = body;
    const promptStr = typeof prompt === "string" ? prompt : "";

    if (!workspaceId) {
      return new Response(JSON.stringify({ error: "Missing workspaceId" }), { status: 400 });
    }

    const naming = deriveDiagramNaming(promptStr);
    const explicitTitle =
      typeof title === "string" &&
      title.trim().length > 0 &&
      title.trim() !== "Untitled Diagram";
    const displayTitle = explicitTitle ? title.trim() : naming.displayTitle;
    const filenameStem = explicitTitle ? slugifyDiagramStem(displayTitle) : naming.filenameStem;
    const mode = shouldUseDiagramTemplateMode(promptStr) ? "template" : "prompt";

    const diagram = generateExcalidrawDiagram({
      mode,
      displayTitle,
      topicPhrase: naming.topicPhrase,
      userPrompt: promptStr,
    });
    const jsonStr = JSON.stringify(diagram);
    const svgStr = renderExcalidrawToSvg(diagram);

    const artifact = await createDiagramArtifact({
      userId,
      workspaceId,
      agentId,
      messageId,
      title: displayTitle,
      filenameStem,
      prompt: promptStr,
      excalidrawJsonStr: jsonStr,
      svgStr,
    });

    return new Response(JSON.stringify({ success: true, artifact }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[diagram.create]", message);
    return new Response(JSON.stringify({ error: message }), { status: 500 });
  }
}
