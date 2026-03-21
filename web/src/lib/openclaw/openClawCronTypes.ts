/**
 * Display model for OpenClaw cron jobs (see https://docs.openclaw.ai/cron-jobs).
 * Built from raw job objects returned by the OpenClaw gateway cron list API (canonical) or,
 * when the gateway is unavailable, from a local JSON mirror (see `readOpenClawCronJobsFromDisk`).
 */

export type OperationalScheduleKind = "recurring" | "one_time" | "interval" | "unknown";

export type OperationalScheduledJob = {
  id: string;
  name: string;
  enabled: boolean;
  /** Human-readable schedule (cron expr, ISO at, or every N ms). */
  scheduleDisplay: string;
  scheduleKind: OperationalScheduleKind;
  /** Raw schedule discriminant when known. */
  scheduleKindRaw: string | null;
  nextRunAt: string | null;
  lastRunAt: string | null;
  targetAgentId: string | null;
  sessionTarget: string | null;
  wakeMode: string | null;
  deliverySummary: string | null;
  summary: string;
  /** ISO datetimes for calendar placement within the requested month. */
  occurrencesInMonth: string[];
  /** True when calendar dots could not be derived (e.g. invalid cron). */
  calendarPartial: boolean;
  /** Per-job parse/calendar warnings (e.g. invalid cron expression). */
  warnings: string[];
};

export type ReadOpenClawCronJobsResult =
  | {
      ok: true;
      resolvedPath: string;
      jobsRaw: unknown[];
      warnings: string[];
    }
  | {
      ok: false;
      resolvedPath: string;
      error: string;
      warnings: string[];
    };
