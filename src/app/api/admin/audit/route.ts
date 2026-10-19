import { NextResponse } from "next/server";
import { requireRole } from "@/server/auth/session";
import { prisma } from "@/server/db";
import { handle } from "@/server/http";

export const GET = handle(async () => {
  await requireRole("viewer");
  const entries = await prisma.adminAuditLog.findMany({ orderBy: { createdAt: "desc" }, take: 200, include: { actor: { select: { email: true } } } });
  return NextResponse.json(entries);
});
