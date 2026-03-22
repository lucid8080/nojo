import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth-server";
import {
  getEffectiveReminderTimeZone,
  isValidIanaTimeZone,
} from "@/lib/reminders/reminderTimeZone";
import { getUserTimeZoneFromDb, setUserTimeZoneInDb } from "@/lib/reminders/userTimeZoneDb";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const userId = await getSessionUserId(req);
  if (!userId) {
    return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
  }

  const timeZone = await getUserTimeZoneFromDb(userId);
  return NextResponse.json({
    success: true,
    timeZone,
    effectiveTimeZone: getEffectiveReminderTimeZone(timeZone),
  });
}

type PatchBody = {
  timeZone?: unknown;
};

export async function PATCH(req: NextRequest) {
  const userId = await getSessionUserId(req);
  if (!userId) {
    return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
  }

  let body: PatchBody;
  try {
    body = (await req.json()) as PatchBody;
  } catch {
    return NextResponse.json({ success: false, message: "Invalid JSON." }, { status: 400 });
  }

  const raw = body.timeZone;
  if (raw === null || raw === undefined) {
    await setUserTimeZoneInDb(userId, null);
    return NextResponse.json({
      success: true,
      timeZone: null,
      effectiveTimeZone: getEffectiveReminderTimeZone(null),
    });
  }

  if (typeof raw !== "string" || raw.trim() === "") {
    return NextResponse.json(
      { success: false, message: "timeZone must be a non-empty string or null." },
      { status: 400 },
    );
  }

  const tz = raw.trim();
  if (!isValidIanaTimeZone(tz)) {
    return NextResponse.json(
      { success: false, message: `Invalid IANA time zone: ${tz}` },
      { status: 400 },
    );
  }

  await setUserTimeZoneInDb(userId, tz);

  return NextResponse.json({
    success: true,
    timeZone: tz,
    effectiveTimeZone: getEffectiveReminderTimeZone(tz),
  });
}
