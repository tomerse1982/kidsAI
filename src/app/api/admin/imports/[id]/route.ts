import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/server/auth/session";
import { prisma } from "@/server/db";
import { handle, jsonError } from "@/server/http";

/** Job status + staged preview (row actions, issues) for the admin review screen. */
export const GET = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  await requireRole("viewer");
  const id = z.string().uuid().parse((await ctx.params).id);
  const sp = new URL(req.url).searchParams;
  const action = z.enum(["insert", "update", "unchanged", "conflict", "none"]).optional().parse(sp.get("action") ?? undefined);
  const job = await prisma.importJob.findUnique({ where: { id } });
  if (!job) return jsonError(404, "not_found");
  const [rows, rowCounts, issues] = await Promise.all([
    prisma.importRowRecord.findMany({ where: { importJobId: id, ...(action ? { action } : {}) }, orderBy: { rowNumber: "asc" }, take: 600 }),
    prisma.importRowRecord.groupBy({ by: ["action", "status"], where: { importJobId: id }, _count: true }),
    prisma.importIssue.findMany({ where: { importJobId: id }, orderBy: [{ severity: "desc" }, { rowNumber: "asc" }], take: 500 }),
  ]);
  return NextResponse.json({ job, rowCounts, rows, issues });
});
