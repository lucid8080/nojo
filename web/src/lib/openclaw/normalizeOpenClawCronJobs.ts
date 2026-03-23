import "server-only";

import { createHash } from "node:crypto";
import { CronExpressionParser } from "cron-parser";
import type {
  NojoCronOwnership,
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
const NOJO_OWNERSHIP_PREFIX = "NOJO_OWNERSHIP_JSON:";

function asRecord(v: unknown): RawJob | null {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as RawJob) : null;
}

function parseNojoCronOwnershipFromDescription(description: string | null): NojoCronOwnership | null {
  if (!description) return null;
  const idx = description.indexOf(NOJO_OWNERSHIP_PREFIX);
  if (idx < 0) return null;
  const raw = description.slice(idx + NOJO_OWNERSHIP_PREFIX.length).trim();
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    const o = asRecord(parsed);
    if (!o) return null;
    if (o.source !== "nojo") return null;
    if (typeof o.createdByUserId !== "string" || !o.createdByUserId.trim()) return null;
    if (o.visibility !== "private" && o.visibility !== "workspace") return null;
    const out: NojoCronOwnership = {
      source: "nojo",
      createdByUserId: o.createdByUserId.trim(),
      visibility: o.visibility,
    };
    if (typeof o.createdByEmail === "string" && o.createdByEmail.trim()) {
      out.createdByEmail = o.createdByEmail.trim();
    }
    if (typeof o.workspaceId === "string" && o.workspaceId.trim()) {
      out.workspaceId = o.workspaceId.trim();
    }
    return out;
  } catch {
    return null;
  }
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
  if (s.kind === "every") {
    const ms =
      typeof s.everyMs === "number" && Number.isFinite(s.everyMs)
        ? s.everyMs
        : typeof s.every === "number" && Number.isFinite(s.every)
          ? s.every
          : null;
    if (ms != null) return `every ${ms} ms`;
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
  const description = typeof j.description === "string" ? j.description : null;
  const ownership = parseNojoCronOwnershipFromDescription(description);

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
      } else {
        // #region agent log
        fetch("http://127.0.0.1:7818/ingest/7c1439b6-86e7-496a-b71e-0c1383a70c7d", {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "b4897e" },
          body: JSON.stringify({
            sessionId: "b4897e",
            location: "normalizeOpenClawJob.ts:atOutsideMonth",
            message: "at job not placed on calendar month",
            hypothesisId: "H3",
            data: {
              jobId: id.slice(0, 12),
              scheduleAt: schedule.at,
              viewYear: ctx.year,
              viewMonthIndex: ctx.monthIndex,
              runInstantMs: d.getTime(),
              monthStartMs: start.getTime(),
              monthEndMs: end.getTime(),
            },
            timestamp: Date.now(),
          }),
        }).catch(() => {});
        // #endregion
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
  } else if (schedule?.kind === "every") {
    const everyMs =
      typeof schedule.everyMs === "number" && Number.isFinite(schedule.everyMs)
        ? schedule.everyMs
        : typeof schedule.every === "number" && Number.isFinite(schedule.every)
          ? schedule.every
          : NaN;
    if (!Number.isFinite(everyMs) || everyMs <= 0) {
      warnings.push(`Interval "${name}": missing or invalid everyMs/every.`);
    } else {
      const all = everyOccurrencesInMonth(everyMs, ctx.year, ctx.monthIndex);
      occurrencesInMonth = all.slice(0, 32);
      if (all.length > 32) {
        warnings.push(`Interval "${name}": showing first 32 ticks in month (dense schedule).`);
      }
      if (occurrencesInMonth.length > 0) {
        nextRunAt = occurrencesInMonth[0]!;
      }
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
    ownership,
  };
}

/**
 * OpenClaw gateway may return `jobs` as a keyed map (`{ [jobId]: job }`) instead of an array.
 */
function coalesceJobsLikeMap(value: unknown): unknown[] | null {
  if (value == null || typeof value !== "object" || Array.isArray(value)) return null;
  const vals = Object.values(value as Record<string, unknown>);
  if (vals.length === 0) return [];
  const allPlainObjects = vals.every(
    (x) => x != null && typeof x === "object" && !Array.isArray(x),
  );
  if (!allPlainObjects) return null;
  return vals;
}

function arrayFromRecord(r: Record<string, unknown>): unknown[] | null {
  if (Array.isArray(r.jobs)) return r.jobs;
  if (r.jobs != null && typeof r.jobs === "object" && !Array.isArray(r.jobs)) {
    const coerced = coalesceJobsLikeMap(r.jobs);
    if (coerced) return coerced;
  }
  if (Array.isArray(r.items)) return r.items;
  if (r.items != null && typeof r.items === "object" && !Array.isArray(r.items)) {
    const coerced = coalesceJobsLikeMap(r.items);
    if (coerced) return coerced;
  }
  if (Array.isArray(r.cronJobs)) return r.cronJobs;
  if (Array.isArray(r.schedules)) return r.schedules;
  if (Array.isArray(r.result)) return r.result;
  if (r.result != null && typeof r.result === "object") {
    return arrayFromRecord(r.result as Record<string, unknown>);
  }
  return null;
}

/**
 * Defensive extraction for gateway or disk JSON: bare array, `{ jobs }`, nested `{ data: { jobs } }`, etc.
 */
export function extractCronJobsArrayFromUnknown(data: unknown): unknown[] {
  if (typeof data === "string") {
    const t = data.trim();
    if (t.length > 0 && (t.startsWith("{") || t.startsWith("["))) {
      try {
        return extractCronJobsArrayFromUnknown(JSON.parse(t) as unknown);
      } catch {
        return [];
      }
    }
    return [];
  }
  if (Array.isArray(data)) return data;
  if (!data || typeof data !== "object") return [];
  const o = data as Record<string, unknown>;
  const top = arrayFromRecord(o);
  if (top) return top;
  if (o.store != null && typeof o.store === "object") {
    const fromStore = arrayFromRecord(o.store as Record<string, unknown>);
    if (fromStore) return fromStore;
  }
  if (o.cron != null && typeof o.cron === "object") {
    const nested = arrayFromRecord(o.cron as Record<string, unknown>);
    if (nested) return nested;
  }
  if (Array.isArray(o.data)) return o.data as unknown[];
  if (o.data != null && typeof o.data === "object") {
    const d = o.data as Record<string, unknown>;
    const fromData = arrayFromRecord(d);
    if (fromData) return fromData;
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
