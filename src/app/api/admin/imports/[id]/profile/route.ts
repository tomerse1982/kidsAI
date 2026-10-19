import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/server/auth/session";
import { prisma } from "@/server/db";
import { handle, jsonError } from "@/server/http";
import { writeAudit } from "@/server/import/common";
import { stageVideoWorkbook } from "@/server/import/workbook/service";
import { ColumnMapSchema } from "@/server/import/workbook/types";

const Body = z.object({
  sheet: z.string().min(1).max(100),
  headerRow: z.number().int().positive().max(50),
  columns: ColumnMapSchema,
  originalTitlePrefix: z.string().max(3).optional(),
});

/**
 * Column-mapping confirmation for a workbook whose layout is not a built-in profile
 * (e.g. the future Hebrew video workbook). Re-stages the same file with the admin's mapping.
 */
export const POST = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const session = await requireRole("editor");
  const id = z.string().uuid().parse((await ctx.params).id);
  const body = Body.parse(await req.json());
  const job = await prisma.importJob.findUnique({ where: { id } });
  if (!job || job.jobType !== "video_workbook") return jsonError(404, "not_found");
  if (!["queued", "staged", "failed"].includes(job.status)) return jsonError(409, "not_editable", `Job is ${job.status}`);
  const profile = {
    id: `custom-${id.slice(0, 8)}`, description: `Admin-confirmed mapping for ${job.originalFilename}`,
    sheet: body.sheet, headerRow: body.headerRow, columns: body.columns, crossChecks: [], inventorySheets: [],
    ...(body.originalTitlePrefix ? { originalTitlePrefix: body.originalTitlePrefix } : {}),
  };
  await prisma.importJob.update({ where: { id }, data: { status: "cancelled", finishedAt: new Date(), errorMessage: "superseded by re-stage with confirmed column mapping" } });
  const res = await stageVideoWorkbook(prisma, {
    filePath: job.storagePath, language: job.language as "he" | "ar", profile, actorId: session.userId,
    documentKey: String((job.stats as { documentKey?: string }).documentKey ?? `video-workbook-${job.language}`),
  });
  await writeAudit(prisma, { actorId: session.userId, action: "import.confirm_column_mapping", entityType: "import_job", entityId: res.jobId, after: profile });
  return NextResponse.json(res, { status: 201 });
});
