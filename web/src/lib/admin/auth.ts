import type { UserRole } from "@prisma/client";
import { getToken } from "next-auth/jwt";
import { getServerSession } from "next-auth/next";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/db";

const secret = process.env.NEXTAUTH_SECRET;

export type SessionUser = {
  id: string;
  email: string | null;
  role: UserRole;
};

export function isAdminRole(role: UserRole | undefined | null): boolean {
  return role === "ADMIN";
}

/** JWT-backed user for API routes. Fills `role` from DB when the cookie predates role claims. */
export async function getSessionUser(req: NextRequest): Promise<SessionUser | null> {
  const token = await getToken({ req, secret });
  const id = token?.userId as string | undefined;
  if (!id || typeof id !== "string") return null;

  let role = token?.role as UserRole | undefined;
  let email = (token?.email as string | null) ?? null;

  if (!role) {
    const dbUser = await prisma.user.findUnique({
      where: { id },
      select: { role: true, email: true },
    });
    if (!dbUser) return null;
    role = dbUser.role;
    email = dbUser.email;
  }

  return {
    id,
    email,
    role,
  };
}

export function adminUnauthorizedJson() {
  return NextResponse.json(
    { success: false, message: "Unauthorized. Sign in required." },
    { status: 401 },
  );
}

export function adminForbiddenJson() {
  return NextResponse.json(
    { success: false, message: "Forbidden. Admin access required." },
    { status: 403 },
  );
}

/**
 * Use in /api/admin routes. Returns admin user or a ready-to-return NextResponse.
 */
export async function requireAdmin(
  req: NextRequest,
): Promise<{ ok: true; user: SessionUser } | { ok: false; response: NextResponse }> {
  const user = await getSessionUser(req);
  if (!user) {
    return { ok: false, response: adminUnauthorizedJson() };
  }
  if (!isAdminRole(user.role)) {
    return { ok: false, response: adminForbiddenJson() };
  }
  return { ok: true, user };
}

/** Server Components / layout: current session user, or null if not signed in. */
export async function getServerSessionUser(): Promise<SessionUser | null> {
  const session = await getServerSession(authOptions);
  const id = session?.user?.id;
  if (!id || typeof id !== "string") return null;

  let role = session?.user?.role as UserRole | undefined;
  let email = session?.user?.email ?? null;

  if (!role) {
    const dbUser = await prisma.user.findUnique({
      where: { id },
      select: { role: true, email: true },
    });
    if (!dbUser) return null;
    role = dbUser.role;
    email = dbUser.email;
  }

  return {
    id,
    email,
    role,
  };
}

/** Server Components: admin session only. */
export async function requireAdminServerSession(): Promise<SessionUser | null> {
  const user = await getServerSessionUser();
  if (!user || !isAdminRole(user.role)) return null;
  return user;
}
