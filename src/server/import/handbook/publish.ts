/**
 * Publishes one handbook edition (structure JSON from the PDF pipeline) into the
 * canonical database. The PDF is authoritative for educational content: milestone
 * translations, handbook exercises, page references and retrieval chunks.
 */
import path from "node:path";
import { AGE_GROUPS, ageGroupByChapter } from "@/lib/age-groups";
import { compareCodes } from "@/lib/codes";
import { cosine, embed, EMBEDDING_MODEL, toVectorLiteral } from "@/server/ai/embeddings";
import { logger } from "@/server/logger";
import type { Prisma as Db } from "@/server/prisma-factory";
import { hashText, promoteVersion, supersedeOlderIssues, upsertSourceVersion, writeAudit, type Tx } from "../common";
import type { HandbookMilestone, HandbookStructure } from "./types";

export interface PublishHandbookInput {
  structure: HandbookStructure;
  filePath: string;
  checksum: string;
  documentKey?: string;
  title?: string;
  actorId?: string | null;
  importJobId?: string | null;
}

interface ExercisePlan {
  milestoneCode: string;
  sequence: number;
  activityCode: string;
  aligned: "new_canonical" | "positional_verified" | "positional_flagged" | "language_specific";
  item: HandbookMilestone["activities"][number];
  similarity?: number;
}

interface ChunkPlan {
  milestoneCode: string;
  activityCode: string | null;
  chunkType: string;
  text: string;
  metadata: Record<string, unknown>;
}

const SECTION_LABELS = {
  he: { when: "מתי זה קורה?", how: "איך אנחנו יכולים לעזור?", remember: "זכרו!" },
  ar: { when: "متى يحصل الأمر؟", how: "كيف نستطيع المساعدة؟", remember: "تذكروا!" },
};

function firstSentence(text: string): string {
  const m = /^(.{20,220}?[.!?؟])(\s|$)/u.exec(text);
  return (m ? m[1] : text.slice(0, 200)).trim();
}

/** Decide activity codes for this edition's exercises, aligning with existing canonical exercises. */
async function planExercises(db: Db, structure: HandbookStructure): Promise<{ plans: ExercisePlan[]; notes: { code: string; message: string; severity: "info" | "warning" }[] }> {
  const lang = structure.language;
  const plans: ExercisePlan[] = [];
  const notes: { code: string; message: string; severity: "info" | "warning" }[] = [];

  const existing = await db.activity.findMany({
    where: { activityType: "handbook_exercise", milestone: { milestoneCode: { in: structure.milestones.map((m) => m.code) } } },
    include: { milestone: { select: { milestoneCode: true } }, translations: { orderBy: { createdAt: "desc" } } },
  });
  const byMilestone = new Map<string, typeof existing>();
  for (const a of existing) {
    const k = a.milestone.milestoneCode;
    byMilestone.set(k, [...(byMilestone.get(k) ?? []), a]);
  }

  for (const m of structure.milestones) {
    // canonical (language-neutral) exercises only; language-specific ones belong to one edition
    const canonical = (byMilestone.get(m.code) ?? [])
      .filter((a) => !/-(he|ar)$/.test(a.activityCode))
      .sort((a, b) => a.sequenceNumber - b.sequenceNumber);
    const ownSpecific = (byMilestone.get(m.code) ?? []).filter((a) => a.activityCode.endsWith(`-${lang}`));

    if (!canonical.length) {
      m.activities.forEach((item) => plans.push({ milestoneCode: m.code, sequence: item.sequence, activityCode: `${m.code}-E${item.sequence}`, aligned: "new_canonical", item }));
      continue;
    }
    const sameLang = canonical.every((a) => a.translations.some((t) => t.language === lang && t.sourceOrigin === "pdf"));
    if (canonical.length === m.activities.length) {
      // Same number of bullets in both editions: align by position, then verify with
      // embeddings that each position's best match is itself (or within a small margin).
      const refTexts = canonical.map((a) => {
        const t = a.translations.find((x) => x.language === lang && x.sourceOrigin === "pdf") ?? a.translations.find((x) => x.sourceOrigin === "pdf") ?? a.translations[0];
        return `${t?.title ?? ""}: ${(t?.instructions ?? "").slice(0, 300)}`;
      });
      const newTexts = m.activities.map((x) => `${x.title}: ${x.text.slice(0, 300)}`);
      const [refVecs, newVecs] = await Promise.all([embed(refTexts, "passage"), embed(newTexts, "passage")]);
      m.activities.forEach((item, i) => {
        const row = refVecs.map((rv) => cosine(newVecs[i], rv));
        const diag = row[i];
        const best = Math.max(...row);
        const ok = sameLang ? diag >= best - 0.005 : diag >= best - 0.02;
        plans.push({ milestoneCode: m.code, sequence: canonical[i].sequenceNumber, activityCode: canonical[i].activityCode, aligned: ok ? "positional_verified" : "positional_flagged", item, similarity: diag });
        if (!ok) notes.push({ severity: "warning", code: "exercise_alignment_uncertain", message: `${m.code}: ${lang} bullet ${i + 1} "${item.title}" aligned by position to ${canonical[i].activityCode}, but another bullet is more similar (diag ${diag.toFixed(3)} < best ${best.toFixed(3)})` });
      });
    } else {
      // Different bullet counts: do not guess a correspondence. Language-specific codes.
      const startSeq = Math.max(0, ...canonical.map((a) => a.sequenceNumber), ...ownSpecific.map((a) => a.sequenceNumber)) ;
      notes.push({ severity: "warning", code: "exercise_count_mismatch", message: `${m.code}: ${lang} edition has ${m.activities.length} exercise bullets, canonical list has ${canonical.length}; ${lang} exercises stored with language-specific codes for admin review` });
      m.activities.forEach((item, i) => {
        const prior = ownSpecific.find((a) => a.translations.some((t) => t.language === lang && t.title === item.title));
        const seq = prior?.sequenceNumber ?? startSeq + i + 1;
        plans.push({ milestoneCode: m.code, sequence: seq, activityCode: prior?.activityCode ?? `${m.code}-E${seq}-${lang}`, aligned: "language_specific", item });
      });
    }
  }
  return { plans, notes };
}

function planChunks(structure: HandbookStructure, exercises: ExercisePlan[]): ChunkPlan[] {
  const lang = structure.language;
  const L = SECTION_LABELS[lang];
  const chunks: ChunkPlan[] = [];
  for (const m of structure.milestones) {
    const base = { milestoneCode: m.code, pageIndex: m.page_indexes[0], printedPage: m.printed_pages[0], title: m.title };
    chunks.push({
      milestoneCode: m.code, activityCode: null, chunkType: "milestone_overview",
      text: [m.title, m.age_text, m.intro, m.when ? `${L.when} ${m.when}` : ""].filter(Boolean).join("\n"),
      metadata: { ...base, section: "overview" },
    });
    if (m.how_intro || m.remember) {
      chunks.push({
        milestoneCode: m.code, activityCode: null, chunkType: "milestone_guidance",
        text: [m.title, m.how_intro ? `${L.how} ${m.how_intro}` : "", m.remember ? `${L.remember} ${m.remember}` : ""].filter(Boolean).join("\n"),
        metadata: { ...base, section: "guidance" },
      });
    }
    for (const ex of exercises.filter((e) => e.milestoneCode === m.code)) {
      chunks.push({
        milestoneCode: m.code, activityCode: ex.activityCode, chunkType: ex.item.kind === "parent_guidance" ? "parent_guidance" : "exercise",
        text: `${m.title} — ${ex.item.title}: ${ex.item.text}`,
        metadata: { ...base, section: "exercise", activityTitle: ex.item.title, pageIndex: ex.item.page_index, printedPage: ex.item.printed_page },
      });
    }
  }
  return chunks;
}

/**
 * Source defect detection: an intro duplicated from another milestone (e.g. both
 * editions print 5.1's intro under 2.1). Near-duplicate intros are common for
 * related milestones, so an intro is flagged only when it matches the *other*
 * milestone's title clearly better than its own title. Flagged text is kept
 * verbatim but not used as the milestone summary, and is marked for review.
 */
export async function findMisplacedIntros(structure: HandbookStructure): Promise<Map<string, string>> {
  const tok = (t: string) => new Set(t.split(/[^\p{L}\p{N}]+/u).filter((w) => w.length > 2));
  const ms = structure.milestones.filter((m) => m.intro);
  const pairs: [HandbookMilestone, HandbookMilestone][] = [];
  for (let i = 0; i < ms.length; i++) for (let j = i + 1; j < ms.length; j++) {
    const a = tok(ms[i].intro), b = tok(ms[j].intro);
    const inter = [...a].filter((w) => b.has(w)).length;
    if (inter / (a.size + b.size - inter) >= 0.45) pairs.push([ms[i], ms[j]]);
  }
  const flagged = new Map<string, string>();
  if (!pairs.length) return flagged;
  const involved = [...new Set(pairs.flat())];
  const [introVecs, titleVecs] = await Promise.all([embed(involved.map((m) => m.intro), "passage"), embed(involved.map((m) => m.title), "passage")]);
  const idx = new Map(involved.map((m, i) => [m.code, i]));
  for (const [a, b] of pairs) {
    for (const [x, y] of [[a, b], [b, a]] as const) {
      const own = cosine(introVecs[idx.get(x.code)!], titleVecs[idx.get(x.code)!]);
      const other = cosine(introVecs[idx.get(x.code)!], titleVecs[idx.get(y.code)!]);
      if (other - own > 0.025) flagged.set(x.code, y.code);
    }
  }
  return flagged;
}

export async function publishHandbook(db: Db, input: PublishHandbookInput) {
  const { structure, checksum } = input;
  const lang = structure.language;
  const documentKey = input.documentKey ?? `handbook-${lang}`;
  const title = input.title ?? (lang === "he" ? "חוברת הדרכות מטפסים בסולם למעונות והגנים" : "חוברת ורודה ערבית — نتسلّق السُلّم");

  // Heavy work outside the transaction: alignment + embeddings.
  const t0 = Date.now();
  const { plans, notes } = await planExercises(db, structure);
  const chunkPlans = planChunks(structure, plans);
  const tPlan = Date.now();
  const vectors = await embed(chunkPlans.map((c) => c.text), "passage");
  const misplaced = await findMisplacedIntros(structure);
  for (const [code, other] of misplaced) notes.push({ severity: "warning", code: "intro_matches_other_milestone", message: `${code}: the intro paragraph matches milestone ${other}'s title better than ${code}'s own (probable copy from ${other} in the source PDF); kept verbatim, not used as summary, marked for review` });
  logger.info({ lang, planMs: tPlan - t0, embedMs: Date.now() - tPlan, chunks: chunkPlans.length }, "handbook: planned");

  const job = input.importJobId
    ? await db.importJob.update({ where: { id: input.importJobId }, data: { status: "publishing", startedAt: new Date() } })
    : await db.importJob.create({
        data: {
          jobType: "pdf_handbook", status: "publishing", language: lang, originalFilename: path.basename(input.filePath),
          storagePath: input.filePath, checksum, createdById: input.actorId ?? null, startedAt: new Date(),
        },
      });

  const result = await db.$transaction(async (tx: Tx) => {
    const v = await upsertSourceVersion(tx, {
      documentKey, title, sourceType: "PDF", language: lang, originalFilename: structure.file,
      storagePath: input.filePath, checksum, pageCount: structure.page_count,
      metadata: { completeness: structure.completeness, frontMatter: structure.front_matter_pages, appendix: structure.appendix_pages } as never,
    });

    // --- age groups (canonical, both languages) ---
    for (const g of AGE_GROUPS) {
      const ch = structure.chapters.find((c) => c.number === g.chapter);
      const sourceText = ch?.age_heading || null;
      await tx.ageGroup.upsert({
        where: { code: g.code },
        create: {
          code: g.code, chapterNumber: g.chapter, minAgeMonths: g.minAgeMonths, maxAgeMonths: g.maxAgeMonths, minAgeWeeks: g.minAgeWeeks,
          displayOrder: g.chapter, labelHe: g.labelHe, labelAr: g.labelAr,
          ...(lang === "he" ? { sourceTextHe: sourceText } : { sourceTextAr: sourceText }),
        },
        update: lang === "he" ? { sourceTextHe: sourceText } : { sourceTextAr: sourceText },
      });
    }
    const ageGroups = new Map((await tx.ageGroup.findMany()).map((g) => [g.chapterNumber, g.id]));

    // --- milestones + translations ---
    const milestoneIds = new Map<string, string>();
    for (const m of [...structure.milestones].sort((a, b) => compareCodes(a.code, b.code))) {
      const chapter = m.chapter ?? Number(m.code.split(".")[0]);
      const ageGroupId = ageGroups.get(chapter) ?? ageGroups.get(ageGroupByChapter(chapter)!.chapter)!;
      const [c, n] = m.code.split(".").map(Number);
      const milestone = await tx.milestone.upsert({
        where: { milestoneCode: m.code },
        create: { milestoneCode: m.code, ageGroupId, displayOrder: c * 100 + n },
        update: { ageGroupId },
      });
      milestoneIds.set(m.code, milestone.id);
      const notesText = [m.remember, m.curriculum_pages.length ? `${lang === "he" ? "להרחבה בקוריקולום ההתפתחותי – עמודים" : "للتوسع في البرنامج التطوري – صفحات"}: ${m.curriculum_pages.join(", ")}` : ""].filter(Boolean).join("\n");
      const data = {
        title: m.title || `${m.code}`, summary: misplaced.has(m.code) ? null : m.intro || null, developmentalExplanation: m.intro || null,
        expectedAgeText: m.when || null, educationalGuidance: m.how_intro || null, additionalNotes: notesText || null,
        sourceAgeText: m.age_text || null, sourceOrigin: "pdf", isPrimary: true,
        contentReviewStatus: (m.extraction_status === "complete" && !misplaced.has(m.code) ? "unreviewed" : "needs_review") as "unreviewed" | "needs_review" | "approved" | "rejected",
      };
      // An editorial decision (approved / rejected) carries over as long as the text it judged is unchanged;
      // changed text goes back to review.
      const decided = await tx.milestoneTranslation.findFirst({
        where: { milestoneId: milestone.id, language: lang, sourceOrigin: "pdf", contentReviewStatus: { in: ["approved", "rejected"] } },
        orderBy: { updatedAt: "desc" },
      });
      if (decided && decided.title === data.title && decided.developmentalExplanation === data.developmentalExplanation && decided.expectedAgeText === data.expectedAgeText) {
        data.contentReviewStatus = decided.contentReviewStatus as typeof data.contentReviewStatus;
        data.summary = decided.contentReviewStatus === "approved" ? m.intro || null : null;
      }
      await tx.milestoneTranslation.updateMany({ where: { milestoneId: milestone.id, language: lang, sourceOrigin: "pdf", NOT: { sourceVersionId: v.versionId } }, data: { isPrimary: false } });
      await tx.milestoneTranslation.upsert({
        where: { milestoneId_language_sourceVersionId: { milestoneId: milestone.id, language: lang, sourceVersionId: v.versionId } },
        create: { milestoneId: milestone.id, language: lang, sourceVersionId: v.versionId, ...data },
        update: data,
      });
    }

    // --- exercises ---
    const activityIds = new Map<string, string>();
    for (const p of plans) {
      const milestoneId = milestoneIds.get(p.milestoneCode)!;
      const activity = await tx.activity.upsert({
        where: { activityCode: p.activityCode },
        create: {
          milestoneId, activityCode: p.activityCode, sequenceNumber: p.sequence, activityType: "handbook_exercise",
          role: p.item.kind === "parent_guidance" ? "parent_guidance" : "exercise", audience: "educator",
          sourceAttributes: { alignment: { [lang]: p.aligned }, similarity: { [lang]: p.similarity ?? null } },
        },
        update: { role: p.item.kind === "parent_guidance" ? "parent_guidance" : "exercise" },
      });
      if (p.aligned !== "new_canonical") {
        const attrs = (activity.sourceAttributes ?? {}) as Record<string, Record<string, unknown>>;
        await tx.activity.update({
          where: { id: activity.id },
          data: { sourceAttributes: { ...attrs, alignment: { ...(attrs.alignment ?? {}), [lang]: p.aligned }, similarity: { ...(attrs.similarity ?? {}), [lang]: p.similarity ?? null } } as never },
        });
      }
      activityIds.set(p.activityCode, activity.id);
      const data = {
        title: p.item.title, description: firstSentence(p.item.text), instructions: p.item.text, sourceOrigin: "pdf",
        verificationStatus: p.aligned === "positional_flagged" || p.aligned === "language_specific" ? ("needs_review" as const) : ("unreviewed" as const),
      };
      await tx.activityTranslation.upsert({
        where: { activityId_language_sourceVersionId: { activityId: activity.id, language: lang, sourceVersionId: v.versionId } },
        create: { activityId: activity.id, language: lang, sourceVersionId: v.versionId, ...data },
        update: data,
      });
    }

    logger.info({ lang, ms: Date.now() - t0 }, "handbook: milestones + exercises written");
    // --- page references (replace for this version: idempotent re-runs) ---
    await tx.sourceReference.deleteMany({ where: { sourceVersionId: v.versionId } });
    const refs = [];
    for (const m of structure.milestones) {
      const milestoneId = milestoneIds.get(m.code)!;
      refs.push({
        sourceVersionId: v.versionId, milestoneId, activityId: null, language: lang,
        pdfPageIndex: m.page_indexes[0], printedPageNumber: m.printed_pages[0] ?? null,
        sectionHeading: m.title || m.code, sourceExcerpt: (m.intro || m.when).slice(0, 400) || null,
        extractionStatus: m.extraction_status,
      });
      for (const p of plans.filter((x) => x.milestoneCode === m.code)) {
        refs.push({
          sourceVersionId: v.versionId, milestoneId, activityId: activityIds.get(p.activityCode)!, language: lang,
          pdfPageIndex: p.item.page_index, printedPageNumber: p.item.printed_page ?? null,
          sectionHeading: p.item.title, sourceExcerpt: p.item.text.slice(0, 400), extractionStatus: "complete" as const,
        });
      }
    }
    await tx.sourceReference.createMany({ data: refs });

    // --- retrieval chunks (+ embeddings) ---
    const keepHashes: string[] = [];
    for (let i = 0; i < chunkPlans.length; i++) {
      const c = chunkPlans[i];
      const contentHash = hashText(`${c.chunkType}|${c.activityCode ?? c.milestoneCode}|${c.text}`);
      keepHashes.push(contentHash);
      const chunk = await tx.knowledgeChunk.upsert({
        where: { sourceVersionId_contentHash: { sourceVersionId: v.versionId, contentHash } },
        create: {
          sourceVersionId: v.versionId, milestoneId: milestoneIds.get(c.milestoneCode)!, activityId: c.activityCode ? activityIds.get(c.activityCode)! : null,
          language: lang, chunkType: c.chunkType, textContent: c.text, contentHash, metadata: c.metadata as never,
        },
        update: { metadata: c.metadata as never },
      });
      await tx.$executeRawUnsafe(
        `UPDATE knowledge_chunks SET embedding = $1::vector, embedding_model = $2 WHERE id = $3::uuid`,
        toVectorLiteral(vectors[i]), EMBEDDING_MODEL, chunk.id,
      );
    }
    await tx.knowledgeChunk.deleteMany({ where: { sourceVersionId: v.versionId, contentHash: { notIn: keepHashes } } });

    logger.info({ lang, ms: Date.now() - t0 }, "handbook: references + chunks written");
    // --- issues from extraction + alignment ---
    await tx.importIssue.deleteMany({ where: { importJobId: job.id } });
    const issueRows = [
      ...structure.warnings.map((w) => ({
        severity: (w.severity === "error" ? "error" : "warning") as "error" | "warning",
        code: w.code ? "pdf_header_warning" : "pdf_page_number_warning",
        message: w.message, pageIndex: w.page_index ?? null, details: { milestone: w.code ?? null },
      })),
      ...structure.milestones.filter((m) => m.extraction_status !== "complete").map((m) => ({
        severity: "warning" as const, code: "pdf_partial_extraction", message: `${m.code}: ${m.extraction_notes.join("; ")}`,
        pageIndex: m.page_indexes[0], details: { milestone: m.code },
      })),
      ...notes.map((n) => ({ severity: n.severity, code: n.code, message: n.message, pageIndex: null, details: {} })),
      {
        severity: "info" as const, code: "pdf_non_milestone_pages",
        message: `Pages not part of milestone content: front matter ${structure.front_matter_pages.length}, appendix ${structure.appendix_pages.length} (image-only: ${structure.image_only_pages.length}); appendix = developmental-scale charts, not extracted as milestones`,
        pageIndex: null, details: { frontMatter: structure.front_matter_pages, appendix: structure.appendix_pages, imageOnly: structure.image_only_pages },
      },
    ];
    await tx.importIssue.createMany({
      data: issueRows.map((r) => ({
        importJobId: job.id, sourceDocumentId: v.documentId, sourceFile: structure.file, severity: r.severity, code: r.code,
        message: r.message, pageIndex: r.pageIndex, details: r.details as never,
      })),
    });

    await promoteVersion(tx, v.documentId, v.versionId, { originalFilename: structure.file, storagePath: input.filePath, checksum });
    await tx.importJob.update({ where: { id: job.id }, data: { sourceDocumentId: v.documentId } });
    await supersedeOlderIssues(tx, v.documentId, job.id);
    const stats = {
      milestones: structure.milestones.length, exercises: plans.length, chunks: chunkPlans.length, references: refs.length,
      alignment: plans.reduce<Record<string, number>>((acc, p) => ({ ...acc, [p.aligned]: (acc[p.aligned] ?? 0) + 1 }), {}),
      issues: issueRows.length, versionNumber: v.versionNumber, newVersion: v.isNewVersion,
    };
    await tx.importJob.update({
      where: { id: job.id },
      data: { status: "published", sourceDocumentId: v.documentId, sourceVersionId: v.versionId, stats, finishedAt: new Date(), publishedById: input.actorId ?? null },
    });
    await writeAudit(tx, { actorId: input.actorId, action: "import.publish_handbook", entityType: "source_version", entityId: v.versionId, after: stats });
    return { jobId: job.id, versionId: v.versionId, ...stats };
  }, { timeout: 600_000, maxWait: 30_000 });

  return result;
}
