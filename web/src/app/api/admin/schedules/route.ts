import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import {
  getCronJobsBundle,
  parseYearMonthFromSearchParams,
} from "@/lib/openclaw/cronJobsBundle";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const gate = await requireAdmin(req);
  if (!gate.ok) return gate.response;

  try {
    const { year, monthIndex } = parseYearMonthFromSearchParams(req.nextUrl.searchParams);
    const body = await getCronJobsBundle(year, monthIndex);
    return NextResponse.json(body);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
