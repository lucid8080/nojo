import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import {
  getCronJobsBundle,
  parseYearMonthFromSearchParams,
} from "@/lib/openclaw/cronJobsBundle";
import type { OperationalScheduledJob } from "@/lib/openclaw/openClawCronTypes";

export const runtime = "nodejs";

function asOperationalScheduledJobArray(value: unknown): OperationalScheduledJob[] {
  return Array.isArray(value) ? (value as OperationalScheduledJob[]) : [];
}

export async function GET(req: NextRequest) {
  const gate = await requireAdmin(req);
  if (!gate.ok) return gate.response;

  try {
    const { year, monthIndex } = parseYearMonthFromSearchParams(req.nextUrl.searchParams);
    const body = await getCronJobsBundle(year, monthIndex) as Record<string, unknown>;
    const jobs = asOperationalScheduledJobArray(body.jobs);
    const filteredJobs = jobs.filter((job) => job.ownership?.source === "nojo");
    body.jobs = filteredJobs;
    return NextResponse.json(body);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
