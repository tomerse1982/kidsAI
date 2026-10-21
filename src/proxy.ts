import { NextResponse, type NextRequest } from "next/server";
import { allowedFrameAncestors, clientCookieOptions } from "@/lib/framing";
import { checkSitePassword, PUBLIC_PATHS } from "@/lib/site-auth";

const CLIENT_COOKIE = "kidsai_cid";
const ADMIN_COOKIE = "kidsai_admin";

/**
 * - optional site-wide password (SITE_PASSWORD) for shared deployments
 * - issues the anonymous per-device id used for bookmarks / conversations
 * - optimistic redirect of /admin pages to the login screen (real authorisation
 *   happens server-side in every admin page and API route)
 * - security headers
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  // shared deployment: the whole site sits behind one password (see src/lib/site-auth.ts)
  const sitePassword = process.env.SITE_PASSWORD;
  if (sitePassword && !PUBLIC_PATHS.includes(pathname) && !checkSitePassword(request.headers.get("authorization"), sitePassword)) {
    return new NextResponse("Authentication required", {
      status: 401,
      headers: { "WWW-Authenticate": 'Basic realm="KidsAi", charset="UTF-8"', "X-Robots-Tag": "noindex, nofollow" },
    });
  }
  if (pathname.startsWith("/admin") && pathname !== "/admin/login" && !request.cookies.get(ADMIN_COOKIE)) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  const response = NextResponse.next();
  if (!request.cookies.get(CLIENT_COOKIE)) {
    response.cookies.set(CLIENT_COOKIE, crypto.randomUUID(), clientCookieOptions());
  }
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  // framing allowed for configured hosts only (CSP frame-ancestors in next.config.ts); X-Frame-Options cannot express a list
  if (!pathname.startsWith("/api/sources") && !allowedFrameAncestors()) response.headers.set("X-Frame-Options", "DENY");
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icons/|manifest.webmanifest|sw.js).*)"],
};
