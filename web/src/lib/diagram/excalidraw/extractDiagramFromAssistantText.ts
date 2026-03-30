/**
 * Recover Excalidraw JSON embedded in assistant markdown / prose when the bridge
 * did not emit a separate artifact envelope.
 */

const MAX_PARSE_CHARS = 400_000;

function looksLikeExcalidrawPayload(v: unknown): boolean {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  if (o.type === "excalidraw" && Array.isArray(o.elements)) return true;
  if (Array.isArray(o.elements) && o.elements.length > 0) return true;
  return false;
}

function extractFencedJsonBlocks(text: string): unknown[] {
  const out: unknown[] = [];
  const regex = /```(?:json|excalidraw)?\s*([\s\S]*?)```/gi;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(text)) !== null) {
    const raw = m[1]?.trim() ?? "";
    if (raw.length < 2 || raw.length > MAX_PARSE_CHARS) continue;
    const t = raw.trimStart();
    if (!t.startsWith("{") && !t.startsWith("[")) continue;
    try {
      const parsed = JSON.parse(raw) as unknown;
      out.push(parsed);
    } catch {
      // ignore
    }
  }
  return out;
}

export function findExcalidrawJsonStringInAssistantText(text: string | null | undefined): string | null {
  if (text == null || typeof text !== "string") return null;
  const trimmed = text.trim();
  if (trimmed.length === 0 || trimmed.length > MAX_PARSE_CHARS) return null;

  for (const parsed of extractFencedJsonBlocks(trimmed)) {
    if (looksLikeExcalidrawPayload(parsed)) {
      return JSON.stringify(parsed);
    }
  }

  const lines = trimmed.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line.startsWith("{")) continue;
    let depth = 0;
    const chunkLines: string[] = [];
    for (let j = i; j < lines.length; j++) {
      const L = lines[j];
      chunkLines.push(L);
      for (const ch of L) {
        if (ch === "{") depth++;
        else if (ch === "}") depth--;
      }
      if (depth <= 0 && chunkLines.join("\n").includes("}")) {
        const candidate = chunkLines.join("\n").trim();
        if (candidate.length > 50 && candidate.length < MAX_PARSE_CHARS) {
          try {
            const parsed = JSON.parse(candidate) as unknown;
            if (looksLikeExcalidrawPayload(parsed)) {
              return JSON.stringify(parsed);
            }
          } catch {
            // ignore
          }
        }
        break;
      }
    }
  }

  return null;
}
