import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";

const secret = process.env.NEXTAUTH_SECRET;

/** Returns current user id from JWT or null. Use in API routes and server components. */
export async function getSessionUserId(req: NextRequest): Promise<string | null> {
  const token = await getToken({ req, secret });
  const id = token?.userId as string | undefined;
  return id && typeof id === "string" ? id : null;
}
