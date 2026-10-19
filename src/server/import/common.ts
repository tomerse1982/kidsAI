import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import type { Prisma as Db } from "@/server/prisma-factory";
import type { Prisma } from "@/generated/prisma/client";

export type Tx = Prisma.TransactionClient;

export async function sha256File(filePath: string): Promise<string> {
  return createHash("sha256").update(await readFile(filePath)).digest("hex");
}

export const hashText = (s: string) => createHash("sha256").update(s).digest("hex").slice(0, 32);

/**
 * Returns the source version for (document, checksum), creating the document and a
 * new version number when the file content is new. Re-importing an identical file
 * reuses the same version, which is what makes imports idempotent.
 */
export async function upsertSourceVersion(
  tx: Tx,
  doc: {
    documentKey: string; title: string; sourceType: "PDF" | "XLSX"; language: "he" | "ar" | "multilingual";
    originalFilename: string; storagePath: string; checksum: string; pageCount?: number | null; metadata?: Prisma.InputJsonValue;
  },
): Promise<{ documentId: string; versionId: string; versionNumber: number; isNewVersion: boolean }> {
  const document = await tx.sourceDocument.upsert({
    where: { documentKey: doc.documentKey },
    create: {
      documentKey: doc.documentKey, title: doc.title, sourceType: doc.sourceType, language: doc.language,
      originalFilename: doc.originalFilename, storagePath: doc.storagePath, checksum: doc.checksum,
    },
    update: {},
  });
  const existing = await tx.sourceVersion.findUnique({
    where: { sourceDocumentId_checksum: { sourceDocumentId: document.id, checksum: doc.checksum } },
  });
  if (existing) return { documentId: document.id, versionId: existing.id, versionNumber: existing.versionNumber, isNewVersion: false };
  const last = await tx.sourceVersion.findFirst({ where: { sourceDocumentId: document.id }, orderBy: { versionNumber: "desc" } });
  const version = await tx.sourceVersion.create({
    data: {
      sourceDocumentId: document.id, versionNumber: (last?.versionNumber ?? 0) + 1, checksum: doc.checksum,
      importStatus: "publishing", pageCount: doc.pageCount ?? null, metadata: doc.metadata ?? {},
    },
  });
  return { documentId: document.id, versionId: version.id, versionNumber: version.versionNumber, isNewVersion: true };
}

/** Marks a version as the document's current one (after a successful publish). */
export async function promoteVersion(tx: Tx, documentId: string, versionId: string, file: { originalFilename: string; storagePath: string; checksum: string }) {
  await tx.sourceVersion.update({ where: { id: versionId }, data: { importStatus: "published" } });
  await tx.sourceDocument.update({
    where: { id: documentId },
    data: { currentVersionId: versionId, originalFilename: file.originalFilename, storagePath: file.storagePath, checksum: file.checksum },
  });
}

export async function writeAudit(
  db: Tx | Db,
  entry: { actorId?: string | null; action: string; entityType: string; entityId?: string | null; before?: unknown; after?: unknown; reason?: string },
) {
  await db.adminAuditLog.create({
    data: {
      actorId: entry.actorId ?? null, action: entry.action, entityType: entry.entityType, entityId: entry.entityId ?? null,
      before: (entry.before ?? undefined) as Prisma.InputJsonValue | undefined,
      after: (entry.after ?? undefined) as Prisma.InputJsonValue | undefined,
      reason: entry.reason,
    },
  });
}

/**
 * When a newer import of a document is published, open issues of its earlier import
 * jobs are closed as superseded (kept for audit, no longer counted as unresolved).
 */
export async function supersedeOlderIssues(tx: Tx, documentId: string, currentJobId: string) {
  await tx.importIssue.updateMany({
    where: { isResolved: false, importJob: { sourceDocumentId: documentId, id: { not: currentJobId } } },
    data: { isResolved: true, resolvedAt: new Date(), resolutionNote: `superseded by import job ${currentJobId}` },
  });
}
