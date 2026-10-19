import "server-only";
import bcrypt from "bcryptjs";
import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";
import { prisma } from "@/server/db";

export const ADMIN_COOKIE = "kidsai_admin";
const TTL_SECONDS = 8 * 60 * 60;

export type Role = "admin" | "editor" | "viewer";
export interface AdminSession { userId: string; email: string; role: Role }

function secret(): Uint8Array {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) throw new Error("SESSION_SECRET must be set (32+ chars)");
  return new TextEncoder().encode(s);
}

export async function createSessionToken(session: AdminSession): Promise<string> {
  return new SignJWT({ email: session.email, role: session.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(session.userId)
    .setIssuedAt()
    .setExpirationTime(`${TTL_SECONDS}s`)
    .sign(secret());
}

export async function readSession(token: string | undefined): Promise<AdminSession | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: ["HS256"] });
    if (!payload.sub) return null;
    // the account may have been disabled since the token was issued
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || !user.isActive) return null;
    return { userId: user.id, email: user.email, role: user.role };
  } catch {
    return null;
  }
}

export async function getAdminSession(): Promise<AdminSession | null> {
  const jar = await cookies();
  return readSession(jar.get(ADMIN_COOKIE)?.value);
}

const RANK: Record<Role, number> = { viewer: 0, editor: 1, admin: 2 };

export class AuthError extends Error {
  constructor(public status: 401 | 403) {
    super(status === 401 ? "unauthorized" : "forbidden");
  }
}

/** Server-side authorisation for admin API routes and pages (never rely on proxy.ts alone). */
export async function requireRole(min: Role): Promise<AdminSession> {
  const session = await getAdminSession();
  if (!session) throw new AuthError(401);
  if (RANK[session.role] < RANK[min]) throw new AuthError(403);
  return session;
}

let dummyHash: string | null = null;

export async function verifyCredentials(email: string, password: string): Promise<AdminSession | null> {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
  // compare against a dummy hash when the user is unknown, to keep timing uniform
  dummyHash ??= await bcrypt.hash("timing-equaliser", 12);
  const ok = await bcrypt.compare(password, user?.passwordHash ?? dummyHash);
  if (!user || !ok || !user.isActive) return null;
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  return { userId: user.id, email: user.email, role: user.role };
}

export const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  path: "/",
  maxAge: TTL_SECONDS,
};
