import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const secret = process.env.NEXTAUTH_SECRET;

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isWorkspace = pathname === "/workspace";
  const isAdminUi = pathname.startsWith("/admin");
  const isAdminApi = pathname === "/api/admin" || pathname.startsWith("/api/admin/");

  if (!isWorkspace && !isAdminUi && !isAdminApi) {
    return NextResponse.next();
  }

  const token = await getToken({ req, secret });

  if (isWorkspace) {
    if (token?.userId) {
      return NextResponse.next();
    }
    const login = new URL("/login", req.url);
    login.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(login);
  }

  // /admin and /api/admin — require signed-in user only here.
  // JWT cookies may omit `role` until the next session refresh; admin RBAC is enforced
  // in the admin layout (server) and in each /api/admin handler (Prisma-backed).
  if (!token?.userId) {
    if (isAdminApi) {
      return NextResponse.json(
        { success: false, message: "Unauthorized. Sign in required." },
        { status: 401 },
      );
    }
    const login = new URL("/login", req.url);
    login.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(login);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/workspace", "/admin/:path*", "/api/admin", "/api/admin/:path*"],
};
