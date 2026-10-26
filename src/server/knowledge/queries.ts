/**
 * Deterministic content services. Everything a user sees about a milestone —
 * text, exercises, page references and above all the videos — comes from these
 * SQL-backed functions, never from model output.
 *
 * Language rule: every function takes the user's selected language and returns content in
 * that language only. There is no cross-language substitution; when something is missing in
 * the selected language the result says so (null / empty + a flag) instead of showing the
 * other language.
 */
import { existsSync } from "node:fs";
import { compareCodes } from "@/lib/codes";
import { storedFilePath } from "@/lib/runtime-path";
import { youTubeUrls } from "@/lib/youtube";
import type { Prisma as Db } from "@/server/prisma-factory";

export type Lang = "he" | "ar";

/** Video language states that may be displayed (anything else is hidden until verified). */
export const DISPLAYABLE_LANGUAGE_STATUS = ["verified", "source_metadata"];

export interface MilestoneSummary {
  code: string;
  /** Title in the selected language; null when the handbook in that language has no title for it. */
  title: string | null;
  ageGroup: { code: string; label: string; sourceText: string | null; minAgeMonths: number; maxAgeMonths: number; chapter: number };
  domain: string | null;
  /** Videos displayable in the selected language. */
  videoCount: number;
}

export interface ExerciseItem {
  code: string;
  sequence: number;
  role: string;
  title: string;
  description: string | null;
  instructions: string | null;
  language: Lang;
  verification: string;
  source: SourceRef | null;
  /** Video segments derived as related to this exercise (method + confidence exposed). */
  relatedSegments: { code: string; linkType: string; score: number | null }[];
}

export interface VideoItem {
  videoId: string;
  provider: string;
  canonicalUrl: string;
  embedUrl: string;
  thumbnailUrl: string;
  language: Lang;
  /** "verified" = spoken language confirmed by YouTube speech recognition; "source_metadata" = declared by the workbook. */
  languageStatus: string;
  audience: "educator" | "parent" | "both" | "unknown";
  milestoneCode: string;
  activityCode: string | null;
  /** Other sub-milestones the same video is mapped to (shown once, not duplicated). */
  alsoFor: string[];
  /** Segment title in the selected language; null when the source has none in that language. */
  title: string | null;
  sequence: number | null;
  role: string | null;
  mappingType: string;
  confidence: string;
  availability: string;
  source: { sheet: string; row: number; document: string };
}

export interface SourceRef {
  document: string;
  documentKey: string;
  language: Lang;
  pdfPageIndex: number;
  printedPage: number | null;
  heading: string | null;
  milestoneCode: string;
  activityCode: string | null;
  /** Viewer link; null when the PDF file itself is not available on the server. */
  url: string | null;
}

export interface MilestoneDetails extends MilestoneSummary {
  /** Intro paragraph usable as a summary (null when flagged as a source defect). */
  summary: string | null;
  explanation: string | null;
  expectedAge: string | null;
  guidance: string | null;
  notes: string | null;
  sourceAgeText: string | null;
  reviewStatus: string;
  language: Lang;
  /** True when the selected language's handbook has no text for this milestone (nothing else is substituted). */
  missingInLanguage: boolean;
  sources: SourceRef[];
}

async function currentVersionIds(db: Db): Promise<string[]> {
  const docs = await db.sourceDocument.findMany({ select: { currentVersionId: true } });
  return docs.map((d) => d.currentVersionId).filter((x): x is string => Boolean(x));
}

export function handbookPageUrl(documentKey: string, pdfPageIndex: number): string {
  return `/api/sources/${encodeURIComponent(documentKey)}/pdf#page=${pdfPageIndex + 1}`;
}

// ------------------------------------------------------- source availability ----

export type HandbookState = "available" | "not_indexed" | "file_unavailable";
const fileCheckCache = new Map<string, { at: number; ok: boolean }>();

/** For tests / after replacing files on disk. */
export function resetSourceFileCache() {
  fileCheckCache.clear();
}

function fileAvailable(path: string): boolean {
  const hit = fileCheckCache.get(path);
  if (hit && Date.now() - hit.at < 60_000) return hit.ok;
  const ok = existsSync(path);
  fileCheckCache.set(path, { at: Date.now(), ok });
  return ok;
}

/**
 * Is the handbook in this language usable? not_indexed = no published version (no answers possible);
 * file_unavailable = indexed content exists but the PDF file is missing (answers OK, no page links).
 */
export async function handbookStatus(db: Db, lang: Lang): Promise<{ state: HandbookState; title: string | null; documentKey: string }> {
  const documentKey = `handbook-${lang}`;
  const doc = await db.sourceDocument.findUnique({ where: { documentKey } });
  if (!doc?.currentVersionId) return { state: "not_indexed", title: doc?.title ?? null, documentKey };
  const chunks = await db.knowledgeChunk.count({ where: { sourceVersionId: doc.currentVersionId, language: lang } });
  if (!chunks) return { state: "not_indexed", title: doc.title, documentKey };
  return { state: fileAvailable(storedFilePath(doc.storagePath)) ? "available" : "file_unavailable", title: doc.title, documentKey };
}

// ------------------------------------------------------------------ lists ----

export async function listAgeGroups(db: Db, lang: Lang) {
  const groups = await db.ageGroup.findMany({ orderBy: { displayOrder: "asc" }, include: { _count: { select: { milestones: true } } } });
  return groups.map((g) => ({
    code: g.code, chapter: g.chapterNumber, label: lang === "he" ? g.labelHe : g.labelAr,
    sourceText: lang === "he" ? g.sourceTextHe : g.sourceTextAr,
    minAgeMonths: Number(g.minAgeMonths), maxAgeMonths: Number(g.maxAgeMonths), milestoneCount: g._count.milestones,
  }));
}

/** Filter for mappings whose video may be shown in `lang` (see DISPLAYABLE_LANGUAGE_STATUS). */
function displayableMappingWhere(lang: Lang) {
  return {
    isActive: true,
    language: lang,
    confidenceStatus: { not: "conflict" as const },
    video: { language: lang, languageStatus: { in: DISPLAYABLE_LANGUAGE_STATUS }, availabilityStatus: { not: "unavailable" as const } },
  };
}

export async function listMilestones(db: Db, lang: Lang, filter: { ageGroup?: string; codes?: string[] } = {}): Promise<MilestoneSummary[]> {
  const rows = await db.milestone.findMany({
    where: {
      status: "active",
      ...(filter.ageGroup ? { ageGroup: { code: filter.ageGroup } } : {}),
      ...(filter.codes ? { milestoneCode: { in: filter.codes } } : {}),
    },
    include: {
      ageGroup: true,
      translations: { where: { isPrimary: true, language: lang } },
      _count: { select: { mappings: { where: displayableMappingWhere(lang) } } },
    },
  });
  return rows
    .map((m) => ({
      code: m.milestoneCode,
      title: m.translations[0]?.title ?? null,
      domain: m.developmentDomain,
      videoCount: m._count.mappings,
      ageGroup: {
        code: m.ageGroup.code, chapter: m.ageGroup.chapterNumber, label: lang === "he" ? m.ageGroup.labelHe : m.ageGroup.labelAr,
        sourceText: lang === "he" ? m.ageGroup.sourceTextHe : m.ageGroup.sourceTextAr,
        minAgeMonths: Number(m.ageGroup.minAgeMonths), maxAgeMonths: Number(m.ageGroup.maxAgeMonths),
      },
    }))
    .sort((a, b) => compareCodes(a.code, b.code));
}

export async function getSourceReferences(db: Db, milestoneCode: string, lang: Lang, opts: { activityCodes?: string[] } = {}): Promise<SourceRef[]> {
  const versions = await currentVersionIds(db);
  const refs = await db.sourceReference.findMany({
    where: { milestone: { milestoneCode }, language: lang, sourceVersionId: { in: versions } },
    include: { sourceVersion: { include: { document: true } }, activity: { select: { activityCode: true } } },
    orderBy: [{ pdfPageIndex: "asc" }],
  });
  return refs
    .filter((r) => !opts.activityCodes || r.activity === null || opts.activityCodes.includes(r.activity.activityCode))
    .map((r) => ({
      document: r.sourceVersion.document.title, documentKey: r.sourceVersion.document.documentKey, language: r.language,
      pdfPageIndex: r.pdfPageIndex, printedPage: r.printedPageNumber, heading: r.sectionHeading,
      milestoneCode, activityCode: r.activity?.activityCode ?? null,
      url: fileAvailable(storedFilePath(r.sourceVersion.document.storagePath)) ? handbookPageUrl(r.sourceVersion.document.documentKey, r.pdfPageIndex) : null,
    }));
}

export async function getMilestoneDetails(db: Db, milestoneCode: string, lang: Lang): Promise<MilestoneDetails | null> {
  const [summary] = await listMilestones(db, lang, { codes: [milestoneCode] });
  if (!summary) return null;
  const versions = await currentVersionIds(db);
  const t = await db.milestoneTranslation.findFirst({
    where: { milestone: { milestoneCode }, language: lang, sourceOrigin: "pdf", sourceVersionId: { in: versions } },
  });
  const sources = t ? await getSourceReferences(db, milestoneCode, lang) : [];
  return {
    ...summary,
    title: t?.title ?? summary.title,
    summary: t?.summary ?? null,
    // a text rejected in editorial review stays stored verbatim but is not presented as the explanation
    explanation: t?.contentReviewStatus === "rejected" ? null : t?.developmentalExplanation ?? null,
    expectedAge: t?.expectedAgeText ?? null,
    guidance: t?.educationalGuidance ?? null,
    notes: t?.additionalNotes ?? null,
    sourceAgeText: t?.sourceAgeText ?? null,
    reviewStatus: t?.contentReviewStatus ?? "unreviewed",
    language: lang,
    missingInLanguage: !t,
    sources: sources.filter((s) => s.activityCode === null),
  };
}

/** Handbook exercises for a milestone in one language (no cross-language substitution). */
export async function getMilestoneActivities(db: Db, milestoneCode: string, lang: Lang): Promise<ExerciseItem[]> {
  const versions = await currentVersionIds(db);
  const activities = await db.activity.findMany({
    where: { milestone: { milestoneCode }, activityType: "handbook_exercise", status: "active" },
    include: {
      translations: { where: { language: lang, sourceVersionId: { in: versions } } },
      linksTo: { include: { segment: { select: { activityCode: true } } } },
    },
    orderBy: { sequenceNumber: "asc" },
  });
  const refs = await getSourceReferences(db, milestoneCode, lang);
  return activities
    .filter((a) => a.translations.length)
    .map((a) => {
      const t = a.translations[0];
      return {
        code: a.activityCode, sequence: a.sequenceNumber, role: a.role, title: t.title, description: t.description,
        instructions: t.instructions, language: lang, verification: t.verificationStatus,
        source: refs.find((r) => r.activityCode === a.activityCode) ?? null,
        relatedSegments: a.linksTo
          .filter((l) => l.linkType !== "requires_review")
          .map((l) => ({ code: l.segment.activityCode, linkType: l.linkType, score: l.score }))
          .sort((x, y) => compareCodes(x.code, y.code)),
      };
    });
}

/**
 * Videos mapped (by a video workbook) to a milestone, in the selected language only.
 * Shown only when: mapping active and not in conflict; video in the same language with a
 * verified or source-declared language; video not unavailable. Never invents a mapping and
 * never substitutes another language; a video mapped to several sub-milestones appears once.
 */
export async function getMappedVideos(db: Db, milestoneCode: string, opts: { language: Lang; activityCodes?: string[] }): Promise<VideoItem[]> {
  const lang = opts.language;
  const versions = await currentVersionIds(db);
  const mappings = await db.activityVideoMapping.findMany({
    where: {
      ...displayableMappingWhere(lang),
      milestone: { milestoneCode },
      ...(opts.activityCodes?.length ? { activity: { activityCode: { in: opts.activityCodes } } } : {}),
    },
    include: {
      video: true,
      sourceDocument: { select: { title: true } },
      activity: { include: { translations: { where: { language: lang, sourceVersionId: { in: versions } } } } },
    },
  });
  const AUDIENCE_ORDER: Record<string, number> = { educator: 0, both: 1, unknown: 2, parent: 3 };
  const sorted = [...mappings].sort((a, b) =>
    (a.activity?.sequenceNumber ?? 0) - (b.activity?.sequenceNumber ?? 0) || AUDIENCE_ORDER[a.audience] - AUDIENCE_ORDER[b.audience]);

  const byVideo = new Map<string, VideoItem>();
  for (const m of sorted) {
    // the video's own YouTube title names another sub-milestone of this milestone: the source supports the
    // milestone, not this specific sub-milestone -> show it at milestone level (no activity, no segment title)
    const subUncertain = (m.validationNotes as { check: string; scope?: string }[]).some((n) => n.check === "youtube_title" && n.scope === "same_milestone");
    const code = subUncertain ? null : m.activity?.activityCode ?? null;
    const existing = byVideo.get(m.video.providerVideoId);
    if (existing) {
      if (code && code !== existing.activityCode && !existing.alsoFor.includes(code)) existing.alsoFor.push(code);
      continue;
    }
    const tr = code ? m.activity?.translations[0] : undefined;
    byVideo.set(m.video.providerVideoId, {
      videoId: m.video.providerVideoId, provider: m.video.provider, canonicalUrl: m.video.canonicalUrl, embedUrl: m.video.embedUrl,
      thumbnailUrl: youTubeUrls(m.video.providerVideoId).thumbnailUrl, language: lang, languageStatus: m.video.languageStatus,
      audience: m.audience, milestoneCode, activityCode: code, alsoFor: [], title: tr?.title ?? null,
      sequence: code ? m.activity?.sequenceNumber ?? null : null, role: code ? m.activity?.role ?? null : null, mappingType: m.mappingType,
      confidence: m.confidenceStatus, availability: m.video.availabilityStatus,
      source: { sheet: m.sourceSheet, row: m.sourceRowNumber, document: m.sourceDocument.title },
    });
  }
  // sub-milestone videos in order, milestone-level ones after them
  return [...byVideo.values()].sort((a, b) => (a.sequence ?? 999) - (b.sequence ?? 999));
}

/** How many active mappings of a milestone exist in each language (used to explain an empty result). */
export async function videoLanguageCoverage(db: Db, milestoneCode: string): Promise<Record<string, number>> {
  const rows = await db.activityVideoMapping.groupBy({ by: ["language"], where: { isActive: true, milestone: { milestoneCode } }, _count: true });
  return Object.fromEntries(rows.map((r) => [r.language, r._count]));
}

/** Segment (Excel sub-milestone) list for a milestone with titles in the selected language only. */
export async function getVideoSegments(db: Db, milestoneCode: string, lang: Lang) {
  const versions = await currentVersionIds(db);
  const segs = await db.activity.findMany({
    where: { milestone: { milestoneCode }, activityType: "video_segment" },
    include: { translations: { where: { sourceVersionId: { in: versions }, language: lang } } },
    orderBy: { sequenceNumber: "asc" },
  });
  return segs.map((s) => ({ code: s.activityCode, sequence: s.sequenceNumber, role: s.role, audience: s.audience, title: s.translations[0]?.title ?? null }));
}
