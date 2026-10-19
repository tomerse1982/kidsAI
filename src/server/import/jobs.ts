/**
 * Asynchronous import jobs.
 *
 *  pdf_handbook:   queued --(worker: parse)--> staged --(admin approves)--> validated --(worker: publish)--> published
 *  video_workbook: staged (parsed in request) --(admin approves)--> validated --(worker: publish)--> published
 *
 * The worker is `scripts/worker.ts`; in development the admin API also spawns it
 * for the job just created (IMPORT_WORKER_MODE=spawn, default).
 */
import { execFile, spawn } from "node:child_process";
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import type { Prisma as Db } from "@/server/prisma-factory";
import { logger } from "@/server/logger";
import { applyScaleDomains } from "./domains";
import { publishHandbook } from "./handbook/publish";
import type { HandbookStructure } from "./handbook/types";
import { linkSegmentsToExercises } from "./link-activities";
import { publishVideoWorkbookJob } from "./workbook/service";

const run = promisify(execFile);

export function spawnWorker(jobId: string) {
  if ((process.env.IMPORT_WORKER_MODE ?? "spawn") !== "spawn") return;
  const child = spawn(process.execPath, [path.join(process.cwd(), "node_modules", "tsx", "dist", "cli.mjs"), "scripts/worker.ts", `--job=${jobId}`], {
    cwd: process.cwd(), detached: true, stdio: "ignore", env: process.env,
  });
  child.unref();
}

async function parsePdfJob(db: Db, jobId: string) {
  const job = await db.importJob.findUniqueOrThrow({ where: { id: jobId } });
  const lang = job.language as "he" | "ar";
  await db.importJob.update({ where: { id: jobId }, data: { status: "parsing", startedAt: new Date() } });
  const outDir = path.join(path.dirname(job.storagePath), "parsed");
  await mkdir(outDir, { recursive: true });
  const py = process.env.PYTHON_BIN || "python3";
  const lines = path.join(outDir, `${lang}_lines.json`);
  const structurePath = path.join(outDir, `${lang}_structure.json`);
  await run(py, ["-X", "utf8", "ingestion/pdf_extract.py", job.storagePath, lang, lines], { timeout: 15 * 60_000, maxBuffer: 32 * 1024 * 1024 });
  await run(py, ["-X", "utf8", "ingestion/pdf_structure.py", lines, job.storagePath, lang, structurePath], { timeout: 15 * 60_000, maxBuffer: 32 * 1024 * 1024 });
  const structure = JSON.parse(await readFile(structurePath, "utf8")) as HandbookStructure;
  // preview: compare with the currently published edition
  const current = await db.milestoneTranslation.findMany({ where: { language: lang, sourceOrigin: "pdf", isPrimary: true }, include: { milestone: { select: { milestoneCode: true } } } });
  const currentCodes = new Set(current.map((c) => c.milestone.milestoneCode));
  const newCodes = new Set(structure.milestones.map((m) => m.code));
  const preview = {
    completeness: structure.completeness, warnings: structure.warnings.length,
    added: [...newCodes].filter((c) => !currentCodes.has(c)),
    removed: [...currentCodes].filter((c) => !newCodes.has(c)),
    titleChanges: structure.milestones
      .filter((m) => current.some((c) => c.milestone.milestoneCode === m.code && c.title !== m.title))
      .map((m) => ({ code: m.code, from: current.find((c) => c.milestone.milestoneCode === m.code)!.title, to: m.title })),
  };
  await db.importIssue.createMany({
    data: structure.warnings.map((w) => ({ importJobId: jobId, sourceFile: job.originalFilename, severity: w.severity === "error" ? "error" as const : "warning" as const, code: "pdf_structure_warning", message: w.message, pageIndex: w.page_index ?? null })),
  });
  await db.importJob.update({ where: { id: jobId }, data: { status: "staged", stats: { ...(job.stats as object), structurePath, preview } as never } });
}

async function publishJob(db: Db, jobId: string) {
  const job = await db.importJob.findUniqueOrThrow({ where: { id: jobId } });
  if (job.jobType === "video_workbook") {
    await publishVideoWorkbookJob(db, jobId, { actorId: job.publishedById, deactivateReplaced: Boolean((job.stats as { deactivateReplaced?: boolean }).deactivateReplaced) });
  } else {
    const stats = job.stats as { structurePath: string };
    const structure = JSON.parse(await readFile(stats.structurePath, "utf8")) as HandbookStructure;
    await publishHandbook(db, { structure, filePath: job.storagePath, checksum: job.checksum, documentKey: `handbook-${job.language}`, actorId: job.publishedById, importJobId: jobId });
    if (job.language === "he") {
      const out = path.join(path.dirname(stats.structurePath), "scale_domains.json");
      await run(process.env.PYTHON_BIN || "python3", ["-X", "utf8", "ingestion/scale_domains.py", job.storagePath, out], { timeout: 10 * 60_000 }).then(
        () => applyScaleDomains(db, out, job.originalFilename),
        (err) => logger.warn({ err: (err as Error).message }, "worker: scale-domain extraction failed; domains unchanged"),
      );
    }
  }
  await linkSegmentsToExercises(db); // rebuild derived links for the new content
}

/** Process one job (or every runnable job when jobId is omitted). */
export async function runJobs(db: Db, jobId?: string) {
  const jobs = await db.importJob.findMany({
    where: { ...(jobId ? { id: jobId } : {}), OR: [{ jobType: "pdf_handbook", status: "queued" }, { status: "validated" }] },
    orderBy: { createdAt: "asc" },
  });
  for (const job of jobs) {
    try {
      if (job.status === "queued") await parsePdfJob(db, job.id);
      else await publishJob(db, job.id);
      logger.info({ jobId: job.id, type: job.jobType }, "worker: job done");
    } catch (err) {
      logger.error({ jobId: job.id, err: (err as Error).message }, "worker: job failed");
      await db.importJob.update({ where: { id: job.id }, data: { status: "failed", errorMessage: (err as Error).message.slice(0, 2000), finishedAt: new Date() } });
    }
  }
  return jobs.length;
}
