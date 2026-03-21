import "server-only";

import { createHash } from "node:crypto";
import { CronExpressionParser } from "cron-parser";
import type {
  OperationalScheduledJob,
  OperationalScheduleKind,
} from "./openClawCronTypes";

function truncate(s: string, max: number): string {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

function stableJobId(parts: string[]): string {
  return createHash("sha256").update(parts.join("|")).digest("hex").slice(0, 24);
}

type RawJob = Record<string, unknown>;

function asRecord(v: unknown): RawJob | null {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as RawJob) : null;
}

function pickJobId(j: RawJob): string {
  const jobId = j.jobId ?? j.id;
  if (typeof jobId === "string" && jobId.trim()) return jobId.trim();
  const name = typeof j.name === "string" ? j.name : "job";
  return stableJobId([
    name,
    JSON.stringify(j.schedule ?? null),
    String(j.agentId ?? ""),
  ]);
}

function scheduleKindFromRaw(
  schedule: unknown,
): { kind: OperationalScheduleKind; raw: string | null } {
  const s = asRecord(schedule);
  if (!s || typeof s.kind !== "string") return { kind: "unknown", raw: null };
  switch (s.kind) {
    case "at":
      return { kind: "one_time", raw: "at" };
    case "cron":
      return { kind: "recurring", raw: "cron" };
    case "every":
      return { kind: "interval", raw: "every" };
    default:
      return { kind: "unknown", raw: s.kind };
  }
}

function buildScheduleDisplay(schedule: unknown): string {
  const s = asRecord(schedule);
  if (!s || typeof s.kind !== "string") return "—";
  if (s.kind === "at" && typeof s.at === "string") return s.at;
  if (s.kind === "cron") {
    const expr = typeof s.expr === "string" ? s.expr : "?";
    const tz = typeof s.tz === "string" && s.tz.trim() ? ` (${s.tz})` : "";
    return `${expr}${tz}`;
  }
  if (s.kind === "every" && typeof s.everyMs === "number" && Number.isFinite(s.everyMs)) {
    return `every ${s.everyMs} ms`;
  }
  return JSON.stringify(schedule);
}

function extractSummary(payload: unknown): string {
  const p = asRecord(payload);
  if (!p || typeof p.kind !== "string") return "—";
  if (p.kind === "systemEvent" && typeof p.text === "string") return truncate(p.text, 200);
  if (p.kind === "agentTurn" && typeof p.message === "string") return truncate(p.message, 200);
  return truncate(JSON.stringify(payload), 160);
}

function extractDeliverySummary(delivery: unknown): string | null {
  const d = asRecord(delivery);
  if (!d) return null;
  const mode = typeof d.mode === "string" ? d.mode : "";
  const channel = typeof d.channel === "string" ? d.channel : "";
  const to = typeof d.to === "string" ? truncate(d.to, 80) : "";
  const parts = [mode, channel, to].filter(Boolean);
  return parts.length ? parts.join(" · ") : null;
}

function parseIsoDate(iso: string): Date | null {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

function monthBoundsUtc(year: number, monthIndex: number): { start: Date; end: Date } {
  const start = new Date(year, monthIndex, 1, 0, 0, 0, 0);
  const end = new Date(year, monthIndex + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

/**
 * Collect ISO datetimes for cron `expr` that fall within the given local month.
 */
export function cronOccurrencesInMonth(
  expr: string,
  tz: string | undefined,
  year: number,
  monthIndex: number,
): { occurrences: string[]; error: string | null } {
  const { start, end } = monthBoundsUtc(year, monthIndex);
  const tzOpt = tz && tz.trim() ? tz : undefined;
  try {
    let current = CronExpressionParser.parse(expr, {
      tz: tzOpt,
      currentDate: start,
    });
    const out: string[] = [];
    for (let i = 0; i < 400; i++) {
      const next = current.next();
      const d = next.toDate();
      if (d.getTime() > end.getTime()) break;
      if (d.getTime() >= start.getTime() - 1) {
        out.push(d.toISOString());
      }
      current = CronExpressionParser.parse(expr, {
        tz: tzOpt,
        currentDate: new Date(d.getTime() + 1000),
      });
    }
    return { occurrences: out, error: null };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { occurrences: [], error: msg };
  }
}

function everyOccurrencesInMonth(
  everyMs: number,
  year: number,
  monthIndex: number,
): string[] {
  if (!Number.isFinite(everyMs) || everyMs <= 0) return [];
  const { start, end } = monthBoundsUtc(year, monthIndex);
  const out: string[] = [];
  let t = start.getTime();
  const endT = end.getTime();
  const maxPoints = 500;
  let n = 0;
  while (t <= endT && n < maxPoints) {
    out.push(new Date(t).toISOString());
    t += everyMs;
    n += 1;
  }
  return out;
}

export function normalizeOpenClawJob(
  raw: unknown,
  ctx: { year: number; monthIndex: number },
): OperationalScheduledJob {
  const j = asRecord(raw) ?? {};
  const id = pickJobId(j);
  const name = typeof j.name === "string" && j.name.trim() ? j.name.trim() : id;
  const enabled = typeof j.enabled === "boolean" ? j.enabled : true;
  const { kind: scheduleKind, raw: scheduleKindRaw } = scheduleKindFromRaw(j.schedule);
  const scheduleDisplay = buildScheduleDisplay(j.schedule);
  const summary = extractSummary(j.payload);
  const deliverySummary = extractDeliverySummary(j.delivery);
  const targetAgentId =
    typeof j.agentId === "string" && j.agentId.trim() ? j.agentId.trim() : null;
  const sessionTarget = typeof j.sessionTarget === "string" ? j.sessionTarget : null;
  const wakeMode = typeof j.wakeMode === "string" ? j.wakeMode : null;

  const schedule = asRecord(j.schedule);
  let nextRunAt: string | null = null;
  const lastRunAt: string | null =
    typeof j.lastRunAt === "string"
      ? j.lastRunAt
      : typeof (j as RawJob).lastRun === "string"
        ? ((j as RawJob).lastRun as string)
        : null;

  let occurrencesInMonth: string[] = [];
  let calendarPartial = false;
  const warnings: string[] = [];

  if (schedule?.kind === "at" && typeof schedule.at === "string") {
    const d = parseIsoDate(schedule.at);
    if (d) {
      nextRunAt = d.toISOString();
      const { start, end } = monthBoundsUtc(ctx.year, ctx.monthIndex);
      if (d.getTime() >= start.getTime() && d.getTime() <= end.getTime()) {
        occurrencesInMonth = [d.toISOString()];
      }
    }
  } else if (schedule?.kind === "cron" && typeof schedule.expr === "string") {
    const tz = typeof schedule.tz === "string" ? schedule.tz : undefined;
    const { occurrences, error } = cronOccurrencesInMonth(
      schedule.expr,
      tz,
      ctx.year,
      ctx.monthIndex,
    );
    occurrencesInMonth = occurrences;
    if (error) {
      calendarPartial = true;
      warnings.push(`Cron "${name}": ${error}`);
    }
    if (occurrences.length > 0) {
      nextRunAt = occurrences[0]!;
    } else {
      try {
        const exprParsed = CronExpressionParser.parse(schedule.expr, {
          tz: tz && tz.trim() ? tz : undefined,
          currentDate: new Date(),
        });
        nextRunAt = exprParsed.next().toDate().toISOString();
      } catch {
        nextRunAt = null;
      }
    }
  } else if (schedule?.kind === "every" && typeof schedule.everyMs === "number") {
    const all = everyOccurrencesInMonth(schedule.everyMs, ctx.year, ctx.monthIndex);
    occurrencesInMonth = all.slice(0, 32);
    if (all.length > 32) {
      warnings.push(`Interval "${name}": showing first 32 ticks in month (dense schedule).`);
    }
    if (occurrencesInMonth.length > 0) {
      nextRunAt = occurrencesInMonth[0]!;
    }
  }

  return {
    id,
    name,
    enabled,
    scheduleDisplay,
    scheduleKind,
    scheduleKindRaw,
    nextRunAt,
    lastRunAt,
    targetAgentId,
    sessionTarget,
    wakeMode,
    deliverySummary,
    summary,
    occurrencesInMonth,
    calendarPartial: calendarPartial || (scheduleKind === "unknown" && occurrencesInMonth.length === 0),
    warnings,
  };
}

/**
 * Defensive extraction for gateway or disk JSON: bare array, `{ jobs }`, nested `{ data: { jobs } }`, etc.
 */
export function extractCronJobsArrayFromUnknown(data: unknown): unknown[] {
  if (Array.isArray(data)) return data;
  if (!data || typeof data !== "object") return [];
  const o = data as Record<string, unknown>;
  if (Array.isArray(o.jobs)) return o.jobs;
  if (Array.isArray(o.items)) return o.items;
  if (Array.isArray(o.data)) return o.data as unknown[];
  if (o.data != null && typeof o.data === "object") {
    const d = o.data as Record<string, unknown>;
    if (Array.isArray(d.jobs)) return d.jobs;
    if (Array.isArray(d.items)) return d.items;
  }
  return [];
}

export function extractJobsArray(parsed: unknown): unknown[] {
  return extractCronJobsArrayFromUnknown(parsed);
}

export function normalizeOpenClawCronJobList(
  jobs: unknown[],
  ctx: { year: number; monthIndex: number },
): OperationalScheduledJob[] {
  return jobs.map((raw) => normalizeOpenClawJob(raw, ctx));
}
