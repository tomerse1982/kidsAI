import { NextResponse } from "next/server";
import { contentOverview } from "@/server/admin/service";
import { requireRole } from "@/server/auth/session";
import { prisma } from "@/server/db";
import { handle } from "@/server/http";

export const GET = handle(async () => {
  await requireRole("viewer");
  return NextResponse.json(await contentOverview(prisma));
});
