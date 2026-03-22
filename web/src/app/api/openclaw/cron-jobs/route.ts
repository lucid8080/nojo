import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth-server";
import {
  getCronJobsBundle,
  parseYearMonthFromSearchParams,
} from "@/lib/openclaw/cronJobsBundle";

export const runtime = "nodejs";

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
    const body = await getCronJobsBundle(year, monthIndex);
    return NextResponse.json(body);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
