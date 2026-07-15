import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE_NAME = "payroll_session";

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const hasSession = request.cookies.has(SESSION_COOKIE_NAME);

  const isProtectedRoute =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/change-password");

  const isLoginRoute = pathname === "/login";

  if (isProtectedRoute && !hasSession) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (isLoginRoute && hasSession) {
    return NextResponse.redirect(
      new URL("/dashboard", request.url),
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/login",
    "/change-password",
    "/dashboard/:path*",
  ],
};