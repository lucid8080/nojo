/**
 * OpenClaw persists the full string sent via `chat.send`, which for Nojo agents is
 * `composeNojoSharedContextPrompt` output ending with:
 *
 *   User request:
 *   <what the user typed>
 *
 * The send route may also append `NOJO_SCHEDULED_REMINDERS` / `NOJO_REMINDER_ERRORS`
 * after that (see `scheduleWorkspaceRemindersFromChat`).
 *
 * The workspace UI should only show what the user typed, not injected context or
 * reminder confirmation blocks.
 */
function stripNojoReminderAppendix(text: string): string {
  return text
    .replace(/\r?\n\r?\nNOJO_SCHEDULED_REMINDERS[\s\S]*$/i, "")
    .replace(/\r?\n\r?\nNOJO_REMINDER_ERRORS[\s\S]*$/i, "")
    .trimEnd();
}

export function extractUserVisibleMessageFromNojoGatewayText(text: string): string {
  const trimmed = text.trimEnd();
  const match = /\r?\nUser request:\r?\n([\s\S]*)$/.exec(trimmed);
  let body = match && match[1].trim().length > 0 ? match[1].trim() : text;
  body = stripNojoReminderAppendix(body);
  return body;
}
