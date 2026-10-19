import { NextResponse } from "next/server";
import { z } from "zod";
import { ADMIN_COOKIE, createSessionToken, sessionCookieOptions, verifyCredentials } from "@/server/auth/session";
import { prisma } from "@/server/db";
import { clientKey, handle, jsonError, rateLimit } from "@/server/http";
import { writeAudit } from "@/server/import/common";

const Body = z.object({ email: z.string().email().max(200), password: z.string().min(1).max(200) });

export const POST = handle(async (req: Request) => {
  const limit = await rateLimit(`login:${await clientKey()}`, 8, 15 * 60_000);
  if (!limit.ok) return jsonError(429, "rate_limited", "Too many login attempts", { retryAfter: limit.retryAfter });
  const { email, password } = Body.parse(await req.json());
  const session = await verifyCredentials(email, password);
  if (!session) return jsonError(401, "invalid_credentials", "Invalid email or password");
  await writeAudit(prisma, { actorId: session.userId, action: "auth.login", entityType: "user", entityId: session.userId });
  const res = NextResponse.json({ ok: true, role: session.role });
  res.cookies.set(ADMIN_COOKIE, await createSessionToken(session), sessionCookieOptions);
  return res;
});
