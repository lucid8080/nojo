import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth-server";
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
  try {
    const userId = await getSessionUserId(req);
    if (!userId) {
      return NextResponse.json(
        { success: false, message: "Unauthorized. Sign in to view cron jobs." },
        { status: 401 },
      );
    }

    const { year, monthIndex } = parseYearMonthFromSearchParams(req.nextUrl.searchParams);
    const body = await getCronJobsBundle(year, monthIndex) as Record<string, unknown>;
    const jobs = asOperationalScheduledJobArray(body.jobs);
    const filteredJobs = jobs.filter(
      (job) => job.ownership?.source === "nojo" && job.ownership.createdByUserId === userId,
    );
    body.jobs = filteredJobs;
    return NextResponse.json(body);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
