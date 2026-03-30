import type { ExcalidrawDiagram, ExcalidrawElement } from "./types";
import crypto from "node:crypto";

function randomId() {
  return crypto.randomBytes(8).toString("hex");
}

/**
 * Generate a basic generic Excalidraw diagram based on the prompt.
 * In a real V2, we might ask an LLM to output these elements exactly.
 * For V1, we create a structured template based on the title/prompt.
 */
export function generateExcalidrawDiagram(title: string, prompt: string): ExcalidrawDiagram {
  const elements: ExcalidrawElement[] = [];
  
  // A generic "System Architecture" type template
  elements.push({
    id: randomId(),
    type: "rectangle",
    x: 100,
    y: 100,
    width: 600,
    height: 400,
    angle: 0,
    strokeColor: "#1e1e1e",
    backgroundColor: "#f8f9fa",
    fillStyle: "solid",
    strokeWidth: 2,
    strokeStyle: "solid",
    roughness: 1,
    opacity: 100,
  });

  elements.push({
    id: randomId(),
    type: "text",
    x: 120,
    y: 120,
    width: 300,
    height: 30,
    angle: 0,
    strokeColor: "#1e1e1e",
    backgroundColor: "transparent",
    fillStyle: "solid",
    strokeWidth: 1,
    strokeStyle: "solid",
    roughness: 0,
    opacity: 100,
    text: title || "Diagram",
    fontSize: 24,
    fontFamily: 1,
    textAlign: "left",
    verticalAlign: "top",
  });

  elements.push({
    id: randomId(),
    type: "text",
    x: 120,
    y: 160,
    width: 560,
    height: 100,
    angle: 0,
    strokeColor: "#495057",
    backgroundColor: "transparent",
    fillStyle: "solid",
    strokeWidth: 1,
    strokeStyle: "solid",
    roughness: 0,
    opacity: 100,
    text: prompt?.slice(0, 150) + (prompt?.length > 150 ? "..." : ""),
    fontSize: 16,
    fontFamily: 1,
    textAlign: "left",
    verticalAlign: "top",
  });

  // Example diagram node 1
  elements.push({
    id: randomId(),
    type: "rectangle",
    x: 150,
    y: 250,
    width: 150,
    height: 80,
    angle: 0,
    strokeColor: "#099268",
    backgroundColor: "#e6fcf5",
    fillStyle: "solid",
    strokeWidth: 2,
    strokeStyle: "solid",
    roughness: 1,
    opacity: 100,
  });

  elements.push({
    id: randomId(),
    type: "text",
    x: 175,
    y: 280,
    width: 100,
    height: 20,
    angle: 0,
    strokeColor: "#099268",
    backgroundColor: "transparent",
    fillStyle: "solid",
    strokeWidth: 1,
    strokeStyle: "solid",
    roughness: 0,
    opacity: 100,
    text: "Component A",
    fontSize: 18,
    fontFamily: 1,
    textAlign: "center",
    verticalAlign: "middle",
  });

  // Example arrow
  elements.push({
    id: randomId(),
    type: "arrow",
    x: 310,
    y: 290,
    width: 130,
    height: 0,
    angle: 0,
    strokeColor: "#868e96",
    backgroundColor: "transparent",
    fillStyle: "solid",
    strokeWidth: 2,
    strokeStyle: "solid",
    roughness: 1,
    opacity: 100,
    points: [[0, 0], [130, 0]],
  });

  // Example diagram node 2
  elements.push({
    id: randomId(),
    type: "rectangle",
    x: 450,
    y: 250,
    width: 150,
    height: 80,
    angle: 0,
    strokeColor: "#364fc7",
    backgroundColor: "#edf2ff",
    fillStyle: "solid",
    strokeWidth: 2,
    strokeStyle: "solid",
    roughness: 1,
    opacity: 100,
  });

  elements.push({
    id: randomId(),
    type: "text",
    x: 475,
    y: 280,
    width: 100,
    height: 20,
    angle: 0,
    strokeColor: "#364fc7",
    backgroundColor: "transparent",
    fillStyle: "solid",
    strokeWidth: 1,
    strokeStyle: "solid",
    roughness: 0,
    opacity: 100,
    text: "Component B",
    fontSize: 18,
    fontFamily: 1,
    textAlign: "center",
    verticalAlign: "middle",
  });

  return {
    type: "excalidraw",
    version: 2,
    source: "nojo-agent-internal",
    elements,
    appState: { viewBackgroundColor: "#ffffff" },
  };
}
