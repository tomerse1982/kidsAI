/**
 * Generic video-workbook import: importVideoWorkbook(file, language, mappingProfile).
 *
 *   stage   -> parse into import_row_records + import_issues, compute the diff
 *              against the database (insert / update / unchanged / conflict).
 *   publish -> transactional upsert of activities, videos and mappings.
 *
 * Mappings are keyed by `${language}:${subMilestone}:${videoId}`, so the Arabic and a
 * future Hebrew workbook coexist, and re-importing a workbook never duplicates rows.
 * Nothing is deleted automatically: mappings that disappear from a new workbook
 * version are reported for an admin decision.
 */
import path from "node:path";
import { ageGroupByChapter } from "@/lib/age-groups";
import { chapterOf, compareCodes } from "@/lib/codes";
import { youTubeUrls } from "@/lib/youtube";
import { embed, EMBEDDING_MODEL, toVectorLiteral } from "@/server/ai/embeddings";
import type { Prisma as Db } from "@/server/prisma-factory";
import { hashText, promoteVersion, supersedeOlderIssues, upsertSourceVersion, writeAudit, type Tx } from "../common";
import { parseVideoWorkbook } from "./parse";
import { parseSeriesWorkbook } from "./series";
import { matchBuiltinProfile, proposeProfiles, type ProfileProposal } from "./profiles";
import { readWorkbook } from "./readers";
import { AnyProfileSchema, isSeriesProfile, type AnyProfile, type NormalizedRow, type ParsedIssue, type ParseResult, type RawWorkbook, type VideoLang } from "./types";

/** Parse with the parser that matches the profile kind. */
export function parseAnyWorkbook(workbook: RawWorkbook, language: VideoLang, profile: AnyProfile): ParseResult {
  return isSeriesProfile(profile) ? parseSeriesWorkbook(workbook, language, profile) : parseVideoWorkbook(workbook, language, profile);
}

export interface StageOptions {
  filePath: string;
  language: VideoLang;
  profile?: AnyProfile | null;
  documentKey?: string;
  actorId?: string | null;
  checksum?: string;
}

export type StageResult =
  | { status: "needs_mapping"; jobId: string; proposals: ProfileProposal[] }
  | { status: "staged"; jobId: string; parse: Pick<ParseResult, "stats" | "missingMappings" | "workbook">; actions: Record<string, number>; issues: number };

const mappingKey = (lang: VideoLang, code: string, videoId: string) => `${lang}:${code}:${videoId}`;

/** Validation notes written after import (by admins / the YouTube check) that a re-import must keep. */
const PRESERVED_CHECKS = new Set(["admin_review", "youtube_title"]);

function mappingTypeFor(role: NormalizedRow["role"]): "milestone_overview" | "parent_guidance" | "exact_activity" {
  return role === "overview" ? "milestone_overview" : role === "parent_guidance" ? "parent_guidance" : "exact_activity";
}

export async function stageVideoWorkbook(db: Db, opts: StageOptions): Promise<StageResult> {
  const workbook = await readWorkbook(opts.filePath);
  const documentKey = opts.documentKey ?? `video-workbook-${opts.language}`;
  const profile = opts.profile ? (AnyProfileSchema.parse(opts.profile) as AnyProfile) : matchBuiltinProfile(workbook);

  const job = await db.importJob.create({
    data: {
      jobType: "video_workbook", status: "parsing", language: opts.language, originalFilename: path.basename(opts.filePath),
      storagePath: opts.filePath, checksum: workbook.sha256, createdById: opts.actorId ?? null, startedAt: new Date(),
      mappingProfile: (profile ?? undefined) as never, stats: { documentKey, reader: workbook.reader },
    },
  });

  if (!profile) {
    const proposals = proposeProfiles(workbook);
    await db.importJob.update({ where: { id: job.id }, data: { status: "queued", stats: { documentKey, reader: workbook.reader, proposals } as never } });
    return { status: "needs_mapping", jobId: job.id, proposals };
  }

  const parsed = parseAnyWorkbook(workbook, opts.language, profile);

  // Rows pointing at a milestone outside the handbook's age chapters cannot be placed: reject them
  // here (visible in the preview) instead of failing the whole publication later.
  const knownChapters = new Set((await db.ageGroup.findMany({ select: { chapterNumber: true } })).map((g) => g.chapterNumber));
  const knownMilestones = new Set((await db.milestone.findMany({ select: { milestoneCode: true } })).map((m) => m.milestoneCode));
  for (const r of parsed.rows) {
    if (r.status !== "valid" || !r.milestoneCode || knownMilestones.has(r.milestoneCode)) continue;
    if (!knownChapters.has(chapterOf(r.milestoneCode) ?? -1)) {
      r.status = "invalid";
      parsed.stats.valid--;
      parsed.stats.invalid++;
      parsed.issues.push({ severity: "error", code: "unknown_milestone", message: `${r.subMilestoneCode}: milestone ${r.milestoneCode} does not exist in the handbooks and has no age chapter; row not imported`, worksheet: r.worksheet, rowNumber: r.rowNumber });
    } else {
      parsed.issues.push({ severity: "warning", code: "milestone_not_in_handbook", message: `${r.subMilestoneCode}: milestone ${r.milestoneCode} is not in the handbooks; it will be created as a draft`, worksheet: r.worksheet, rowNumber: r.rowNumber });
    }
  }
  const validRows = parsed.rows.filter((r) => r.status === "valid");
  for (const [key, conf] of [["verified", "verified"], ["conflict", "conflict"], ["needsReview", "needs_review"], ["sourceAsserted", "source_asserted"]] as const) {
    parsed.stats[key] = validRows.filter((r) => r.confidence === conf).length;
  }

  // diff against current database state
  const keys = parsed.rows.filter((r) => r.status === "valid").map((r) => mappingKey(opts.language, r.subMilestoneCode!, r.videoId!));
  const existing = await db.activityVideoMapping.findMany({
    where: { OR: [{ mappingKey: { in: keys } }, { language: opts.language, sourceDocument: { documentKey } }] },
    include: { activity: { select: { activityCode: true } }, video: { select: { providerVideoId: true } } },
  });
  const byKey = new Map(existing.map((m) => [m.mappingKey, m]));
  const bySub = new Map<string, typeof existing>();
  for (const m of existing) {
    const code = m.activity?.activityCode;
    if (code) bySub.set(code, [...(bySub.get(code) ?? []), m]);
  }

  const actions: Record<string, number> = { insert: 0, update: 0, unchanged: 0, conflict: 0, none: 0 };
  const rowRecords = parsed.rows.map((r) => {
    let action: "insert" | "update" | "unchanged" | "conflict" | "none" = "none";
    const messages = [...r.messages];
    let targetKey: string | null = null;
    if (r.status === "valid") {
      targetKey = mappingKey(opts.language, r.subMilestoneCode!, r.videoId!);
      const current = byKey.get(targetKey);
      if (current) {
        action = current.sourceRowNumber === r.rowNumber && current.sourceSheet === r.worksheet && current.rawCorrelationText === r.correlationText ? "unchanged" : "update";
      } else {
        const others = (bySub.get(r.subMilestoneCode!) ?? []).filter((m) => m.isActive && m.language === opts.language && m.audience === r.audience);
        if (others.length) {
          action = "conflict";
          messages.push(`sub-milestone already mapped to ${others.map((o) => o.video.providerVideoId).join(", ")} in ${opts.language}`);
        } else action = "insert";
      }
    }
    actions[action]++;
    return {
      importJobId: job.id, worksheet: r.raw.column ? `${r.worksheet}!${String(r.raw.column)}` : r.worksheet, rowNumber: r.rowNumber, raw: r.raw as never,
      normalized: r as never, status: r.status, action, targetKey, messages: messages as never,
    };
  });

  // published mappings of this document that are absent from the new file
  const newKeys = new Set(keys);
  const absent = existing.filter((m) => m.language === opts.language && m.isActive && !newKeys.has(m.mappingKey));
  const issues: ParsedIssue[] = [
    ...parsed.issues,
    ...absent.map((m) => ({
      severity: "warning" as const, code: "mapping_absent_in_new_version",
      message: `Published mapping ${m.mappingKey} (row ${m.sourceRowNumber}) is not in this workbook; it stays active until an admin deactivates it`,
      worksheet: m.sourceSheet, rowNumber: m.sourceRowNumber,
    })),
  ];

  await db.$transaction([
    db.importRowRecord.createMany({ data: rowRecords }),
    db.importIssue.createMany({
      data: issues.map((i) => ({
        importJobId: job.id, sourceFile: workbook.file, worksheet: i.worksheet ?? null, rowNumber: i.rowNumber ?? null,
        severity: i.severity, code: i.code, message: i.message, details: (i.details ?? {}) as never,
      })),
    }),
    db.importJob.update({
      where: { id: job.id },
      data: {
        status: issues.some((i) => i.severity === "critical") ? "failed" : "staged",
        stats: { documentKey, reader: workbook.reader, ...parsed.stats, actions, absent: absent.length, sheets: parsed.workbook.sheets, missingMappings: parsed.missingMappings } as never,
      },
    }),
  ]);
  return { status: "staged", jobId: job.id, parse: { stats: parsed.stats, missingMappings: parsed.missingMappings, workbook: parsed.workbook }, actions, issues: issues.length };
}

export interface PublishOptions {
  actorId?: string | null;
  /** Deactivate (not delete) other active mappings of a sub-milestone whose video changed. */
  deactivateReplaced?: boolean;
}

export async function publishVideoWorkbookJob(db: Db, jobId: string, opts: PublishOptions = {}) {
  const job = await db.importJob.findUniqueOrThrow({ where: { id: jobId } });
  if (job.jobType !== "video_workbook") throw new Error("not a video workbook job");
  if (job.status !== "staged" && job.status !== "validated") throw new Error(`job is ${job.status}; only staged jobs can be published`);
  const language = job.language as VideoLang;
  const profile = AnyProfileSchema.parse(job.mappingProfile) as AnyProfile;
  const stats = job.stats as Record<string, unknown>;
  const documentKey = String(stats.documentKey ?? `video-workbook-${language}`);
  const rows = (await db.importRowRecord.findMany({ where: { importJobId: jobId, status: "valid" }, orderBy: { rowNumber: "asc" } }))
    .map((r) => r.normalized as unknown as NormalizedRow);

  // Retrieval chunks for each video segment (titles in each language present). Embedded outside the tx.
  const segChunks: { code: string; lang: "he" | "ar"; text: string; milestoneCode: string }[] = [];
  for (const r of rows) {
    if (r.activityHe) segChunks.push({ code: r.subMilestoneCode!, lang: "he", milestoneCode: r.milestoneCode!, text: `${r.milestoneNameHe ?? r.milestoneCode} — ${r.activityHe}` });
    if (r.activityAr) segChunks.push({ code: r.subMilestoneCode!, lang: "ar", milestoneCode: r.milestoneCode!, text: `${r.milestoneNameAr ?? r.milestoneCode} — ${r.activityAr}` });
  }
  const vectors = await embed(segChunks.map((c) => c.text), "passage");

  await db.importJob.update({ where: { id: jobId }, data: { status: "publishing" } });
  try {
    const result = await db.$transaction(async (tx: Tx) => {
      const v = await upsertSourceVersion(tx, {
        documentKey, title: job.originalFilename, sourceType: "XLSX", language: "multilingual",
        originalFilename: job.originalFilename, storagePath: job.storagePath, checksum: job.checksum,
        metadata: { profile: profile.id, videoLanguage: language } as never,
      });

      const counters = { milestonesCreated: 0, activities: 0, videosCreated: 0, videoLanguageConflicts: 0, mappingsInserted: 0, mappingsUpdated: 0, mappingsUnchanged: 0, deactivated: 0, translations: 0 };
      const ageGroups = new Map((await tx.ageGroup.findMany()).map((g) => [g.chapterNumber, g.id]));
      const milestoneIds = new Map((await tx.milestone.findMany({ select: { id: true, milestoneCode: true } })).map((m) => [m.milestoneCode, m.id]));
      const excelNameDone = new Set<string>();

      for (const r of [...rows].sort((a, b) => compareCodes(a.subMilestoneCode!, b.subMilestoneCode!))) {
        const code = r.subMilestoneCode!;
        const mCode = r.milestoneCode!;
        // milestone must exist (normally created from the handbooks); create a draft otherwise
        let milestoneId = milestoneIds.get(mCode);
        if (!milestoneId) {
          const chapter = chapterOf(mCode)!;
          const ag = ageGroups.get(chapter) ?? ageGroups.get(ageGroupByChapter(chapter)?.chapter ?? -1);
          if (!ag) throw new Error(`no age group for milestone ${mCode}; import the handbooks first`);
          const [c, n] = mCode.split(".").map(Number);
          const created = await tx.milestone.create({ data: { milestoneCode: mCode, ageGroupId: ag, displayOrder: c * 100 + n, status: "draft" } });
          milestoneId = created.id;
          milestoneIds.set(mCode, milestoneId);
          counters.milestonesCreated++;
          await tx.importIssue.create({ data: { importJobId: jobId, sourceFile: job.originalFilename, worksheet: r.worksheet, rowNumber: r.rowNumber, severity: "warning", code: "milestone_not_in_handbook", message: `Milestone ${mCode} not found in the handbooks; created as draft` } });
        }

        // Excel milestone names as alternate (non-primary) translations, once per milestone
        if (!excelNameDone.has(mCode)) {
          excelNameDone.add(mCode);
          for (const [lang, title] of [["he", r.milestoneNameHe], ["ar", r.milestoneNameAr]] as const) {
            if (!title) continue;
            await tx.milestoneTranslation.upsert({
              where: { milestoneId_language_sourceVersionId: { milestoneId, language: lang, sourceVersionId: v.versionId } },
              create: { milestoneId, language: lang, sourceVersionId: v.versionId, title, sourceAgeText: r.ageRaw, sourceOrigin: "excel", isPrimary: false },
              update: { title, sourceAgeText: r.ageRaw },
            });
          }
        }

        const sourceAttributes = {
          audienceText: r.audienceRaw, ageText: r.ageRaw, correlation: r.correlationText, originalTitle: r.originalTitle,
          milestoneCodeSource: r.milestoneCodeSource, sheet: r.worksheet, row: r.rowNumber,
        };
        const activity = await tx.activity.upsert({
          where: { activityCode: code },
          create: { milestoneId, activityCode: code, sequenceNumber: r.sequence!, activityType: "video_segment", role: r.role, audience: r.audience, sourceAttributes },
          // A workbook without titles (e.g. the Hebrew series sheets) only adds videos: it must not
          // overwrite the role / audience / attributes defined by the workbook that describes the segment.
          update: r.activityHe || r.activityAr ? { role: r.role, audience: r.audience, sourceAttributes } : {},
        });
        counters.activities++;
        for (const [lang, title] of [["he", r.activityHe], ["ar", r.activityAr]] as const) {
          if (!title) continue;
          await tx.activityTranslation.upsert({
            where: { activityId_language_sourceVersionId: { activityId: activity.id, language: lang, sourceVersionId: v.versionId } },
            create: { activityId: activity.id, language: lang, sourceVersionId: v.versionId, title, description: title, sourceOrigin: "excel" },
            update: { title, description: title },
          });
          counters.translations++;
        }

        // video: never relabel an existing video's language silently
        const urls = youTubeUrls(r.videoId!);
        const evidence = [
          { source: "workbook_language_parameter", value: language },
          ...(r.originalTitle ? [{ source: "original_title_prefix", value: r.originalTitle }] : []),
          ...r.validation.filter((x) => x.result === "match" && /list|series/.test(x.check)).map((x) => ({ source: x.check, value: x.detail })),
        ];
        let video = await tx.video.findUnique({ where: { provider_providerVideoId: { provider: "youtube", providerVideoId: r.videoId! } } });
        if (!video) {
          video = await tx.video.create({
            data: {
              provider: "youtube", providerVideoId: r.videoId!, canonicalUrl: urls.canonicalUrl, embedUrl: urls.embedUrl, title: r.originalTitle, language,
              languageEvidence: evidence as never, languageStatus: "source_metadata", videoType: r.audience === "parent" ? "instructional_parent" : "instructional_educator",
            },
          });
          counters.videosCreated++;
        } else if (video.language !== language && video.language !== "unknown") {
          counters.videoLanguageConflicts++;
          await tx.importIssue.create({ data: { importJobId: jobId, sourceFile: job.originalFilename, worksheet: r.worksheet, rowNumber: r.rowNumber, severity: "error", code: "video_language_conflict", message: `Video ${r.videoId} is labelled ${video.language} but this workbook imports it as ${language}; label kept, mapping flagged` } });
        } else if (video.language === "unknown") {
          video = await tx.video.update({ where: { id: video.id }, data: { language, languageEvidence: evidence as never } });
        }

        const key = mappingKey(language, code, r.videoId!);
        const data = {
          milestoneId, activityId: activity.id, videoId: video.id, language, audience: r.audience,
          mappingType: r.activityHe || r.activityAr ? mappingTypeFor(r.role) : mappingTypeFor(activity.role as NormalizedRow["role"]),
          sourceDocumentId: v.documentId, sourceVersionId: v.versionId, sourceSheet: r.worksheet, sourceRowNumber: r.rowNumber,
          rawMilestoneCode: r.raw.milestone === null || r.raw.milestone === undefined ? null : String(r.raw.milestone),
          rawSubMilestoneCode: r.subMilestoneCode, rawCorrelationText: r.correlationText, rawVideoValue: r.videoRaw,
          confidenceStatus: r.confidence, validationNotes: r.validation as never,
        };
        const current = await tx.activityVideoMapping.findUnique({ where: { mappingKey: key } });
        if (!current) {
          await tx.activityVideoMapping.create({ data: { mappingKey: key, ...data } });
          counters.mappingsInserted++;
        } else {
          // keep is_active as decided by admins; refresh provenance to the newest version, but never
          // drop evidence added after import (admin decisions, YouTube title check) or the admin's verdict
          const kept = (current.validationNotes as { check: string; result: string }[]).filter((n) => PRESERVED_CHECKS.has(n.check));
          const adminDecided = kept.some((n) => n.check === "admin_review");
          const titleMismatch = kept.some((n) => n.check === "youtube_title" && n.result === "mismatch");
          const confidenceStatus = adminDecided
            ? current.confidenceStatus
            : titleMismatch && data.confidenceStatus !== "conflict" ? "needs_review" : data.confidenceStatus;
          await tx.activityVideoMapping.update({
            where: { id: current.id },
            data: { ...data, confidenceStatus, validationNotes: [...(r.validation as object[]), ...kept] as never },
          });
          if (current.sourceRowNumber === r.rowNumber && current.sourceSheet === r.worksheet) counters.mappingsUnchanged++;
          else counters.mappingsUpdated++;
        }
        if (opts.deactivateReplaced) {
          // only the same audience: a parent version never replaces the educator version
          const replaced = await tx.activityVideoMapping.findMany({ where: { activityId: activity.id, language, audience: r.audience, isActive: true, NOT: { mappingKey: key } } });
          for (const old of replaced) {
            await tx.activityVideoMapping.update({ where: { id: old.id }, data: { isActive: false } });
            await writeAudit(tx, { actorId: opts.actorId, action: "mapping.deactivate_replaced", entityType: "activity_video_mapping", entityId: old.id, before: { isActive: true, mappingKey: old.mappingKey }, after: { isActive: false, replacedBy: key } });
            counters.deactivated++;
          }
        }
      }

      // video-segment retrieval chunks for this workbook version
      const keep: string[] = [];
      const activityIds = new Map((await tx.activity.findMany({ where: { activityType: "video_segment" }, select: { id: true, activityCode: true } })).map((a) => [a.activityCode, a.id]));
      for (let i = 0; i < segChunks.length; i++) {
        const c = segChunks[i];
        const contentHash = hashText(`video_segment|${c.code}|${c.lang}|${c.text}`);
        keep.push(contentHash);
        const chunk = await tx.knowledgeChunk.upsert({
          where: { sourceVersionId_contentHash: { sourceVersionId: v.versionId, contentHash } },
          create: {
            sourceVersionId: v.versionId, milestoneId: milestoneIds.get(c.milestoneCode)!, activityId: activityIds.get(c.code)!, language: c.lang,
            chunkType: "video_segment", textContent: c.text, contentHash, metadata: { milestoneCode: c.milestoneCode, activityCode: c.code, source: "excel" },
          },
          update: {},
        });
        await tx.$executeRawUnsafe(`UPDATE knowledge_chunks SET embedding = $1::vector, embedding_model = $2 WHERE id = $3::uuid`, toVectorLiteral(vectors[i]), EMBEDDING_MODEL, chunk.id);
      }
      await tx.knowledgeChunk.deleteMany({ where: { sourceVersionId: v.versionId, contentHash: { notIn: keep } } });

      await promoteVersion(tx, v.documentId, v.versionId, { originalFilename: job.originalFilename, storagePath: job.storagePath, checksum: job.checksum });
      await tx.importJob.update({
        where: { id: jobId },
        data: { status: "published", sourceDocumentId: v.documentId, sourceVersionId: v.versionId, finishedAt: new Date(), publishedById: opts.actorId ?? null, stats: { ...stats, published: counters, versionNumber: v.versionNumber } as never },
      });
      await tx.importIssue.updateMany({ where: { importJobId: jobId }, data: { sourceDocumentId: v.documentId } });
      await supersedeOlderIssues(tx, v.documentId, jobId);
      await writeAudit(tx, { actorId: opts.actorId, action: "import.publish_video_workbook", entityType: "import_job", entityId: jobId, after: { ...counters, language, versionId: v.versionId } });
      return { jobId, versionId: v.versionId, ...counters };
    }, { timeout: 600_000, maxWait: 30_000 });
    return result;
  } catch (err) {
    await db.importJob.update({ where: { id: jobId }, data: { status: "failed", errorMessage: (err as Error).message.slice(0, 2000), finishedAt: new Date() } });
    throw err;
  }
}

/** One-shot API (CLI / tests): stage, refuse on critical issues or unmapped layout, then publish. */
export async function importVideoWorkbook(
  db: Db, file: string, language: VideoLang, mappingProfile?: AnyProfile | null, opts: { actorId?: string | null; documentKey?: string; publish?: boolean } = {},
) {
  const staged = await stageVideoWorkbook(db, { filePath: file, language, profile: mappingProfile, actorId: opts.actorId, documentKey: opts.documentKey });
  if (staged.status !== "staged") return { staged, published: null };
  const job = await db.importJob.findUniqueOrThrow({ where: { id: staged.jobId } });
  if (job.status !== "staged" || opts.publish === false) return { staged, published: null };
  const published = await publishVideoWorkbookJob(db, staged.jobId, { actorId: opts.actorId });
  return { staged, published };
}
