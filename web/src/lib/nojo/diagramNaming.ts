import crypto from "node:crypto";

export type DerivedDiagramNaming = {
  /** Human-readable title for Artifact.title and diagram heading */
  displayTitle: string;
  /** ASCII slug for filenames (no extension) */
  filenameStem: string;
  /** Topic phrase used to derive flowchart nodes */
  topicPhrase: string;
};

const LEADING_FILLER = new Set([
  "hi",
  "hello",
  "hey",
  "please",
  "can",
  "you",
  "make",
  "draw",
  "create",
  "show",
  "give",
  "me",
  "the",
  "a",
  "an",
  "this",
  "that",
  "my",
  "our",
  "some",
  "i",
  "id",
  "im",
  "i'm",
  "we",
  "need",
  "want",
  "like",
  "would",
  "could",
  "will",
  "just",
]);

const DIAGRAM_INTENT_TOKENS = new Set([
  "diagram",
  "flowchart",
  "chart",
  "visual",
  "flow",
  "picture",
  "graph",
]);

function titleCaseWords(s: string): string {
  return s
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

/** Slug for durable filenames; max ~50 chars */
export function slugifyDiagramStem(s: string, maxLen = 50): string {
  const slug = s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, maxLen)
    .replace(/-+$/g, "");
  if (slug.length > 0) return slug;
  return `diagram-${crypto.randomBytes(3).toString("hex")}`;
}

/**
 * Derive a clean display title and filename stem from the user message.
 * Prefer topic after for/about/of; otherwise strip greeting/diagram filler and use the subject.
 */
export function deriveDiagramNaming(prompt: string): DerivedDiagramNaming {
  const trimmed = typeof prompt === "string" ? prompt.trim() : "";
  if (!trimmed) {
    return {
      displayTitle: "Diagram",
      filenameStem: "diagram",
      topicPhrase: "",
    };
  }

  let topic = "";

  const prepMatch = trimmed.match(
    /\b(?:for|about|of)\s+(.+?)(?:[.?!]|$)/is,
  );
  if (prepMatch) {
    topic = prepMatch[1].trim();
    topic = topic.replace(/\b(diagram|flowchart|chart|visual|please)\s*$/gi, "").trim();
  }

  if (!topic) {
    const lower = trimmed.toLowerCase();
    const tokens = lower.split(/\s+/).filter(Boolean);
    let i = 0;
    while (i < tokens.length) {
      const t = tokens[i];
      if (
        LEADING_FILLER.has(t) ||
        DIAGRAM_INTENT_TOKENS.has(t) ||
        t === "to" ||
        t === "for"
      ) {
        i++;
        continue;
      }
      break;
    }
    const rest = tokens.slice(i, i + 12);
    topic = rest.join(" ").replace(/\b(diagram|flowchart|chart|visual)\b/g, " ").replace(/\s+/g, " ").trim();
  }

  if (!topic || topic.length < 2) {
    topic = trimmed.replace(/\b(diagram|flowchart|chart|visual)\b/gi, " ").replace(/\s+/g, " ").trim().slice(0, 120);
  }

  if (!/[a-z0-9]/i.test(topic)) {
    return {
      displayTitle: "Diagram",
      filenameStem: "diagram",
      topicPhrase: "",
    };
  }

  const displayTitle = titleCaseWords(topic.length ? topic : "Diagram");
  const filenameStem = slugifyDiagramStem(displayTitle);

  return {
    displayTitle,
    filenameStem,
    topicPhrase: topic.length ? topic : displayTitle.toLowerCase(),
  };
}
