/**
 * Hybrid retrieval over handbook chunks:
 *   1. explicit identifiers in the question ("1.1", "1.1.3")
 *   2. semantic search (pgvector, cosine) in the question's language
 *   3. keyword search (BM25, in-memory, with light Hebrew/Arabic prefix stripping)
 *   4. reciprocal-rank fusion -> per-milestone aggregation -> age-aware re-ranking
 *
 * Only chunks of the *current* version of each source are searched.
 */
import { ageGroupForMonths } from "@/lib/age-groups";
import type { ParsedAge } from "@/lib/age-parse";
import { MILESTONE_CODE, SUB_MILESTONE_CODE } from "@/lib/codes";
import { keywordTokens, normalizeForSearch } from "@/lib/text-normalize";
import { embedOne, toVectorLiteral } from "@/server/ai/embeddings";
import type { Prisma as Db } from "@/server/prisma-factory";
import type { Lang } from "./queries";

export interface ChunkHit {
  chunkId: string;
  milestoneCode: string;
  activityCode: string | null;
  chunkType: string;
  text: string;
  pageIndex: number | null;
  printedPage: number | null;
  documentKey: string;
  similarity: number | null;
  bm25: number | null;
  fused: number;
}

export interface MilestoneCandidate {
  code: string;
  score: number;
  ageGroupCode: string;
  chapter: number;
  reasons: string[];
  hits: ChunkHit[];
}

export interface RetrievalResult {
  language: Lang;
  age: ParsedAge | null;
  explicitCodes: string[];
  candidates: MilestoneCandidate[];
  /** Best semantic similarity seen; used for the "not covered by the handbook" decision. */
  topSimilarity: number;
  topKeywordScore: number;
  /** Share of the question's content words found in the best passage of the top milestone (0..1). */
  evidenceCoverage: number;
  /** Best semantic similarity among the top milestone's own passages. */
  evidenceSimilarity: number;
  grounded: boolean;
  /** Normalised keyword terms of the question (diagnostics). */
  queryTerms: string[];
  indexSize: number;
}

/** e5 query/passage cosine below this (and no keyword hit) = not covered by the handbooks. */
/** Domain words in a question (the domain itself comes from the handbook's scale chart). */
const DOMAIN_CUES: { domain: string; re: RegExp }[] = [
  { domain: "fine_motor", re: /מוטוריקהs*עדינה|מוטוריקה עדינה|عدين|الحركية الدقيقة|الحركات الدقيقة|المهارات الدقيقة/ },
  { domain: "gross_motor", re: /מוטוריקהs*גסה|الحركية الكبرى|الحركات الكبيرة|المهارات الحركية الكبيرة/ },
  { domain: "language", re: /שפה|דיבור|לדבר|מדבר|מילים|אוצר מילים|תקשורת מילולית|اللغة|الكلام|النطق|يتكلم|الكلمات/ },
  { domain: "social", re: /חברתי|רגשי|חברים|קשר עין|الاجتماعي|الاجتماعية|العاطفي|التواصل البصري/ },
];

export function detectDomains(question: string): string[] {
  return DOMAIN_CUES.filter((c) => c.re.test(question)).map((c) => c.domain);
}

export const MIN_SIMILARITY = Number(process.env.RETRIEVAL_MIN_SIMILARITY ?? 0.8);
/**
 * Evidence thresholds (calibrated 2026-10-13 on tests/eval/questions.json, see docs/reports/eval-report.md).
 * Questions the handbooks do not answer but that sound similar (fever, sleep, vaccines, reading) reach
 * similarity 0.83-0.86 with low word coverage, so similarity alone is never enough below STRONG_SIMILARITY:
 *  - similarity >= STRONG_SIMILARITY, or
 *  - similarity >= GOOD_SIMILARITY and at least MIN_COVERAGE of the question's words in the passage, or
 *  - similarity >= MIN_SIMILARITY_WITH_WORDS and at least HIGH_COVERAGE of the words in the passage, or
 *  - most of the question's words literally in one passage (>= LITERAL_COVERAGE) and similarity >= MIN_SIMILARITY.
 * Deliberately conservative: a borderline question gets "no relevant information found" rather than an
 * answer the handbook may not support (known recall cost, see the evaluation report).
 */
export const STRONG_SIMILARITY = Number(process.env.RETRIEVAL_STRONG_SIMILARITY ?? 0.9);
export const GOOD_SIMILARITY = Number(process.env.RETRIEVAL_GOOD_SIMILARITY ?? 0.86);
export const MIN_COVERAGE = Number(process.env.RETRIEVAL_MIN_COVERAGE ?? 0.2);
export const MIN_SIMILARITY_WITH_WORDS = Number(process.env.RETRIEVAL_MIN_SIMILARITY_WITH_WORDS ?? 0.84);
export const HIGH_COVERAGE = Number(process.env.RETRIEVAL_HIGH_COVERAGE ?? 0.5);
export const LITERAL_COVERAGE = Number(process.env.RETRIEVAL_LITERAL_COVERAGE ?? 0.6);

// ------------------------------------------------------------ BM25 index ----

const HE_PREFIX = /^(?:וה|שה|מה|לה|בה|כה|וב|ול|ומ|וש|ה|ו|ב|ל|מ|ש|כ)(?=[א-ת]{3,})/;
const AR_PREFIX = /^(?:وال|بال|كال|فال|لل|ال|و|ف|ب|ل)(?=[ء-ي]{3,})/;
const AR_SUFFIX = /(?:ها|هم|ات|ون|ين|ة|ا)$/; // trailing alef = accusative tanween (جسماً -> جسم)
const HE_PLURAL = /(?:ים|ות)$/;

function terms(text: string): string[] {
  const out: string[] = [];
  for (const t of keywordTokens(text)) {
    out.push(t);
    const he = t.replace(HE_PREFIX, "");
    if (he !== t) out.push(he);
    // plural forms ("זרים" -> "זר", "תנועות" -> "תנוע") as extra terms
    for (const w of new Set([t, he])) if (/^[א-ת]{4,}$/.test(w) && HE_PLURAL.test(w)) out.push(w.replace(HE_PLURAL, ""));
    let ar = t.replace(AR_PREFIX, "");
    if (ar.length > 4) ar = ar.replace(AR_SUFFIX, "");
    else if (ar.length === 4 && ar.endsWith("ا")) ar = ar.slice(0, -1);
    if (ar !== t) out.push(ar);
  }
  return out;
}

interface IndexedChunk {
  id: string; milestoneCode: string; activityCode: string | null; chunkType: string; language: Lang;
  text: string; pageIndex: number | null; printedPage: number | null; documentKey: string;
  tf: Map<string, number>; len: number;
}

interface Bm25Index { key: string; builtAt: number; chunks: IndexedChunk[]; df: Map<string, number>; avgLen: Record<Lang, number>; n: Record<Lang, number> }

let indexCache: Bm25Index | null = null;
const INDEX_TTL_MS = 5 * 60_000;

async function currentVersionIds(db: Db): Promise<string[]> {
  const docs = await db.sourceDocument.findMany({ select: { currentVersionId: true } });
  return docs.map((d) => d.currentVersionId).filter((x): x is string => Boolean(x)).sort();
}

async function getIndex(db: Db): Promise<Bm25Index> {
  const versions = await currentVersionIds(db);
  const key = versions.join(",");
  if (indexCache && indexCache.key === key && Date.now() - indexCache.builtAt < INDEX_TTL_MS) return indexCache;
  const rows = await db.knowledgeChunk.findMany({
    where: { sourceVersionId: { in: versions } },
    select: {
      id: true, chunkType: true, language: true, textContent: true, metadata: true,
      milestone: { select: { milestoneCode: true } }, activity: { select: { activityCode: true } },
      sourceVersion: { select: { document: { select: { documentKey: true } } } },
    },
  });
  const df = new Map<string, number>();
  const lens: Record<Lang, number[]> = { he: [], ar: [] };
  const chunks: IndexedChunk[] = rows.map((r) => {
    const tf = new Map<string, number>();
    const ts = terms(r.textContent);
    for (const t of ts) tf.set(t, (tf.get(t) ?? 0) + 1);
    for (const t of tf.keys()) df.set(`${r.language}:${t}`, (df.get(`${r.language}:${t}`) ?? 0) + 1);
    lens[r.language].push(ts.length);
    const meta = (r.metadata ?? {}) as { pageIndex?: number; printedPage?: number };
    return {
      id: r.id, milestoneCode: r.milestone.milestoneCode, activityCode: r.activity?.activityCode ?? null, chunkType: r.chunkType,
      language: r.language, text: r.textContent, pageIndex: meta.pageIndex ?? null, printedPage: meta.printedPage ?? null,
      documentKey: r.sourceVersion.document.documentKey, tf, len: ts.length,
    };
  });
  const avg = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 1);
  indexCache = { key, builtAt: Date.now(), chunks, df, avgLen: { he: avg(lens.he), ar: avg(lens.ar) }, n: { he: lens.he.length, ar: lens.ar.length } };
  return indexCache;
}

export function invalidateRetrievalCache() {
  indexCache = null;
}

function bm25(index: Bm25Index, query: string, lang: Lang, k = 40): { chunk: IndexedChunk; score: number }[] {
  const qTerms = [...new Set(terms(query))];
  if (!qTerms.length) return [];
  const k1 = 1.2;
  const b = 0.75;
  const N = index.n[lang];
  const scored: { chunk: IndexedChunk; score: number }[] = [];
  for (const c of index.chunks) {
    if (c.language !== lang) continue;
    let s = 0;
    for (const t of qTerms) {
      const f = c.tf.get(t);
      if (!f) continue;
      const n = index.df.get(`${lang}:${t}`) ?? 0;
      const idf = Math.log(1 + (N - n + 0.5) / (n + 0.5));
      s += (idf * f * (k1 + 1)) / (f + k1 * (1 - b + (b * c.len) / index.avgLen[lang]));
    }
    if (s > 0) scored.push({ chunk: c, score: s });
  }
  return scored.sort((x, y) => y.score - x.score).slice(0, k);
}

// ---------------------------------------------------------- vector search ----

async function vectorSearch(db: Db, vec: number[], lang: Lang, versions: string[], k = 40) {
  const rows = await db.$queryRawUnsafe<{ id: string; similarity: number }[]>(
    `SELECT kc.id, 1 - (kc.embedding <=> $1::vector) AS similarity
       FROM knowledge_chunks kc
      WHERE kc.language = $2::"ContentLanguage" AND kc.embedding IS NOT NULL
        AND kc.source_version_id = ANY($3::uuid[])
      ORDER BY kc.embedding <=> $1::vector
      LIMIT $4`,
    toVectorLiteral(vec), lang, versions, k,
  );
  return rows.map((r) => ({ id: r.id, similarity: Number(r.similarity) }));
}

/** Best similarity between the question and any passage of one milestone (current versions, one language). */
async function milestoneSimilarity(db: Db, vec: number[], lang: Lang, versions: string[], milestoneCode: string): Promise<number> {
  const rows = await db.$queryRawUnsafe<{ similarity: number | null }[]>(
    `SELECT max(1 - (kc.embedding <=> $1::vector)) AS similarity
       FROM knowledge_chunks kc JOIN milestones m ON m.id = kc.milestone_id
      WHERE m.milestone_code = $2 AND kc.language = $3::"ContentLanguage" AND kc.embedding IS NOT NULL
        AND kc.source_version_id = ANY($4::uuid[])`,
    toVectorLiteral(vec), milestoneCode, lang, versions,
  );
  return Number(rows[0]?.similarity ?? 0);
}

// ------------------------------------------------------------- pipeline ----

export function extractCodes(question: string): string[] {
  const codes = new Set<string>();
  for (const m of question.matchAll(/(?<![\d.])(\d{1,2}\.\d{1,2}(?:\.\d{1,3})?)(?![\d.])/g)) {
    if (MILESTONE_CODE.test(m[1]) || SUB_MILESTONE_CODE.test(m[1])) codes.add(m[1]);
  }
  return [...codes];
}

export async function findRelevantMilestones(
  db: Db,
  question: string,
  lang: Lang,
  opts: { age?: ParsedAge | null; previousCodes?: string[]; limit?: number } = {},
): Promise<RetrievalResult> {
  const age = opts.age ?? null;
  const explicitCodes = extractCodes(question);
  const versions = await currentVersionIds(db);
  const qVec = await embedOne(question, "query");
  const [index, vec] = await Promise.all([getIndex(db), vectorSearch(db, qVec, lang, versions)]);
  const kw = bm25(index, question, lang);
  const byId = new Map(index.chunks.map((c) => [c.id, c]));

  // reciprocal-rank fusion (k = 60)
  const fused = new Map<string, ChunkHit>();
  const add = (id: string, rank: number, sim: number | null, kwScore: number | null) => {
    const c = byId.get(id);
    if (!c) return;
    const h = fused.get(id) ?? {
      chunkId: id, milestoneCode: c.milestoneCode, activityCode: c.activityCode, chunkType: c.chunkType, text: c.text,
      pageIndex: c.pageIndex, printedPage: c.printedPage, documentKey: c.documentKey, similarity: null, bm25: null, fused: 0,
    };
    h.fused += 1 / (60 + rank);
    if (sim !== null) h.similarity = sim;
    if (kwScore !== null) h.bm25 = kwScore;
    fused.set(id, h);
  };
  vec.forEach((v, i) => add(v.id, i + 1, v.similarity, null));
  kw.forEach((k, i) => add(k.chunk.id, i + 1, null, k.score));
  // RRF ignores score magnitude; a keyword hit far above the rest (near-verbatim phrase match,
  // e.g. the exact wording of a sub-milestone) gets a bonus that is negligible for ordinary hits.
  const topKw = kw[0]?.score ?? 0;
  if (topKw > 0) for (const k of kw) fused.get(k.chunk.id)!.fused += 0.03 * (k.score / topKw) ** 3 * Math.min(1, topKw / 20);

  const topSimilarity = vec[0]?.similarity ?? 0;
  const topKeywordScore = kw[0]?.score ?? 0;

  // aggregate per milestone: best chunk + diminishing contribution of the next ones
  const groups = new Map<string, ChunkHit[]>();
  for (const h of fused.values()) groups.set(h.milestoneCode, [...(groups.get(h.milestoneCode) ?? []), h]);
  const ageGroup = age ? ageGroupForMonths(age.months) : null;
  const domains = detectDomains(question);
  const explicitMilestones = explicitCodes.map((c) => c.split(".").slice(0, 2).join("."));
  const milestones = await db.milestone.findMany({
    where: { OR: [{ milestoneCode: { in: [...new Set([...groups.keys(), ...explicitMilestones])] } }, ...(domains.length ? [{ developmentDomain: { in: domains } }] : [])] },
    include: { ageGroup: true, translations: { where: { language: lang, isPrimary: true }, select: { title: true } } },
  });
  const meta = new Map(milestones.map((m) => [m.milestoneCode, m]));
  const qTerms = new Set(terms(question));

  const candidates: MilestoneCandidate[] = [];
  // A domain named in the question brings all of that domain's milestones into play.
  const domainCodes = milestones.filter((m) => m.developmentDomain && domains.includes(m.developmentDomain)).map((m) => m.milestoneCode);
  const codesToScore = new Set([...groups.keys(), ...explicitMilestones, ...domainCodes]);
  for (const code of codesToScore) {
    const m = meta.get(code);
    if (!m) continue;
    const hits = (groups.get(code) ?? []).sort((a, b) => b.fused - a.fused);
    let score = hits.slice(0, 4).reduce((s, h, i) => s + h.fused / (i + 1), 0);
    const reasons: string[] = [];
    // the handbook title is the most authoritative short description of a milestone
    const titleTerms = new Set(terms(m.translations[0]?.title ?? ""));
    if (titleTerms.size) {
      const overlap = [...titleTerms].filter((t) => qTerms.has(t)).length / titleTerms.size;
      if (overlap > 0) {
        score += 0.025 * overlap;
        reasons.push(`title_overlap_${overlap.toFixed(2)}`);
      }
    }
    if (explicitCodes.some((c) => c === code || c.startsWith(`${code}.`))) {
      score += 1;
      reasons.push("explicit_code");
    }
    if (ageGroup) {
      const dist = Math.abs(m.ageGroup.chapterNumber - ageGroup.chapter);
      const factor = dist === 0 ? 1.35 : dist === 1 ? 1.05 : 0.75;
      score *= factor;
      reasons.push(`age_distance_${dist}`);
    }
    if (domains.length && m.developmentDomain && domains.includes(m.developmentDomain)) {
      score = score * 1.4 + 0.02; // prior: the question asked about this domain
      reasons.push(`domain_${m.developmentDomain}`);
    }
    if (opts.previousCodes?.includes(code)) {
      score *= 1.1;
      reasons.push("conversation_context");
    }
    candidates.push({ code, score, ageGroupCode: m.ageGroup.code, chapter: m.ageGroup.chapterNumber, reasons, hits: hits.slice(0, 6) });
  }
  candidates.sort((a, b) => b.score - a.score);

  // Evidence check on the top milestone's passages: similar wording elsewhere is not evidence.
  const coverageOf = (chunkId: string) => {
    const c = byId.get(chunkId);
    if (!c || !qTerms.size) return 0;
    const words = [...new Set(keywordTokens(question))];
    const hit = words.filter((w) => terms(w).some((t) => c.tf.has(t))).length;
    return words.length ? hit / words.length : 0;
  };
  const best = candidates[0];
  // evaluated on *all* passages of the top milestone (not only those that made the fused shortlist);
  // coverage is per single passage, never a union, so long milestones do not score higher by size
  const ownChunks = best ? index.chunks.filter((c) => c.milestoneCode === best.code && c.language === lang) : [];
  const evidenceCoverage = Math.max(0, ...ownChunks.map((c) => coverageOf(c.id)));
  const bestSimilarity = best ? await milestoneSimilarity(db, qVec, lang, versions, best.code) : 0;

  // a question without any meaningful word (e.g. "???", emoji, mojibake) is never grounded, whatever its vector says
  // Grounded only when the *top milestone's own passages* support the question: a very close semantic
  // match, or a reasonable match that also contains a meaningful share of the question's words.
  const grounded = explicitCodes.length > 0 || (qTerms.size > 0 && Boolean(best) && (
    bestSimilarity >= STRONG_SIMILARITY ||
    (bestSimilarity >= GOOD_SIMILARITY && evidenceCoverage >= MIN_COVERAGE) ||
    (bestSimilarity >= MIN_SIMILARITY_WITH_WORDS && evidenceCoverage >= HIGH_COVERAGE) ||
    (bestSimilarity >= MIN_SIMILARITY && evidenceCoverage >= LITERAL_COVERAGE)
  ));
  return { language: lang, age, explicitCodes, candidates: candidates.slice(0, opts.limit ?? 5), topSimilarity, topKeywordScore, evidenceCoverage, evidenceSimilarity: bestSimilarity, grounded, queryTerms: [...qTerms], indexSize: index.chunks.length };
}

/** Normalised text equality helper for tests / evaluation. */
export const sameText = (a: string, b: string) => normalizeForSearch(a) === normalizeForSearch(b);
