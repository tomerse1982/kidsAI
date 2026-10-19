/**
 * Post-deploy smoke test against a running server (catches production-build-only
 * problems that unit tests run from source cannot see).
 *   BASE_URL=https://example.org npx tsx scripts/smoke.ts
 */
const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const CASES = [
  { question: "שימוש בצעצועים בולטים ומושכי עין לתינוק", language: "he", milestone: "1.1", segment: "1.1.3" },
  { question: "استعمال ألعاب بارزة وملفتة للنظر للرضيع", language: "ar", milestone: "1.1", segment: "1.1.3" },
  { question: "كيف أشجّع الطفل على الأكل بالملعقة؟", language: "ar", milestone: "6.4" },
  { question: "מה המתכון לעוגת שוקולד?", language: "he", milestone: null },
];

async function main() {
  let failed = 0;
  const health = await fetch(`${BASE}/api/health`).then((r) => r.json());
  console.log("health", JSON.stringify(health));
  for (const c of CASES) {
    const res = await fetch(`${BASE}/api/chat`, { method: "POST", headers: { "Content-Type": "application/json; charset=utf-8" }, body: JSON.stringify({ question: c.question, language: c.language }) });
    const a = await res.json();
    const got = a.milestone?.code ?? null;
    const segOk = !c.segment || a.videos.some((v: { activityCode: string; highlighted: boolean }) => v.activityCode === c.segment && v.highlighted);
    const ok = res.ok && got === c.milestone && segOk && (c.milestone === null || a.grounding.queryTerms.length > 0);
    if (!ok) failed++;
    console.log(ok ? "ok  " : "FAIL", c.language, c.question, "->", got, a.grounding?.queryTerms?.slice(0, 3));
  }
  const pdf = await fetch(`${BASE}/api/sources/handbook-he/pdf`, { method: "HEAD" });
  console.log(pdf.ok ? "ok  " : "FAIL", "handbook pdf", pdf.status);
  if (!pdf.ok) failed++;
  process.exit(failed ? 1 : 0);
}
main();
