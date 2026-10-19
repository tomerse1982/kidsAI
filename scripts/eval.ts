/**
 * Repeatable retrieval/answer evaluation. Writes docs/reports/eval-report.{json,md}.
 *   npx tsx scripts/eval.ts            (uses LLM_PROVIDER from .env)
 *   DATABASE_URL=... npx tsx scripts/eval.ts
 * Per case: expected vs retrieved milestone, chosen activities, selected videos,
 * citation document/language, and grounding status. Errors are reported, never masked.
 */
import "dotenv/config";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { answerQuestion } from "@/server/chat/answer";
import { llmEnabled } from "@/server/ai/llm";
import { getMappedVideos } from "@/server/knowledge/queries";
import { createPrisma } from "@/server/prisma-factory";

interface Case { id: string; lang: "he" | "ar"; q: string; expected: string[]; expectedVideoSegment?: string; expectNotCovered?: boolean; type: string }

async function main() {
  const { cases } = JSON.parse(readFileSync("tests/eval/questions.json", "utf8")) as { cases: Case[] };
  const db = createPrisma();
  const results = [];
  for (const c of cases) {
    const t0 = Date.now();
    try {
      const a = await answerQuestion(db, { question: c.q, uiLanguage: c.lang, clientId: "00000000-0000-4000-8000-0000000e7a1e" });
      const retrieved = a.milestone?.code ?? null;
      const top3 = a.grounding.candidates.slice(0, 3).map((x) => x.code);
      const mapped = retrieved ? new Set((await getMappedVideos(db, retrieved, { language: c.lang })).map((v) => v.videoId)) : new Set<string>();
      const highlighted = a.videos.filter((v) => v.highlighted).map((v) => v.activityCode);
      const r = {
        id: c.id, lang: c.lang, type: c.type, question: c.q,
        expected: c.expected, retrieved, top3,
        milestoneTop1: c.expectNotCovered ? null : retrieved !== null && c.expected.includes(retrieved),
        milestoneTop3: c.expectNotCovered ? null : top3.some((x) => c.expected.includes(x)),
        notCoveredCorrect: c.expectNotCovered ? a.status === "not_covered" : a.status !== "not_covered",
        activities: a.activities.map((x) => x.code),
        videos: a.videos.slice(0, 4).map((v) => `${v.activityCode}:${v.videoId}:${v.language}/${v.audience}`),
        expectedVideoSegment: c.expectedVideoSegment ?? null,
        videoSegmentHit: c.expectedVideoSegment ? highlighted.includes(c.expectedVideoSegment) : null,
        videosAllMapped: a.videos.every((v) => mapped.has(v.videoId)),
        citation: a.sources[0] ? `${a.sources[0].documentKey} p.${a.sources[0].printedPage}` : null,
        citationLanguageCorrect: a.sources.every((s) => s.language === c.lang),
        grounded: a.status === "answered" ? a.explanationSource : "not_covered",
        topSimilarity: a.grounding.topSimilarity,
        coverage: a.grounding.evidenceCoverage,
        answerLanguageCorrect: a.language === c.lang && a.sources.every((s) => s.language === c.lang) && a.videos.every((v) => v.language === c.lang),
        ms: Date.now() - t0,
        error: null as string | null,
      };
      results.push(r);
      console.log(`${c.id} sim=${a.grounding.topSimilarity} esim=${a.grounding.evidenceSimilarity} cov=${a.grounding.evidenceCoverage} ${r.milestoneTop1 ?? r.notCoveredCorrect ? "ok " : "MISS"} expected=${c.expected.join("|") || "not_covered"} got=${retrieved ?? a.status} top3=${top3.join(",")}`);
    } catch (err) {
      results.push({ id: c.id, lang: c.lang, type: c.type, question: c.q, error: (err as Error).message });
      console.log(`${c.id} ERROR ${(err as Error).message}`);
    }
  }
  await db.$disconnect();

  const scored = results.filter((r) => !("error" in r && r.error));
  const inScope = scored.filter((r) => (r as { milestoneTop1: boolean | null }).milestoneTop1 !== null) as { milestoneTop1: boolean; milestoneTop3: boolean; lang: string; type: string }[];
  const rate = (xs: boolean[]) => (xs.length ? Math.round((xs.filter(Boolean).length / xs.length) * 1000) / 10 : null);
  const summary = {
    generatedAt: new Date().toISOString(),
    answerMode: llmEnabled() ? `anthropic (${process.env.ANTHROPIC_MODEL || "claude-opus-5-5"})` : "extractive (no LLM)",
    cases: results.length,
    errors: results.filter((r) => "error" in r && r.error).length,
    milestoneTop1: rate(inScope.map((r) => r.milestoneTop1)),
    milestoneTop3: rate(inScope.map((r) => r.milestoneTop3)),
    byLanguage: Object.fromEntries(["he", "ar"].map((l) => [l, { top1: rate(inScope.filter((r) => r.lang === l).map((r) => r.milestoneTop1)), n: inScope.filter((r) => r.lang === l).length }])),
    byType: Object.fromEntries(["broad", "specific", "video", "cross_language"].map((t) => [t, rate(inScope.filter((r) => r.type === t).map((r) => r.milestoneTop1))])),
    nearDomainRefused: rate(scored.filter((r) => (r as { type: string }).type === "near_domain").map((r) => (r as { notCoveredCorrect: boolean }).notCoveredCorrect)),
    answerLanguageCorrect: rate(scored.map((r) => (r as { answerLanguageCorrect: boolean }).answerLanguageCorrect)),
    offTopicCorrect: rate(scored.filter((r) => (r as { type: string }).type === "off_topic").map((r) => (r as { notCoveredCorrect: boolean }).notCoveredCorrect)),
    inScopeAnswered: rate(inScope.map((r) => (r as unknown as { notCoveredCorrect: boolean }).notCoveredCorrect)),
    videoSegmentHit: rate(scored.filter((r) => (r as { videoSegmentHit: boolean | null }).videoSegmentHit !== null).map((r) => (r as { videoSegmentHit: boolean }).videoSegmentHit)),
    allVideosFromMapping: scored.every((r) => (r as { videosAllMapped: boolean }).videosAllMapped),
    citationLanguageCorrect: rate(scored.map((r) => (r as { citationLanguageCorrect: boolean }).citationLanguageCorrect)),
  };
  mkdirSync("docs/reports", { recursive: true });
  writeFileSync("docs/reports/eval-report.json", JSON.stringify({ summary, results }, null, 2));
  const rows = results.map((r) => {
    const x = r as Record<string, unknown>;
    if (x.error) return `| ${x.id} | ${x.lang} | ${x.type} | ERROR: ${x.error} | | | | |`;
    const ok = x.milestoneTop1 === null ? (x.notCoveredCorrect ? "✅" : "❌") : x.milestoneTop1 ? "✅" : x.milestoneTop3 ? "🟡 top-3" : "❌";
    return `| ${x.id} | ${x.lang} | ${x.type} | ${(x.expected as string[]).join(", ") || "not covered"} | ${x.retrieved ?? "not covered"} ${ok} | ${(x.activities as string[]).slice(0, 2).join(", ")} | ${x.expectedVideoSegment ? `${x.expectedVideoSegment} ${x.videoSegmentHit ? "✅" : "❌"}` : (x.videos as string[])[0] ?? "—"} | ${x.citation ?? "—"} |`;
  });
  const md = `# Retrieval & answer evaluation

Generated: ${summary.generatedAt} · answer mode: **${summary.answerMode}** · cases: ${summary.cases} · errors: ${summary.errors}

| Metric | Value |
|---|---|
| Milestone top-1 accuracy (in-scope) | ${summary.milestoneTop1}% |
| Milestone top-3 recall (in-scope) | ${summary.milestoneTop3}% |
| Hebrew top-1 / Arabic top-1 | ${summary.byLanguage.he.top1}% (n=${summary.byLanguage.he.n}) / ${summary.byLanguage.ar.top1}% (n=${summary.byLanguage.ar.n}) |
| Broad / specific / video-targeted top-1 | ${summary.byType.broad}% / ${summary.byType.specific}% / ${summary.byType.video}% |
| Off-topic questions refused (not_covered) | ${summary.offTopicCorrect}% |
| Near-domain questions the handbooks do not answer, refused | ${summary.nearDomainRefused}% |
| Answers, sources and videos all in the selected language | ${summary.answerLanguageCorrect}% |
| In-scope questions answered | ${summary.inScopeAnswered}% |
| Expected sub-milestone video highlighted | ${summary.videoSegmentHit}% |
| Every shown video exists in the Excel mapping | ${summary.allVideosFromMapping ? "yes" : "NO"} |
| Citations in the question's language | ${summary.citationLanguageCorrect}% |

| Case | Lang | Type | Expected | Retrieved | Activities | Video | Citation |
|---|---|---|---|---|---|---|---|
${rows.join("\n")}
`;
  writeFileSync("docs/reports/eval-report.md", md);
  console.log(JSON.stringify(summary, null, 1));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
