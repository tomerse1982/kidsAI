/**
 * Site-wide password for a shared deployment (HTTP Basic auth, checked in src/proxy.ts).
 * Active only when SITE_PASSWORD is set; local development without it is unaffected.
 * The user name is ignored: everyone who was given the link uses the same password.
 */
import { createHash, timingSafeEqual } from "node:crypto";

/** Paths reachable without the password: platform health check and the crawler opt-out. */
export const PUBLIC_PATHS = ["/api/health", "/robots.txt"];

const digest = (s: string) => createHash("sha256").update(s, "utf8").digest();

/** True when the Authorization header carries the expected password (constant-time compare). */
export function checkSitePassword(authorization: string | null, expected: string): boolean {
  if (!authorization?.startsWith("Basic ")) return false;
  const decoded = Buffer.from(authorization.slice(6).trim(), "base64").toString("utf8");
  const sep = decoded.indexOf(":");
  if (sep < 0) return false;
  return timingSafeEqual(digest(decoded.slice(sep + 1)), digest(expected));
}
