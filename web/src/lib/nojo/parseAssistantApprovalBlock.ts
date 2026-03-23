/**
 * Machine-readable approval requests for the workspace chat UI.
 *
 * When an agent needs human approval, include exactly one fenced block in the
 * assistant message (anywhere in the text). The client strips this block from
 * the visible agent bubble and renders an ApprovalMessage card instead.
 *
 * Example (JSON inside the fence):
 *
 * ```nojo-approval
 * {"title":"Publish Q2 positioning pack","description":"Approve release of …"}
 * ```
 *
 * Fields:
 * - `title` (string, required, non-empty after trim)
 * - `description` (string, required, non-empty after trim)
 *
 * If parsing fails or fields are invalid, the full assistant text is shown as
 * a normal agent message (no card).
 */
const NOJO_APPROVAL_FENCE =
  /```[ \t]*nojo-approval[ \t]*\r?\n([\s\S]*?)```/;

export type ParsedAssistantApproval = {
  title: string;
  description: string;
};

export function parseAssistantApprovalBlock(text: string): {
  cleanedText: string;
  approval?: ParsedAssistantApproval;
} {
  const m = text.match(NOJO_APPROVAL_FENCE);
  if (!m || m.index === undefined) {
    return { cleanedText: text };
  }

  const inner = (m[1] ?? "").trim();
  let parsed: unknown;
  try {
    parsed = JSON.parse(inner);
  } catch {
    return { cleanedText: text };
  }

  if (!parsed || typeof parsed !== "object") {
    return { cleanedText: text };
  }

  const o = parsed as Record<string, unknown>;
  const title = typeof o.title === "string" ? o.title.trim() : "";
  const description = typeof o.description === "string" ? o.description.trim() : "";
  if (!title || !description) {
    return { cleanedText: text };
  }

  const cleanedText = (text.slice(0, m.index) + text.slice(m.index + m[0].length))
    .replace(/\r?\n\r?\n$/g, "\n")
    .trimEnd();

  return {
    cleanedText: cleanedText.trim(),
    approval: { title, description },
  };
}
