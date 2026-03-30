import type { ExcalidrawDiagram, ExcalidrawElement } from "./types";
import crypto from "node:crypto";
import { deriveDiagramNaming } from "@/lib/nojo/diagramNaming";

function randomId() {
  return crypto.randomBytes(8).toString("hex");
}

export type DiagramGenerateMode = "prompt" | "template";

export type GenerateExcalidrawDiagramInput = {
  mode: DiagramGenerateMode;
  displayTitle: string;
  topicPhrase: string;
  userPrompt: string;
};

/** Opt-in canned layout (env or explicit phrasing). */
export function shouldUseDiagramTemplateMode(prompt: string): boolean {
  if (process.env.NOJO_DIAGRAM_TEMPLATE_MODE?.trim().toLowerCase() === "true") {
    return true;
  }
  return /example\s+template|sample\s+architecture/i.test(prompt);
}

/** Derive flowchart node labels from topic text (exported for tests and logging). */
export function deriveFlowNodeLabels(topicPhrase: string): string[] {
  const t = topicPhrase.replace(/\s+/g, " ").trim();
  if (!t) return ["Start", "Process", "End"];

  const segments = t.split(/[,;/|]+/).map((s) => s.trim()).filter(Boolean);
  if (segments.length >= 2) {
    return segments.slice(0, 6).map((s) => (s.length > 40 ? `${s.slice(0, 37)}…` : s));
  }

  const words = t.split(/\s+/).filter(Boolean);
  if (words.length <= 2) {
    const base = words
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(" ");
    return [`${base}`, `Develop ${base}`, "Review", "Complete"];
  }

  const maxNodes = 4;
  if (words.length <= maxNodes) {
    return words.map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
  }

  const chunk = Math.ceil(words.length / maxNodes);
  const out: string[] = [];
  for (let i = 0; i < words.length && out.length < maxNodes; i += chunk) {
    const slice = words.slice(i, i + chunk);
    const label = slice
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(" ");
    out.push(label.length > 40 ? `${label.slice(0, 37)}…` : label);
  }
  return out.length ? out : [t];
}

function generatePromptModeDiagram(input: GenerateExcalidrawDiagramInput): ExcalidrawDiagram {
  const { displayTitle, topicPhrase, userPrompt } = input;
  const nodeLabels = deriveFlowNodeLabels(topicPhrase);
  const elements: ExcalidrawElement[] = [];

  const headerY = 80;
  elements.push({
    id: randomId(),
    type: "text",
    x: 80,
    y: headerY,
    width: 720,
    height: 36,
    angle: 0,
    strokeColor: "#1e1e1e",
    backgroundColor: "transparent",
    fillStyle: "solid",
    strokeWidth: 1,
    strokeStyle: "solid",
    roughness: 0,
    opacity: 100,
    text: displayTitle || "Diagram",
    fontSize: 28,
    fontFamily: 1,
    textAlign: "left",
    verticalAlign: "top",
  });

  const note = userPrompt.trim().slice(0, 120) + (userPrompt.length > 120 ? "…" : "");
  if (note) {
    elements.push({
      id: randomId(),
      type: "text",
      x: 80,
      y: headerY + 40,
      width: 720,
      height: 48,
      angle: 0,
      strokeColor: "#495057",
      backgroundColor: "transparent",
      fillStyle: "solid",
      strokeWidth: 1,
      strokeStyle: "solid",
      roughness: 0,
      opacity: 100,
      text: note,
      fontSize: 14,
      fontFamily: 1,
      textAlign: "left",
      verticalAlign: "top",
    });
  }

  const rowY = 220;
  const boxW = Math.min(200, Math.max(120, Math.floor(720 / Math.max(nodeLabels.length, 1)) - 24));
  const gap = 32;
  let x = 80;

  for (let i = 0; i < nodeLabels.length; i++) {
    const label = nodeLabels[i] ?? `Step ${i + 1}`;
    elements.push({
      id: randomId(),
      type: "rectangle",
      x,
      y: rowY,
      width: boxW,
      height: 72,
      angle: 0,
      strokeColor: i % 2 === 0 ? "#099268" : "#364fc7",
      backgroundColor: i % 2 === 0 ? "#e6fcf5" : "#edf2ff",
      fillStyle: "solid",
      strokeWidth: 2,
      strokeStyle: "solid",
      roughness: 1,
      opacity: 100,
    });
    elements.push({
      id: randomId(),
      type: "text",
      x: x + 8,
      y: rowY + 24,
      width: boxW - 16,
      height: 40,
      angle: 0,
      strokeColor: "#1e1e1e",
      backgroundColor: "transparent",
      fillStyle: "solid",
      strokeWidth: 1,
      strokeStyle: "solid",
      roughness: 0,
      opacity: 100,
      text: label,
      fontSize: 15,
      fontFamily: 1,
      textAlign: "center",
      verticalAlign: "middle",
    });

    if (i < nodeLabels.length - 1) {
      const arrowX = x + boxW;
      elements.push({
        id: randomId(),
        type: "arrow",
        x: arrowX,
        y: rowY + 36,
        width: gap,
        height: 0,
        angle: 0,
        strokeColor: "#868e96",
        backgroundColor: "transparent",
        fillStyle: "solid",
        strokeWidth: 2,
        strokeStyle: "solid",
        roughness: 1,
        opacity: 100,
        points: [
          [0, 0],
          [gap, 0],
        ],
      });
    }
    x += boxW + gap;
  }

  return {
    type: "excalidraw",
    version: 2,
    source: "nojo-diagram-prompt",
    elements,
    appState: { viewBackgroundColor: "#ffffff" },
  };
}

/** Canned two-box template (explicit opt-in only). */
function generateTemplateDiagram(displayTitle: string, userPrompt: string): ExcalidrawDiagram {
  const elements: ExcalidrawElement[] = [];

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
    text: displayTitle || "Diagram",
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
    text: userPrompt?.slice(0, 150) + (userPrompt && userPrompt.length > 150 ? "..." : ""),
    fontSize: 16,
    fontFamily: 1,
    textAlign: "left",
    verticalAlign: "top",
  });

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
    points: [
      [0, 0],
      [130, 0],
    ],
  });

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
    source: "nojo-diagram-template",
    elements,
    appState: { viewBackgroundColor: "#ffffff" },
  };
}

/**
 * Build an Excalidraw diagram from a topic-driven flow (default) or canned template (opt-in).
 * Legacy: `generateExcalidrawDiagram(titleString, promptString)` uses naming + prompt mode unless template is requested.
 */
export function generateExcalidrawDiagram(
  titleOrOpts: string | GenerateExcalidrawDiagramInput,
  prompt?: string,
): ExcalidrawDiagram {
  if (typeof titleOrOpts === "object") {
    const input = titleOrOpts;
    return input.mode === "template"
      ? generateTemplateDiagram(input.displayTitle, input.userPrompt)
      : generatePromptModeDiagram(input);
  }

  const naming = deriveDiagramNaming(prompt ?? "");
  const mode: DiagramGenerateMode = shouldUseDiagramTemplateMode(prompt ?? "") ? "template" : "prompt";
  const displayTitle = titleOrOpts.trim() || naming.displayTitle;
  return generateExcalidrawDiagram({
    mode,
    displayTitle,
    topicPhrase: naming.topicPhrase,
    userPrompt: prompt ?? "",
  });
}
