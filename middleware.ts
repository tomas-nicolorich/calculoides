import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "./lib/supabase/middleware";

// Public, unauthenticated-accessible routes — the `(auth)` route group
// (task 1a.6) plus the placeholder root page. Everything else non-`/api`
// is a protected segment per server-session-auth: "Protected Segments
// Require a Verified Session".
const PUBLIC_PATHS = [
  "/",
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/complete-profile",
];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

export async function middleware(request: NextRequest) {
  const { response, user } = await updateSession(request);

  const { pathname } = request.nextUrl;
  // server-session-auth: "Legacy API paths are excluded from the matcher"
  // — the redirect branch never applies to `/api/*`. Legacy `api/*.ts`
  // endpoints authenticate independently via the bearer-token flow, and a
  // preemptive redirect/block here would break that flow even when the
  // request carries a valid `Authorization` header but no cookie session.
  const isApiPath = pathname === "/api" || pathname.startsWith("/api/");

  if (!user && !isApiPath && !isPublicPath(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|webp)$).*)",
  ],
};
