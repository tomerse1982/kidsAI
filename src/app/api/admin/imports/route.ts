import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/server/auth/session";
import { prisma } from "@/server/db";
import { handle, jsonError } from "@/server/http";
import { writeAudit } from "@/server/import/common";
import { spawnWorker } from "@/server/import/jobs";
import { storeUpload, UploadError } from "@/server/import/uploads";
import { stageVideoWorkbook } from "@/server/import/workbook/service";

export const runtime = "nodejs";
export const maxDuration = 300;

export const GET = handle(async () => {
  await requireRole("viewer");
  const jobs = await prisma.importJob.findMany({
    orderBy: { createdAt: "desc" }, take: 50,
    select: { id: true, jobType: true, status: true, language: true, originalFilename: true, createdAt: true, finishedAt: true, errorMessage: true, _count: { select: { issues: true } } },
  });
  return NextResponse.json(jobs);
});

const Meta = z.object({
  kind: z.enum(["handbook_pdf", "video_workbook"]),
  language: z.enum(["he", "ar"]),
});

/**
 * Upload a new handbook PDF or a video workbook (Arabic update or the future Hebrew file).
 * Workbooks are parsed into staging immediately; PDFs are parsed by the worker.
 * Nothing is published until an admin approves the staged preview.
 */
export const POST = handle(async (req: Request) => {
  const session = await requireRole("editor");
  const form = await req.formData();
  const meta = Meta.parse({ kind: form.get("kind"), language: form.get("language") });
  const file = form.get("file");
  if (!(file instanceof File)) return jsonError(400, "file_required");
  let stored;
  try {
    stored = await storeUpload(file, meta.kind === "handbook_pdf" ? "pdf" : "xlsx");
  } catch (err) {
    if (err instanceof UploadError) return jsonError(400, "invalid_file", err.message);
    throw err;
  }
  await writeAudit(prisma, { actorId: session.userId, action: "import.upload", entityType: "file", after: { ...meta, file: stored.originalFilename, size: stored.size, checksum: stored.checksum } });

  if (meta.kind === "handbook_pdf") {
    const job = await prisma.importJob.create({
      data: {
        jobType: "pdf_handbook", status: "queued", language: meta.language, originalFilename: stored.originalFilename,
        storagePath: stored.storagePath, checksum: stored.checksum, createdById: session.userId,
      },
    });
    spawnWorker(job.id);
    return NextResponse.json({ jobId: job.id, status: "queued" }, { status: 202 });
  }
  const res = await stageVideoWorkbook(prisma, { filePath: stored.storagePath, language: meta.language, actorId: session.userId, documentKey: `video-workbook-${meta.language}` });
  return NextResponse.json(res, { status: 201 });
});
