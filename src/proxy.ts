import { NextResponse, type NextRequest } from "next/server";

const CLIENT_COOKIE = "kidsai_cid";
const ADMIN_COOKIE = "kidsai_admin";

/**
 * - issues the anonymous per-device id used for bookmarks / conversations
 * - optimistic redirect of /admin pages to the login screen (real authorisation
 *   happens server-side in every admin page and API route)
 * - security headers
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/admin") && pathname !== "/admin/login" && !request.cookies.get(ADMIN_COOKIE)) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  const response = NextResponse.next();
  if (!request.cookies.get(CLIENT_COOKIE)) {
    response.cookies.set(CLIENT_COOKIE, crypto.randomUUID(), {
      httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 365,
    });
  }
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  if (!pathname.startsWith("/api/sources")) response.headers.set("X-Frame-Options", "DENY");
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icons/|manifest.webmanifest|sw.js).*)"],
};
