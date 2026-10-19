import { NextResponse } from "next/server";
import { z } from "zod";
import { listIssues } from "@/server/admin/service";
import { requireRole } from "@/server/auth/session";
import { prisma } from "@/server/db";
import { handle } from "@/server/http";

const Query = z.object({
  severity: z.enum(["info", "warning", "error", "critical"]).optional(),
  code: z.string().regex(/^[a-z_]{3,60}$/).optional(),
  resolved: z.enum(["true", "false"]).optional(),
});

export const GET = handle(async (req: Request) => {
  await requireRole("viewer");
  const sp = new URL(req.url).searchParams;
  const q = Query.parse({ severity: sp.get("severity") ?? undefined, code: sp.get("code") ?? undefined, resolved: sp.get("resolved") ?? undefined });
  const issues = await listIssues(prisma, { severity: q.severity, code: q.code, resolved: q.resolved === undefined ? undefined : q.resolved === "true" });
  const summary = await prisma.importIssue.groupBy({ by: ["code", "severity"], where: { isResolved: false }, _count: true, orderBy: { _count: { code: "desc" } } });
  return NextResponse.json({ summary, issues });
});
