import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/server/auth/session";
import { prisma } from "@/server/db";
import { handle, jsonError } from "@/server/http";
import { writeAudit } from "@/server/import/common";
import { spawnWorker } from "@/server/import/jobs";

const Body = z.object({
  confirm: z.literal(true),
  /** Deactivate (never delete) previous videos of sub-milestones whose video changed. */
  deactivateReplaced: z.boolean().default(false),
});

/** Admin approval: marks a staged job as validated; the worker publishes it transactionally. */
export const POST = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const session = await requireRole("admin");
  const id = z.string().uuid().parse((await ctx.params).id);
  const body = Body.parse(await req.json());
  const job = await prisma.importJob.findUnique({ where: { id } });
  if (!job) return jsonError(404, "not_found");
  if (job.status !== "staged") return jsonError(409, "not_staged", `Job is ${job.status}`);
  const critical = await prisma.importIssue.count({ where: { importJobId: id, severity: "critical" } });
  if (critical) return jsonError(409, "critical_issues", "Resolve critical issues before publishing");
  await prisma.importJob.update({
    where: { id },
    data: { status: "validated", publishedById: session.userId, stats: { ...(job.stats as object), deactivateReplaced: body.deactivateReplaced } as never },
  });
  await writeAudit(prisma, { actorId: session.userId, action: "import.approve", entityType: "import_job", entityId: id, after: { deactivateReplaced: body.deactivateReplaced } });
  spawnWorker(id);
  return NextResponse.json({ jobId: id, status: "validated" }, { status: 202 });
});
