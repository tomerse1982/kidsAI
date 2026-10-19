/**
 * Checks the curated question bank against the live answer pipeline:
 * every question should be answered (not "not covered") with its own milestone first.
 *   npx tsx scripts/check-question-bank.ts [--language=he|ar]
 * Writes docs/reports/question-bank-report.json. Conversations created by the check are deleted.
 */
import "dotenv/config";
import { mkdirSync, writeFileSync } from "node:fs";
import type { Lang } from "@/lib/i18n";
import { bankQuestions } from "@/lib/question-bank";
import { answerQuestion } from "@/server/chat/answer";
import { createPrisma } from "@/server/prisma-factory";

const CLIENT_ID = "00000000-0000-4000-8000-00000000b4a7";

async function main() {
  const only = process.argv.find((a) => a.startsWith("--language="))?.split("=")[1] as Lang | undefined;
  const db = createPrisma();
  const results: { id: string; lang: Lang; expected: string; text: string; status: string; got: string | null; top3: string[]; top1: boolean; inTop3: boolean }[] = [];
  try {
    for (const lang of (only ? [only] : ["he", "ar"]) as Lang[]) {
      for (const q of bankQuestions(lang)) {
        const a = await answerQuestion(db, { question: q.text, uiLanguage: lang, clientId: CLIENT_ID });
        const top3 = a.grounding.candidates.slice(0, 3).map((c) => c.code);
        const r = { id: q.id, lang, expected: q.milestoneCode, text: q.text, status: a.status, got: a.milestone?.code ?? null, top3, top1: a.milestone?.code === q.milestoneCode, inTop3: top3.includes(q.milestoneCode) };
        results.push(r);
        console.log(`${r.top1 ? "ok  " : r.inTop3 ? "top3" : "MISS"} ${q.id} got=${r.got ?? a.status} top3=${top3.join(",")} ${q.text}`);
      }
    }
  } finally {
    await db.conversation.deleteMany({ where: { clientId: CLIENT_ID } });
    await db.$disconnect();
  }
  const rate = (xs: boolean[]) => (xs.length ? Math.round((xs.filter(Boolean).length / xs.length) * 1000) / 10 : null);
  const summary = Object.fromEntries(["he", "ar"].map((l) => {
    const rs = results.filter((r) => r.lang === l);
    return [l, { n: rs.length, answered: rate(rs.map((r) => r.status === "answered")), top1: rate(rs.map((r) => r.top1)), top3: rate(rs.map((r) => r.inTop3)) }];
  }));
  mkdirSync("docs/reports", { recursive: true });
  writeFileSync("docs/reports/question-bank-report.json", JSON.stringify({ generatedAt: new Date().toISOString(), summary, results }, null, 2));
  console.log(JSON.stringify(summary));
}
main();
