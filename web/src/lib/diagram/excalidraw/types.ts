// Define the Excalidraw JSON schema and our internal artifact types.

export type ExcalidrawElementType = "rectangle" | "ellipse" | "diamond" | "text" | "line" | "arrow";

export interface ExcalidrawElement {
  id: string;
  type: ExcalidrawElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  angle: number;
  strokeColor: string;
  backgroundColor: string;
  fillStyle: "hachure" | "cross-hatch" | "solid";
  strokeWidth: number;
  strokeStyle: "solid" | "dashed" | "dotted";
  roughness: number;
  opacity: number;
  // Specific to text
  text?: string;
  fontSize?: number;
  fontFamily?: number;
  textAlign?: "left" | "center" | "right";
  verticalAlign?: "top" | "middle" | "bottom";
  // Specific to line/arrow
  points?: [number, number][];
}

export interface ExcalidrawDiagram {
  type: "excalidraw";
  version: 2;
  source: string;
  elements: ExcalidrawElement[];
  appState: {
    viewBackgroundColor: string;
  };
}

export type ExcalidrawArtifactFileKind = "source" | "preview" | "fallback";

export interface ExcalidrawArtifactFile {
  kind: ExcalidrawArtifactFileKind;
  name: string;
  mimeType: string;
  storageKey: string;
  url: string;
  size?: number;
}
