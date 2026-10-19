/**
 * Question -> structured, source-grounded answer.
 *
 *   detect language -> parse age -> hybrid retrieval (milestones)
 *   -> SQL: milestone details, handbook exercises, page references
 *   -> Claude (or extractive fallback) picks activities + writes a short explanation
 *   -> SQL: videos mapped to the chosen milestone / sub-milestones (Excel mapping)
 *
 * The model never produces milestone codes, video ids or URLs that are shown
 * unvalidated: every code it returns must be one it was given.
 */
import { createHash } from "node:crypto";
import { parseAge, type ParsedAge } from "@/lib/age-parse";
import { detectLanguage } from "@/lib/text-normalize";
import { composeAnswer, llmEnabled, LlmUnavailableError, type GroundingExcerpt } from "@/server/ai/llm";
import { logger } from "@/server/logger";
import type { Prisma as Db } from "@/server/prisma-factory";
import {
  getMappedVideos, getMilestoneActivities, getMilestoneDetails, getSourceReferences, handbookStatus, listMilestones,
  type ExerciseItem, type Lang, type MilestoneDetails, type MilestoneSummary, type SourceRef, type VideoItem,
} from "@/server/knowledge/queries";
import { findRelevantMilestones, type RetrievalResult } from "@/server/knowledge/retrieval";

export interface ChatAnswer {
  conversationId: string;
  messageId: string;
  /** The user's selected language: everything in this answer is in this language only. */
  language: Lang;
  /** Script of the question (used only to match it against the handbook in that script). */
  questionLanguage: Lang | "unknown";
  status: "answered" | "not_covered" | "source_unavailable";
  explanation: string;
  explanationSource: "llm" | "extractive" | "none";
  age: ParsedAge | null;
  milestone: MilestoneDetails | null;
  relatedMilestones: MilestoneSummary[];
  activities: ExerciseItem[];
  videos: (VideoItem & { highlighted: boolean })[];
  videoMatch: "activity" | "milestone" | "none";
  /** Message shown when no displayable video exists in the selected language (no substitute is shown). */
  videoNotice: string | null;
  sources: SourceRef[];
  /** The handbook passages the answer is based on (text + page), in the selected language. */
  evidence: { section: string; text: string; page: number | null; url: string | null }[];
  /** Limitations of the sources for this answer (e.g. PDF file not available for viewing). */
  sourceNotice: string | null;
  followUps: string[];
  safetyNote: string | null;
  disclaimer: string;
  grounding: { topSimilarity: number; topKeywordScore: number; evidenceCoverage: number; evidenceSimilarity: number; queryTerms: string[]; indexSize: number; candidates: { code: string; score: number; reasons: string[] }[]; llmModel: string | null };
}

const DISCLAIMER: Record<Lang, string> = {
  he: "המידע מבוסס על חוברת ההדרכה \"מטפסים בסולם\" והוא לצורכי הדרכה חינוכית בלבד. הוא אינו אבחון ואינו מחליף הערכה התפתחותית מקצועית.",
  ar: "تستند هذه المعلومات إلى كتيّب الإرشاد \"نتسلّق السُلّم\" وهي لأغراض تربوية فقط، ولا تُعدّ تشخيصًا ولا تُغني عن تقييم تطوّري مهني.",
};

const CONCERN = /מתקשה|לא מצליח|לא מצליחה|עדיין לא|לא מדבר|לא הולך|לא מגיב|מודאג|דאגה|עיכוב|איחור|לא יודע|يتأخر|تأخر|لا يستطيع|لا تستطيع|لم يبدأ|لم تبدأ|قلق|لا يتكلم|لا يمشي|صعوبة/;
const SAFETY = /נחנק|חנק|נפל על הראש|פרכוס|לא נושם|מכה בראש|اختناق|يختنق|سقط على رأسه|تشنج|لا يتنفس/;

const CONCERN_NOTE: Record<Lang, string> = {
  he: "כל ילד מתפתח בקצב שלו. אם הקושי נמשך או מעורר דאגה, מומלץ לשתף את ההורים ולהפנות להערכה התפתחותית מקצועית (למשל בטיפת חלב).",
  ar: "يتطوّر كل طفل وفق وتيرته الخاصة. إذا استمرت الصعوبة أو أثارت القلق، يُنصح بإشراك الأهل والتوجّه لتقييم تطوّري مهني (مثلًا في محطة رعاية الأم والطفل).",
};
const SAFETY_NOTE: Record<Lang, string> = {
  he: "במצב של סכנה מיידית (חנק, קושי בנשימה, פגיעת ראש, פרכוס) יש לפעול מיד לפי נוהלי החירום ולהזעיק עזרה רפואית.",
  ar: "في حالة الخطر الفوري (اختناق، صعوبة في التنفس، إصابة في الرأس، تشنّج) يجب التصرف فورًا وفق إجراءات الطوارئ وطلب مساعدة طبية.",
};
const NOT_COVERED: Record<Lang, string> = {
  he: "לא נמצא מידע רלוונטי לשאלה במסמכים הזמינים. אפשר לנסח את השאלה מחדש או לעיין במסמכים הקיימים.",
  ar: "لم يتم العثور على معلومات ذات صلة بالسؤال في المستندات المتاحة. يمكن إعادة صياغة السؤال أو تصفّح المستندات المتوفرة.",
};
const SOURCE_UNAVAILABLE: Record<Lang, string> = {
  he: "חוברת ההדרכה בעברית אינה זמינה כרגע במערכת (לא נטענה או שלא ניתן לקרוא אותה), ולכן לא ניתן לענות מתוכה. לא הוצג תוכן משפה אחרת.",
  ar: "كتيّب الإرشاد بالعربية غير متاح حاليًا في النظام (لم يُحمَّل أو تعذّرت قراءته)، لذا لا يمكن الإجابة منه. لم يُعرض محتوى بلغة أخرى.",
};
const NO_VIDEO_IN_LANGUAGE: Record<Lang, string> = {
  he: "לא נמצא סרטון הדרכה בעברית לאבן דרך זו.",
  ar: "لم يتم العثور على فيديو إرشادي بالعربية لهذه المرحلة.",
};
const FILE_UNAVAILABLE: Record<Lang, string> = {
  he: "קובץ ה-PDF של החוברת אינו זמין כרגע לצפייה; התשובה מבוססת על הטקסט שנקלט ממנו.",
  ar: "ملف PDF للكتيّب غير متاح حاليًا للعرض؛ تستند الإجابة إلى النص الذي تمّ استخراجه منه.",
};

export const hashForLog = (s: string) => createHash("sha256").update(s).digest("hex").slice(0, 12);

function rankExercises(exercises: ExerciseItem[], retrieval: RetrievalResult, milestoneCode: string): ExerciseItem[] {
  const hits = retrieval.candidates.find((c) => c.code === milestoneCode)?.hits ?? [];
  const score = new Map<string, number>();
  for (const h of hits) {
    if (!h.activityCode) continue;
    // a hit on a video segment counts for the exercises it is linked to
    const targets = exercises.filter((e) => e.code === h.activityCode || e.relatedSegments.some((s) => s.code === h.activityCode));
    for (const t of targets) score.set(t.code, Math.max(score.get(t.code) ?? 0, h.fused));
  }
  return [...exercises].sort((a, b) => (score.get(b.code) ?? 0) - (score.get(a.code) ?? 0) || a.sequence - b.sequence);
}

function extractiveExplanation(m: MilestoneDetails): string {
  const sentences = (s: string | null, n: number) => (s ?? "").split(/(?<=[.!?؟])\s+/u).filter(Boolean).slice(0, n).join(" ");
  // summary is null when the intro was flagged as copied from another milestone
  return [sentences(m.summary, 2), sentences(m.expectedAge, m.summary ? 1 : 2)].filter(Boolean).join(" ");
}

function templateFollowUps(lang: Lang, m: MilestoneDetails, remaining: ExerciseItem[], related: MilestoneSummary[]): string[] {
  const out: string[] = [];
  if (remaining[0]) out.push(lang === "he" ? `איך מיישמים את "${remaining[0].title}"?` : `كيف نطبّق "${remaining[0].title}"؟`);
  out.push(lang === "he" ? `איך לשתף את ההורים באבן הדרך "${m.title}"?` : `كيف نُشرك الأهل في مرحلة "${m.title}"؟`);
  if (related[0]) out.push(lang === "he" ? `מה כוללת אבן הדרך "${related[0].title}"?` : `ماذا تتضمّن مرحلة "${related[0].title}"؟`);
  return out.slice(0, 3);
}

export async function answerQuestion(
  db: Db,
  input: { question: string; uiLanguage: Lang; clientId: string; conversationId?: string | null },
): Promise<ChatAnswer> {
  const t0 = Date.now();
  const question = input.question.trim();
  // The selected UI language is the single source of truth for what is shown. The question's own
  // script is used only to match it (milestone codes are shared by both handbooks).
  const lang: Lang = input.uiLanguage;
  const detected = detectLanguage(question);
  const matchLang: Lang = detected === "unknown" ? lang : detected;
  const age = parseAge(question);

  // conversation context (anonymous client id; no personal fields)
  let conversation = input.conversationId
    ? await db.conversation.findFirst({ where: { id: input.conversationId, clientId: input.clientId } })
    : null;
  conversation ??= await db.conversation.create({ data: { clientId: input.clientId, language: lang } });
  const history = await db.message.findMany({ where: { conversationId: conversation.id }, orderBy: { createdAt: "asc" }, take: 20 });
  const previousCodes = history
    .map((m) => (m.payload as { milestoneCode?: string } | null)?.milestoneCode)
    .filter((c): c is string => Boolean(c));
  const previousAge = [...history].reverse().map((m) => (m.payload as { age?: ParsedAge } | null)?.age).find(Boolean) ?? null;
  const effectiveAge = age ?? previousAge;

  const handbook = await handbookStatus(db, lang);
  const retrieval = await findRelevantMilestones(db, question, matchLang, { age: effectiveAge, previousCodes, limit: 5 });
  const isConcern = CONCERN.test(question);
  const isSafety = SAFETY.test(question);

  const base = {
    conversationId: conversation.id, language: lang, questionLanguage: detected, age: effectiveAge, disclaimer: DISCLAIMER[lang],
    videoNotice: null as string | null, evidence: [] as ChatAnswer["evidence"], sourceNotice: null as string | null,
    grounding: {
      topSimilarity: Number(retrieval.topSimilarity.toFixed(4)), topKeywordScore: Number(retrieval.topKeywordScore.toFixed(2)),
      evidenceCoverage: Number(retrieval.evidenceCoverage.toFixed(2)),
      evidenceSimilarity: Number(retrieval.evidenceSimilarity.toFixed(4)),
      queryTerms: retrieval.queryTerms, indexSize: retrieval.indexSize,
      candidates: retrieval.candidates.map((c) => ({ code: c.code, score: Number(c.score.toFixed(4)), reasons: c.reasons })), llmModel: null as string | null,
    },
  };

  const persist = async (answer: Omit<ChatAnswer, "messageId">): Promise<ChatAnswer> => {
    await db.message.create({ data: { conversationId: conversation!.id, role: "user", content: question } });
    const msg = await db.message.create({
      data: {
        conversationId: conversation!.id, role: "assistant", content: answer.explanation,
        payload: {
          milestoneCode: answer.milestone?.code ?? null, age: answer.age, activityCodes: answer.activities.map((a) => a.code),
          videoIds: answer.videos.map((v) => v.videoId), status: answer.status, grounding: answer.grounding,
        } as never,
      },
    });
    await db.conversation.update({ where: { id: conversation!.id }, data: { updatedAt: new Date() } });
    logger.info({ q: hashForLog(question), qLen: question.length, lang, status: answer.status, milestone: answer.milestone?.code, ms: Date.now() - t0, source: answer.explanationSource }, "chat: answered");
    return { ...answer, messageId: msg.id };
  };

  const safety = isSafety ? SAFETY_NOTE[lang] : isConcern ? CONCERN_NOTE[lang] : null;
  if (handbook.state === "not_indexed") {
    return persist({
      ...base, status: "source_unavailable", explanation: SOURCE_UNAVAILABLE[lang], explanationSource: "none", milestone: null,
      relatedMilestones: [], activities: [], videos: [], videoMatch: "none", sources: [], followUps: [], safetyNote: safety,
    });
  }
  const top = retrieval.candidates[0];
  if (!retrieval.grounded || !top) {
    return persist({
      ...base, status: "not_covered", explanation: NOT_COVERED[lang], explanationSource: "none", milestone: null, relatedMilestones: [],
      activities: [], videos: [], videoMatch: "none", sources: [], followUps: [],
      safetyNote: isSafety ? SAFETY_NOTE[lang] : isConcern ? CONCERN_NOTE[lang] : null,
    });
  }

  const milestone = (await getMilestoneDetails(db, top.code, lang))!;
  if (milestone.missingInLanguage) {
    // the matched milestone has no text in the selected handbook: say so, never show the other language
    return persist({
      ...base, status: "not_covered", explanation: NOT_COVERED[lang], explanationSource: "none", milestone: null,
      relatedMilestones: [], activities: [], videos: [], videoMatch: "none", sources: [], followUps: [], safetyNote: safety,
    });
  }
  const exercises = rankExercises(await getMilestoneActivities(db, top.code, lang), retrieval, top.code);
  const relatedCodes = retrieval.candidates.slice(1, 3).filter((c) => c.score >= top.score * 0.6).map((c) => c.code);
  const related = relatedCodes.length ? await listMilestones(db, lang, { codes: relatedCodes }) : [];

  // ---- explanation + activity selection ----
  const excerpts: GroundingExcerpt[] = [
    { ref: `M:${milestone.code}`, milestoneCode: milestone.code, activityCode: null, title: milestone.title ?? milestone.code, text: [milestone.summary, milestone.expectedAge, milestone.guidance].filter(Boolean).join("\n") },
    ...exercises.slice(0, 7).map((e) => ({ ref: `A:${e.code}`, milestoneCode: milestone.code, activityCode: e.code, title: e.title, text: (e.instructions ?? "").slice(0, 700) })),
  ];
  let explanation = extractiveExplanation(milestone);
  let explanationSource: ChatAnswer["explanationSource"] = "extractive";
  let chosen = exercises.slice(0, 3);
  let followUps: string[] = [];
  let safetyNote: string | null = isSafety ? SAFETY_NOTE[lang] : isConcern ? CONCERN_NOTE[lang] : null;

  if (llmEnabled()) {
    try {
      const llm = await composeAnswer({
        question, language: lang, ageText: effectiveAge?.text ?? null, excerpts,
        history: history.slice(-4).map((m) => ({ role: m.role, content: m.content.slice(0, 600) })),
      });
      const allowed = new Map(exercises.map((e) => [e.code, e]));
      const invalid = llm.activityCodes.filter((c) => !allowed.has(c));
      if (invalid.length) logger.warn({ invalid }, "chat: model returned codes outside the allowed set (dropped)");
      const picked = llm.activityCodes.filter((c) => allowed.has(c)).map((c) => allowed.get(c)!);
      if (llm.explanation.trim()) {
        explanation = llm.explanation.trim();
        explanationSource = "llm";
        base.grounding.llmModel = process.env.ANTHROPIC_MODEL || "claude-opus-5-5";
      }
      if (picked.length) chosen = picked.slice(0, 4);
      followUps = llm.followUps;
      if (llm.safetyNote) safetyNote = [isSafety ? SAFETY_NOTE[lang] : null, llm.safetyNote].filter(Boolean).join(" ");
      if (!llm.coveredByHandbook && retrieval.topSimilarity < 0.84) {
        return persist({
          ...base, status: "not_covered", explanation: llm.explanation || NOT_COVERED[lang], explanationSource: "llm", milestone: null,
          relatedMilestones: [], activities: [], videos: [], videoMatch: "none", sources: [], followUps: [], safetyNote,
        });
      }
    } catch (err) {
      if (!(err instanceof LlmUnavailableError)) throw err;
      logger.warn({ reason: err.message }, "chat: LLM unavailable, using extractive answer");
    }
  }
  if (!followUps.length) followUps = templateFollowUps(lang, milestone, exercises.filter((e) => !chosen.includes(e)), related);

  // ---- videos: deterministic SQL on the Excel mapping ----
  const segmentHits = (top.hits ?? []).filter((h) => h.chunkType === "video_segment" && h.activityCode).map((h) => h.activityCode!);
  const linkedSegments = chosen.flatMap((e) => e.relatedSegments.map((s) => s.code));
  const focusSegments = [...new Set([...segmentHits.slice(0, 2), ...linkedSegments])];
  const allVideos = await getMappedVideos(db, milestone.code, { language: lang });
  const focus = new Set(focusSegments);
  const videos = allVideos
    .map((v) => ({ ...v, highlighted: v.activityCode !== null && focus.has(v.activityCode) }))
    .sort((a, b) => Number(b.highlighted) - Number(a.highlighted) || (a.sequence ?? 0) - (b.sequence ?? 0));

  const activityRefs = await getSourceReferences(db, milestone.code, lang, { activityCodes: chosen.map((c) => c.code) });
  const sources = [...milestone.sources, ...activityRefs.filter((r) => r.activityCode)];
  const main = milestone.sources[0];
  const evidence: ChatAnswer["evidence"] = [
    ...(explanationSource === "extractive" ? [{ section: milestone.title ?? milestone.code, text: explanation, page: main?.printedPage ?? null, url: main?.url ?? null }] : []),
    ...chosen.map((e) => ({ section: e.title, text: e.instructions ?? "", page: e.source?.printedPage ?? null, url: e.source?.url ?? null })),
  ];
  base.evidence = evidence;
  if (handbook.state === "file_unavailable") base.sourceNotice = FILE_UNAVAILABLE[lang];
  if (!videos.length) base.videoNotice = NO_VIDEO_IN_LANGUAGE[lang];

  return persist({
    ...base, status: "answered", explanation, explanationSource, milestone, relatedMilestones: related,
    activities: chosen, videos, videoMatch: videos.some((v) => v.highlighted) ? "activity" : videos.length ? "milestone" : "none",
    sources, followUps, safetyNote,
  });
}
