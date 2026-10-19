import { NextResponse } from "next/server";
import { z } from "zod";
import { resolveIssue } from "@/server/admin/service";
import { requireRole } from "@/server/auth/session";
import { prisma } from "@/server/db";
import { handle } from "@/server/http";

const Body = z.object({ note: z.string().trim().min(3).max(1000) });

export const PATCH = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const session = await requireRole("editor");
  const id = z.string().uuid().parse((await ctx.params).id);
  const { note } = Body.parse(await req.json());
  const issue = await resolveIssue(prisma, session.userId, id, note);
  return NextResponse.json({ id: issue.id, isResolved: issue.isResolved });
});
