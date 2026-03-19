import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const secret = process.env.NEXTAUTH_SECRET;

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname !== "/workspace") {
    return NextResponse.next();
  }

  const token = await getToken({ req, secret });
  if (token?.userId) {
    return NextResponse.next();
  }

  const login = new URL("/login", req.url);
  login.searchParams.set("callbackUrl", pathname);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/workspace"],
};
