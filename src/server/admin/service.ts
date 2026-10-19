/** Admin data services. Every mutation writes an admin_audit_log entry in the same transaction. */
import { compareCodes, MILESTONE_CODE, SUB_MILESTONE_CODE } from "@/lib/codes";
import { parseYouTube, youTubeUrls } from "@/lib/youtube";
import type { Prisma as Db } from "@/server/prisma-factory";
import { writeAudit } from "@/server/import/common";

export async function contentOverview(db: Db) {
  const current = (await db.sourceDocument.findMany({ select: { currentVersionId: true, documentKey: true } }));
  const versionOf = (key: string) => current.find((d) => d.documentKey === key)?.currentVersionId ?? "00000000-0000-0000-0000-000000000000";
  const [
    milestones, subMilestones, exercises, heSections, arSections, arVideos, heVideos, unknownVideos,
    activeMappings, reviewMappings, conflictMappings, unresolved, linksReview, milestonesWithoutVideo, missingVideoIssues,
  ] = await Promise.all([
    db.milestone.count(),
    db.activity.count({ where: { activityType: "video_segment" } }),
    db.activity.count({ where: { activityType: "handbook_exercise" } }),
    db.knowledgeChunk.count({ where: { language: "he", sourceVersionId: versionOf("handbook-he") } }),
    db.knowledgeChunk.count({ where: { language: "ar", sourceVersionId: versionOf("handbook-ar") } }),
    db.video.count({ where: { language: "ar" } }),
    db.video.count({ where: { language: "he" } }),
    db.video.count({ where: { language: "unknown" } }),
    db.activityVideoMapping.count({ where: { isActive: true } }),
    db.activityVideoMapping.count({ where: { isActive: true, confidenceStatus: "needs_review" } }),
    db.activityVideoMapping.count({ where: { isActive: true, confidenceStatus: "conflict" } }),
    db.importIssue.groupBy({ by: ["severity"], where: { isResolved: false }, _count: true }),
    db.activityLink.count({ where: { linkType: "requires_review" } }),
    db.milestone.count({ where: { mappings: { none: { isActive: true } } } }),
    db.importIssue.count({ where: { code: "missing_video_mapping", isResolved: false } }),
  ]);
  const jobs = await db.importJob.findMany({ orderBy: { createdAt: "desc" }, take: 8, select: { id: true, jobType: true, status: true, language: true, originalFilename: true, createdAt: true, finishedAt: true } });
  return {
    milestones, subMilestones, exercises,
    handbookSections: { he: heSections, ar: arSections },
    videos: { ar: arVideos, he: heVideos, unknown: unknownVideos },
    mappings: { active: activeMappings, needsReview: reviewMappings, conflict: conflictMappings },
    missing: { milestonesWithoutVideo, subMilestonesWithoutVideo: missingVideoIssues },
    ambiguous: { segmentExerciseLinks: linksReview, mappings: reviewMappings + conflictMappings },
    unresolvedIssues: Object.fromEntries(unresolved.map((u) => [u.severity, u._count])),
    recentJobs: jobs,
  };
}

/** Mapping manager: every sub-milestone of a milestone with its Arabic / Hebrew videos. */
export async function mappingsForMilestone(db: Db, code: string) {
  if (!MILESTONE_CODE.test(code)) throw new Error("invalid milestone code");
  const milestone = await db.milestone.findUnique({
    where: { milestoneCode: code },
    include: { translations: { where: { isPrimary: true } }, ageGroup: true },
  });
  if (!milestone) return null;
  const segments = await db.activity.findMany({
    where: { milestoneId: milestone.id, activityType: "video_segment" },
    include: {
      translations: { orderBy: { createdAt: "desc" } },
      mappings: { include: { video: true, sourceDocument: { select: { title: true, documentKey: true } } }, orderBy: { createdAt: "asc" } },
      linksFrom: { include: { exercise: { select: { activityCode: true } } } },
    },
  });
  return {
    milestone: {
      code: milestone.milestoneCode, domain: milestone.developmentDomain, ageGroup: milestone.ageGroup.code,
      titleHe: milestone.translations.find((t) => t.language === "he")?.title ?? null,
      titleAr: milestone.translations.find((t) => t.language === "ar")?.title ?? null,
    },
    rows: segments.sort((a, b) => compareCodes(a.activityCode, b.activityCode)).map((s) => ({
      activityId: s.id,
      code: s.activityCode,
      role: s.role,
      audience: s.audience,
      titleHe: s.translations.find((t) => t.language === "he")?.title ?? null,
      titleAr: s.translations.find((t) => t.language === "ar")?.title ?? null,
      sourceAttributes: s.sourceAttributes,
      links: s.linksFrom.map((l) => ({ exercise: l.exercise.activityCode, type: l.linkType, score: l.score, method: l.method })),
      mappings: s.mappings.map((m) => ({
        id: m.id, language: m.language, isActive: m.isActive, mappingType: m.mappingType, confidence: m.confidenceStatus,
        videoId: m.video.providerVideoId, url: m.video.canonicalUrl, embedUrl: m.video.embedUrl, availability: m.video.availabilityStatus,
        source: { document: m.sourceDocument.title, documentKey: m.sourceDocument.documentKey, sheet: m.sourceSheet, row: m.sourceRowNumber },
        raw: { milestone: m.rawMilestoneCode, subMilestone: m.rawSubMilestoneCode, correlation: m.rawCorrelationText, video: m.rawVideoValue },
        validation: m.validationNotes,
      })),
    })),
  };
}

export async function updateMapping(
  db: Db, actorId: string, id: string,
  patch: { isActive?: boolean; confidenceStatus?: "verified" | "source_asserted" | "needs_review" | "conflict"; mappingType?: "exact_activity" | "milestone_overview" | "parent_guidance" | "supporting_instruction" | "requires_review" },
  reason: string,
) {
  return db.$transaction(async (tx) => {
    const before = await tx.activityVideoMapping.findUniqueOrThrow({ where: { id } });
    // record the decision as evidence, so a later re-import keeps it (see workbook/service.ts)
    const notes = (before.validationNotes as { check: string }[]).filter((n) => n.check !== "admin_review");
    const decision = { check: "admin_review", result: patch.confidenceStatus === "verified" ? "match" : "mismatch", detail: `${new Date().toISOString().slice(0, 10)}: ${reason}` };
    const after = await tx.activityVideoMapping.update({
      where: { id },
      data: { ...patch, ...(patch.confidenceStatus || patch.mappingType ? { validationNotes: [...notes, decision] as never } : {}) },
    });
    await writeAudit(tx, {
      actorId, action: "mapping.update", entityType: "activity_video_mapping", entityId: id, reason,
      before: { isActive: before.isActive, confidenceStatus: before.confidenceStatus, mappingType: before.mappingType },
      after: { isActive: after.isActive, confidenceStatus: after.confidenceStatus, mappingType: after.mappingType },
    });
    return after;
  });
}

/** Manual video relationship (e.g. a corrected link). Recorded as sheet "manual". */
export async function addManualMapping(db: Db, actorId: string, input: { activityCode: string; video: string; language: "he" | "ar"; reason: string }) {
  if (!SUB_MILESTONE_CODE.test(input.activityCode)) throw new Error("activity code must be a sub-milestone (n.n.n)");
  const yt = parseYouTube(input.video);
  if (!yt.ok) throw new Error("invalid YouTube URL or id");
  return db.$transaction(async (tx) => {
    const activity = await tx.activity.findUniqueOrThrow({ where: { activityCode: input.activityCode } });
    const urls = youTubeUrls(yt.id);
    const video = await tx.video.upsert({
      where: { provider_providerVideoId: { provider: "youtube", providerVideoId: yt.id } },
      create: { provider: "youtube", providerVideoId: yt.id, canonicalUrl: urls.canonicalUrl, embedUrl: urls.embedUrl, language: input.language, languageEvidence: [{ source: "manual", value: input.language }] },
      update: {},
    });
    const doc = await tx.sourceDocument.upsert({
      where: { documentKey: "manual-admin" },
      create: { documentKey: "manual-admin", title: "Manual admin mappings", sourceType: "XLSX", language: "multilingual", originalFilename: "-", storagePath: "-", checksum: "-" },
      update: {},
    });
    let version = await tx.sourceVersion.findFirst({ where: { sourceDocumentId: doc.id } });
    version ??= await tx.sourceVersion.create({ data: { sourceDocumentId: doc.id, versionNumber: 1, checksum: "manual", importStatus: "published" } });
    const mapping = await tx.activityVideoMapping.create({
      data: {
        mappingKey: `${input.language}:${input.activityCode}:${yt.id}`, milestoneId: activity.milestoneId, activityId: activity.id, videoId: video.id,
        language: input.language, mappingType: "exact_activity", sourceDocumentId: doc.id, sourceVersionId: version.id, sourceSheet: "manual",
        sourceRowNumber: 0, rawSubMilestoneCode: input.activityCode, rawVideoValue: input.video, confidenceStatus: "verified",
        validationNotes: [{ check: "manual_entry", result: "match", detail: input.reason }],
      },
    });
    await writeAudit(tx, { actorId, action: "mapping.create_manual", entityType: "activity_video_mapping", entityId: mapping.id, after: { mappingKey: mapping.mappingKey }, reason: input.reason });
    return mapping;
  });
}

export async function listIssues(db: Db, filter: { severity?: string; code?: string; resolved?: boolean; jobId?: string; take?: number }) {
  return db.importIssue.findMany({
    where: {
      ...(filter.severity ? { severity: filter.severity as never } : {}),
      ...(filter.code ? { code: filter.code } : {}),
      ...(filter.resolved !== undefined ? { isResolved: filter.resolved } : {}),
      ...(filter.jobId ? { importJobId: filter.jobId } : {}),
    },
    orderBy: [{ severity: "desc" }, { createdAt: "desc" }],
    take: filter.take ?? 200,
  });
}

export async function resolveIssue(db: Db, actorId: string, id: string, note: string) {
  return db.$transaction(async (tx) => {
    const issue = await tx.importIssue.update({ where: { id }, data: { isResolved: true, resolvedById: actorId, resolvedAt: new Date(), resolutionNote: note } });
    await writeAudit(tx, { actorId, action: "issue.resolve", entityType: "import_issue", entityId: id, after: { code: issue.code }, reason: note });
    return issue;
  });
}

// ------------------------------------------------------------ review queue ----

/** Everything that waits for an editor: derived links, flagged handbook texts, mappings to check. */
export async function reviewQueue(db: Db, opts: { take?: number } = {}) {
  const current = (await db.sourceDocument.findMany({ select: { currentVersionId: true } })).map((d) => d.currentVersionId).filter((x): x is string => Boolean(x));
  const [links, linkCount, translations, mappings] = await Promise.all([
    db.activityLink.findMany({
      where: { linkType: "requires_review", method: { not: "manual" } },
      include: {
        segment: { include: { translations: { where: { sourceVersionId: { in: current } } }, milestone: { select: { milestoneCode: true } } } },
        exercise: { include: { translations: { where: { sourceVersionId: { in: current } } } } },
      },
      orderBy: [{ score: "desc" }],
      take: opts.take ?? 50,
    }),
    db.activityLink.count({ where: { linkType: "requires_review", method: { not: "manual" } } }),
    db.milestoneTranslation.findMany({
      where: { sourceOrigin: "pdf", isPrimary: true, contentReviewStatus: "needs_review" },
      include: { milestone: { select: { milestoneCode: true } } },
      orderBy: [{ milestone: { displayOrder: "asc" } }, { language: "asc" }],
    }),
    db.activityVideoMapping.findMany({
      where: { isActive: true, confidenceStatus: { in: ["needs_review", "conflict"] } },
      include: { activity: { select: { activityCode: true } }, video: { select: { providerVideoId: true, providerTitle: true, title: true } } },
      orderBy: { sourceRowNumber: "asc" },
    }),
  ]);
  const title = (ts: { language: string; title: string }[], lang: "he" | "ar") => ts.find((t) => t.language === lang)?.title ?? null;
  return {
    links: {
      total: linkCount,
      items: links.map((l) => ({
        id: l.id, milestone: l.segment.milestone.milestoneCode, score: l.score,
        segment: { code: l.segment.activityCode, he: title(l.segment.translations, "he"), ar: title(l.segment.translations, "ar") },
        exercise: { code: l.exercise.activityCode, he: title(l.exercise.translations, "he"), ar: title(l.exercise.translations, "ar") },
      })),
    },
    translations: translations.map((t) => ({
      id: t.id, milestone: t.milestone.milestoneCode, language: t.language, title: t.title,
      explanation: t.developmentalExplanation, expectedAge: t.expectedAgeText,
    })),
    mappings: mappings.map((m) => ({
      id: m.id, code: m.activity?.activityCode, videoId: m.video.providerVideoId, confidence: m.confidenceStatus,
      workbookTitle: m.video.title, youtubeTitle: m.video.providerTitle, sheet: m.sourceSheet, row: m.sourceRowNumber, notes: m.validationNotes,
    })),
  };
}

/**
 * Decide a derived segment↔exercise link. The decision is stored as a manual link (method "manual"),
 * which the automatic linker never deletes or overrides. Rejected links stay as evidence with
 * confidence "conflict" and are never shown to educators.
 */
export async function decideLink(db: Db, actorId: string, id: string, decision: "approve" | "reject", reason: string) {
  return db.$transaction(async (tx) => {
    const before = await tx.activityLink.findUniqueOrThrow({ where: { id } });
    const after = await tx.activityLink.update({
      where: { id },
      data: decision === "approve"
        ? { linkType: "exact_activity", confidence: "verified", method: "manual" }
        : { linkType: "requires_review", confidence: "conflict", method: "manual" },
    });
    await writeAudit(tx, { actorId, action: `link.${decision}`, entityType: "activity_link", entityId: id, before: { linkType: before.linkType, method: before.method, score: before.score }, after: { linkType: after.linkType, confidence: after.confidence }, reason });
    return after;
  });
}

/**
 * Decide a flagged handbook text. Approve: the intro may be used as the summary again.
 * Reject: the text stays stored verbatim (source fidelity) but is not used as a summary or shown as the explanation.
 */
export async function decideTranslation(db: Db, actorId: string, id: string, decision: "approve" | "reject", reason: string) {
  return db.$transaction(async (tx) => {
    const before = await tx.milestoneTranslation.findUniqueOrThrow({ where: { id } });
    const after = await tx.milestoneTranslation.update({
      where: { id },
      data: { contentReviewStatus: decision === "approve" ? "approved" : "rejected", summary: decision === "approve" ? before.developmentalExplanation : null },
    });
    await writeAudit(tx, { actorId, action: `translation.${decision}`, entityType: "milestone_translation", entityId: id, before: { status: before.contentReviewStatus }, after: { status: after.contentReviewStatus }, reason });
    return after;
  });
}
