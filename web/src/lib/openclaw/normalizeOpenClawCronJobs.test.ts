import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  cronOccurrencesInMonth,
  extractCronJobsArrayFromUnknown,
  extractJobsArray,
  normalizeOpenClawCronJobList,
  normalizeOpenClawJob,
} from "./normalizeOpenClawCronJobs";

const fixturePath = path.join(__dirname, "__fixtures__", "openclaw-cron-jobs.sample.json");

describe("extractJobsArray", () => {
  it("accepts top-level array", () => {
    expect(extractJobsArray([{ a: 1 }])).toEqual([{ a: 1 }]);
  });

  it("accepts { jobs: [...] }", () => {
    expect(extractJobsArray({ jobs: [{ id: "x" }] })).toEqual([{ id: "x" }]);
  });
});

describe("extractCronJobsArrayFromUnknown", () => {
  it("parses JSON string bodies (e.g. gateway text/plain + JSON)", () => {
    const inner = { jobs: [{ jobId: "a", name: "x" }] };
    const str = JSON.stringify(inner);
    expect(extractCronJobsArrayFromUnknown(str)).toEqual(inner.jobs);
  });

  it("accepts { data: { jobs: [...] } }", () => {
    expect(
      extractCronJobsArrayFromUnknown({
        data: { jobs: [{ id: "nested" }] },
      }),
    ).toEqual([{ id: "nested" }]);
  });

  it("accepts { data: [...] }", () => {
    expect(extractCronJobsArrayFromUnknown({ data: [{ id: "arr" }] })).toEqual([{ id: "arr" }]);
  });

  it("accepts top-level items", () => {
    expect(extractCronJobsArrayFromUnknown({ items: [{ id: "i" }] })).toEqual([{ id: "i" }]);
  });

  it("returns empty for unrecognized shapes", () => {
    expect(extractCronJobsArrayFromUnknown({ meta: true })).toEqual([]);
  });

  it("accepts { cronJobs: [...] }", () => {
    expect(
      extractCronJobsArrayFromUnknown({ cronJobs: [{ id: "cj" }] }),
    ).toEqual([{ id: "cj" }]);
  });

  it("accepts { result: { jobs: [...] } }", () => {
    expect(
      extractCronJobsArrayFromUnknown({ result: { jobs: [{ id: "r" }] } }),
    ).toEqual([{ id: "r" }]);
  });

  it("accepts { result: [...] }", () => {
    expect(extractCronJobsArrayFromUnknown({ result: [{ id: "ra" }] })).toEqual([{ id: "ra" }]);
  });

  it("accepts { jobs: { jobId: job } } keyed map (gateway store shape)", () => {
    const j = {
      jobId: "j1",
      name: "Test",
      schedule: { kind: "at", at: "2026-01-01T00:00:00Z" },
    };
    expect(
      extractCronJobsArrayFromUnknown({
        jobs: { j1: j },
      }),
    ).toEqual([j]);
  });

  it("accepts { cron: { jobs: [...] } }", () => {
    expect(
      extractCronJobsArrayFromUnknown({ cron: { jobs: [{ id: "nested" }] } }),
    ).toEqual([{ id: "nested" }]);
  });

  it("accepts { data: { result: { jobs: [...] } } }", () => {
    expect(
      extractCronJobsArrayFromUnknown({
        data: { result: { jobs: [{ id: "deep" }] } },
      }),
    ).toEqual([{ id: "deep" }]);
  });
});

describe("normalizeOpenClawCronJobList", () => {
  it("normalizes fixture jobs for March 2026", () => {
    const raw = JSON.parse(readFileSync(fixturePath, "utf8")) as unknown;
    const jobs = extractJobsArray(raw);
    const out = normalizeOpenClawCronJobList(jobs, { year: 2026, monthIndex: 2 });
    expect(out.length).toBe(2);
    const morning = out.find((j) => j.name === "Morning brief");
    expect(morning?.scheduleKind).toBe("recurring");
    expect(morning?.deliverySummary).toContain("announce");
    const once = out.find((j) => j.name === "One-shot reminder");
    expect(once?.scheduleKind).toBe("one_time");
    expect(once?.occurrencesInMonth.length).toBe(1);
  });
});

describe("cronOccurrencesInMonth", () => {
  it("returns daily fires for 0 7 * * * in March 2026", () => {
    const { occurrences, error } = cronOccurrencesInMonth(
      "0 7 * * *",
      undefined,
      2026,
      2,
    );
    expect(error).toBeNull();
    expect(occurrences.length).toBeGreaterThanOrEqual(28);
    expect(occurrences.length).toBeLessThanOrEqual(31);
  });
});

describe("normalizeOpenClawJob", () => {
  it("builds stable id from name when jobId missing", () => {
    const j = normalizeOpenClawJob(
      {
        name: "Test",
        schedule: { kind: "cron", expr: "0 * * * *" },
        payload: { kind: "agentTurn", message: "Hi" },
      },
      { year: 2026, monthIndex: 0 },
    );
    expect(j.id.length).toBeGreaterThan(8);
    expect(j.summary).toContain("Hi");
  });

  it("accepts schedule.every as alias for everyMs (interval)", () => {
    const j = normalizeOpenClawJob(
      {
        name: "Tick",
        schedule: { kind: "every", every: 86_400_000 },
        payload: { kind: "systemEvent", text: "daily" },
      },
      { year: 2026, monthIndex: 0 },
    );
    expect(j.scheduleKind).toBe("interval");
    expect(j.scheduleDisplay).toContain("86400000");
    expect(j.occurrencesInMonth.length).toBeGreaterThan(0);
  });
});

describe("cronOccurrencesInMonth (six-field)", () => {
  it("parses a 6-field cron expression with seconds", () => {
    const { occurrences, error } = cronOccurrencesInMonth(
      "0 0 7 * * *",
      undefined,
      2026,
      2,
    );
    expect(error).toBeNull();
    expect(occurrences.length).toBeGreaterThanOrEqual(28);
  });
});
