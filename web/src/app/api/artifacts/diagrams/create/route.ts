import { NextRequest } from "next/server";
import { createDiagramArtifact } from "@/lib/diagram/excalidraw/storage";
import { generateExcalidrawDiagram } from "@/lib/diagram/excalidraw/generate";
import { renderExcalidrawToSvg } from "@/lib/diagram/excalidraw/render";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { workspaceId, agentId, messageId, title, prompt } = body;

    if (!workspaceId) {
      return new Response(JSON.stringify({ error: "Missing workspaceId" }), { status: 400 });
    }

    // 1. Generate JSON
    const diagram = generateExcalidrawDiagram(title, prompt);
    const jsonStr = JSON.stringify(diagram);

    // 2. Render SVG
    const svgStr = renderExcalidrawToSvg(diagram);

    // 3. Store and create record
    const artifact = await createDiagramArtifact({
      workspaceId,
      agentId,
      messageId,
      title: title || "Untitled Diagram",
      prompt,
      excalidrawJsonStr: jsonStr,
      svgStr,
    });

    return new Response(JSON.stringify({ success: true, artifact }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("[diagram.create]", error.message);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
