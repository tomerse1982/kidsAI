import "server-only";
import { randomUUID } from "node:crypto";
import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AuthError } from "@/server/auth/session";
import { prisma } from "@/server/db";
import { rateLimitWith } from "@/server/rate-limit";
import { logger } from "@/server/logger";

export const CLIENT_COOKIE = "kidsai_cid";

/** Anonymous per-device id (set by proxy.ts). Never linked to a person. */
export async function getClientId(): Promise<string> {
  const jar = await cookies();
  const id = jar.get(CLIENT_COOKIE)?.value;
  return id && /^[a-f0-9-]{36}$/.test(id) ? id : randomUUID();
}

export async function clientKey(): Promise<string> {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "local";
  return ip;
}

// ------------------------------------------------------------- rate limit ----
/** Rate limit for route handlers; store chosen by RATE_LIMIT_STORE (see server/rate-limit.ts). */
export function rateLimit(key: string, limit: number, windowMs = 60_000) {
  return rateLimitWith(prisma, key, limit, windowMs);
}

export function jsonError(status: number, code: string, message?: string, extra: Record<string, unknown> = {}) {
  return NextResponse.json({ error: { code, message: message ?? code, ...extra } }, { status });
}

/** Uniform error handling for route handlers: validation, auth, unexpected. */
export function handle<A extends unknown[]>(fn: (...args: A) => Promise<Response>) {
  return async (...args: A): Promise<Response> => {
    try {
      return await fn(...args);
    } catch (err) {
      if (err instanceof ZodError) return jsonError(400, "invalid_request", "Request validation failed", { issues: err.issues.map((i) => ({ path: i.path.join("."), message: i.message })) });
      if (err instanceof AuthError) return jsonError(err.status, err.message);
      logger.error({ err: (err as Error).message, stack: (err as Error).stack?.split("\n").slice(0, 4).join(" | ") }, "api: unhandled error");
      return jsonError(500, "internal_error", "Unexpected server error");
    }
  };
}
