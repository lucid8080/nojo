import "server-only";

import { buildWorkspaceGatewaySessionKey } from "@/lib/openclaw/gateway-session-key";
import { callOpenClawCronAdd, type OpenClawCronAddPayload } from "@/lib/openclaw/openClawCronGateway";
import { OpenClawError } from "@/lib/openclaw/client";
import { getEffectiveReminderTimeZone } from "@/lib/reminders/reminderTimeZone";
import {
  hasWorkspaceReminderIntent,
  parseWorkspaceReminderTimes,
} from "@/lib/reminders/parseWorkspaceReminderTimes";

export type ScheduledReminderResult = {
  jobId?: string;
  atIso: string;
  matchedText: string;
  name: string;
};

export type ScheduleWorkspaceRemindersOutcome = {
  scheduled: ScheduledReminderResult[];
  errors: string[];
  /** Injected into the model prompt so the assistant confirms server-side scheduling. */
  confirmationBlock: string | null;
};

/**
 * When the user asks for reminders in Agent Workspace chat, create real OpenClaw cron jobs
 * (canonical scheduler). No parallel Nojo-only reminder store.
 */
export async function scheduleWorkspaceRemindersFromChat(input: {
  userId: string;
  conversationId: string;
  agentId: string;
  userTimeZone: string | null | undefined;
  prompt: string;
}): Promise<ScheduleWorkspaceRemindersOutcome> {
  const empty: ScheduleWorkspaceRemindersOutcome = {
    scheduled: [],
    errors: [],
    confirmationBlock: null,
  };

  if (!hasWorkspaceReminderIntent(input.prompt)) {
    // #region agent log
    fetch("http://127.0.0.1:7818/ingest/7c1439b6-86e7-496a-b71e-0c1383a70c7d", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "b4897e" },
      body: JSON.stringify({
        sessionId: "b4897e",
        location: "scheduleWorkspaceRemindersFromChat.ts:noIntent",
        message: "reminder path skipped",
        hypothesisId: "H1",
        data: { reason: "no_reminder_intent" },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    return empty;
  }

  const tz = getEffectiveReminderTimeZone(input.userTimeZone);
  const times = parseWorkspaceReminderTimes(input.prompt, tz);
  if (times.length === 0) {
    // #region agent log
    fetch("http://127.0.0.1:7818/ingest/7c1439b6-86e7-496a-b71e-0c1383a70c7d", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "b4897e" },
      body: JSON.stringify({
        sessionId: "b4897e",
        location: "scheduleWorkspaceRemindersFromChat.ts:noTimes",
        message: "reminder intent but zero parsed times",
        hypothesisId: "H1",
        data: { tz },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    return empty;
  }

  const sessionKey = buildWorkspaceGatewaySessionKey({
    userId: input.userId,
    conversationId: input.conversationId,
    agentId: input.agentId,
  });
  const sessionTarget = `session:${sessionKey}`;
  const taskBody = truncate(input.prompt.trim(), 500);
  const meta = `nojo user=${input.userId} conversation=${input.conversationId} agent=${input.agentId}`;

  const scheduled: ScheduledReminderResult[] = [];
  const errors: string[] = [];

  for (let i = 0; i < times.length; i++) {
    const t = times[i]!;
    const atIso = t.at.toISOString();
    const name = truncate(`Nojo reminder ${i + 1}: ${taskBody}`, 120);
    const payload: OpenClawCronAddPayload = {
      name,
      description: meta,
      schedule: { kind: "at", at: atIso },
      sessionTarget,
      wakeMode: "now",
      deleteAfterRun: true,
      agentId: input.agentId,
      payload: {
        kind: "agentTurn",
        message: `[cron reminder] ${taskBody}\n(Scheduled for ${atIso} — ${tz}. Match: "${t.matchedText}")`,
        lightContext: true,
      },
      delivery: { mode: "none" },
    };

    try {
      const res = await callOpenClawCronAdd(payload, { timeoutMs: 45_000 });
      scheduled.push({
        jobId: res.jobId,
        atIso,
        matchedText: t.matchedText,
        name,
      });
    } catch (err) {
      const msg =
        err instanceof OpenClawError
          ? err.message
          : err instanceof Error
            ? err.message
            : String(err);
      errors.push(`Reminder at ${atIso}: ${msg}`);
    }
  }

  if (scheduled.length === 0 && errors.length === 0) {
    // #region agent log
    fetch("http://127.0.0.1:7818/ingest/7c1439b6-86e7-496a-b71e-0c1383a70c7d", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "b4897e" },
      body: JSON.stringify({
        sessionId: "b4897e",
        location: "scheduleWorkspaceRemindersFromChat.ts:emptyOutcome",
        message: "parsed times but no scheduled rows and no errors",
        hypothesisId: "H1",
        data: { parsedTimeCount: times.length },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    return empty;
  }

  const confirmationBlock =
    scheduled.length > 0
      ? [
          "NOJO_SCHEDULED_REMINDERS (authoritative — server already created these OpenClaw cron jobs):",
          ...scheduled.map(
            (s) =>
              `- ${s.atIso} (${tz}) — ${s.matchedText}${s.jobId ? ` — jobId=${s.jobId}` : ""}`,
          ),
          errors.length
            ? `Some reminders could not be scheduled: ${errors.join(" | ")}`
            : null,
          "Acknowledge these times to the user. Do not claim timed reminders cannot be scheduled or tell them to use a phone/calendar instead.",
        ]
          .filter(Boolean)
          .join("\n")
      : errors.length > 0
        ? `NOJO_REMINDER_ERRORS: ${errors.join(" | ")}`
        : null;

  // #region agent log
  fetch("http://127.0.0.1:7818/ingest/7c1439b6-86e7-496a-b71e-0c1383a70c7d", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "b4897e" },
    body: JSON.stringify({
      sessionId: "b4897e",
      location: "scheduleWorkspaceRemindersFromChat.ts:done",
      message: "reminder scheduling outcome",
      hypothesisId: "H1",
      data: {
        scheduledCount: scheduled.length,
        errorCount: errors.length,
        jobIdPrefixes: scheduled.map((s) =>
          s.jobId ? String(s.jobId).slice(0, 8) : null,
        ),
        atIsoSample: scheduled[0]?.atIso ?? null,
      },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion

  return { scheduled, errors, confirmationBlock };
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return `${s.slice(0, max - 1)}…`;
}
