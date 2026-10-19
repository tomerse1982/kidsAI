import { NextResponse } from "next/server";
import { z } from "zod";
import { updateMapping } from "@/server/admin/service";
import { requireRole } from "@/server/auth/session";
import { prisma } from "@/server/db";
import { handle } from "@/server/http";

const Patch = z.object({
  isActive: z.boolean().optional(),
  confidenceStatus: z.enum(["verified", "source_asserted", "needs_review", "conflict"]).optional(),
  mappingType: z.enum(["exact_activity", "milestone_overview", "parent_guidance", "supporting_instruction", "requires_review"]).optional(),
  reason: z.string().trim().min(3).max(500),
});

export const PATCH = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const session = await requireRole("editor");
  const { id } = await ctx.params;
  const { reason, ...patch } = Patch.parse(await req.json());
  const updated = await updateMapping(prisma, session.userId, z.string().uuid().parse(id), patch, reason);
  return NextResponse.json({ id: updated.id, isActive: updated.isActive, confidenceStatus: updated.confidenceStatus, mappingType: updated.mappingType });
});
