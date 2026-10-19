/**
 * Strict language selection, Hebrew video linking and grounding in the PDFs.
 * Numbers in the test names refer to the scenarios of the 2026-10-13 task (section 6).
 * Runs on the test database with both handbooks and both video workbooks imported.
 */
import { describe, expect, it } from "vitest";
import { answerQuestion } from "@/server/chat/answer";
import { getMappedVideos, getMilestoneDetails, resetSourceFileCache } from "@/server/knowledge/queries";
import { testDb } from "./helpers";

const CLIENT = "44444444-4444-4444-8444-444444444444";
const ask = (question: string, uiLanguage: "he" | "ar") => answerQuestion(testDb(), { question, uiLanguage, clientId: CLIENT });

const NO_INFO_HE = "לא נמצא מידע רלוונטי לשאלה במסמכים הזמינים. אפשר לנסח את השאלה מחדש או לעיין במסמכים הקיימים.";
const NO_INFO_AR = "لم يتم العثور على معلومات ذات صلة بالسؤال في المستندات المتاحة. يمكن إعادة صياغة السؤال أو تصفّح المستندات المتوفرة.";

/** Every displayed item of an answer is in `lang`. */
function expectSingleLanguage(a: Awaited<ReturnType<typeof ask>>, lang: "he" | "ar") {
  expect(a.language).toBe(lang);
  expect(a.videos.every((v) => v.language === lang)).toBe(true);
  expect(a.sources.every((s) => s.language === lang && s.documentKey === `handbook-${lang}`)).toBe(true);
  expect(a.activities.every((x) => x.language === lang)).toBe(true);
  const otherScript = lang === "he" ? /[ء-ي]/ : /[א-ת]/;
  expect(otherScript.test(a.explanation)).toBe(false);
  for (const e of a.evidence) expect(otherScript.test(e.text)).toBe(false);
}

describe("Hebrew videos and strict language", () => {
  it("1. Hebrew selected + a Hebrew video exists: the matching Hebrew video is shown, no Arabic one", async () => {
    const a = await ask("שימוש בצעצועים בולטים ומושכי עין לתינוק", "he");
    expect(a.milestone?.code).toBe("1.1");
    expectSingleLanguage(a, "he");
    const v = a.videos.find((x) => x.videoId === "j312B6F7PUI"); // סדרה 1!E4 (educator, 1.1.3)
    expect(v).toMatchObject({ activityCode: "1.1.3", audience: "educator", language: "he", highlighted: true, canonicalUrl: "https://youtu.be/j312B6F7PUI" });
    expect(a.videos.some((x) => x.videoId === "e4RsJQ4yJMo")).toBe(false); // the Arabic 1.1.3 video
    expect(a.videoNotice).toBeNull();
  });

  it("2. Hebrew selected + no Hebrew video: no substitute in another language, an explicit notice instead", async () => {
    const db = testDb();
    const ids = (await db.activityVideoMapping.findMany({ where: { language: "he", isActive: true, milestone: { milestoneCode: "2.2" } }, select: { id: true } })).map((m) => m.id);
    expect(ids.length).toBeGreaterThan(0);
    await db.activityVideoMapping.updateMany({ where: { id: { in: ids } }, data: { isActive: false } });
    try {
      const a = await ask("איך לעודד תינוק להגיב לקולות וצלילים?", "he");
      expect(a.milestone?.code).toBe("2.2");
      expect(a.videos).toEqual([]);
      expect(a.videoNotice).toBe("לא נמצא סרטון הדרכה בעברית לאבן דרך זו.");
      expect(await getMappedVideos(db, "2.2", { language: "ar" })).not.toHaveLength(0); // Arabic exists, but is not shown
    } finally {
      await db.activityVideoMapping.updateMany({ where: { id: { in: ids } }, data: { isActive: true } });
    }
  });

  it("3. another language selected (Arabic): Hebrew videos are excluded everywhere", async () => {
    const a = await ask("استعمال ألعاب بارزة وملفتة للنظر للرضيع", "ar");
    expectSingleLanguage(a, "ar");
    expect(a.videos.some((v) => v.videoId === "j312B6F7PUI")).toBe(false);
    expect(a.videos.find((v) => v.activityCode === "1.1.3")?.videoId).toBe("e4RsJQ4yJMo");
    for (const code of ["1.1", "4.7", "7.2"]) {
      expect((await getMappedVideos(testDb(), code, { language: "ar" })).every((v) => v.language === "ar")).toBe(true);
    }
  });

  it("4. videos from every worksheet of the Hebrew workbook are discoverable", async () => {
    const db = testDb();
    for (let n = 1; n <= 8; n++) {
      const m = await db.activityVideoMapping.findFirst({ where: { language: "he", sourceSheet: `סדרה ${n}`, isActive: true }, include: { milestone: true, video: true } });
      expect(m, `סדרה ${n}`).not.toBeNull();
      const shown = await getMappedVideos(db, m!.milestone.milestoneCode, { language: "he" });
      expect(shown.some((v) => v.videoId === m!.video.providerVideoId), `סדרה ${n}`).toBe(true);
    }
    // milestones 4.7-4.10 had no Arabic videos; the Hebrew workbook covers them
    expect((await getMappedVideos(db, "4.7", { language: "he" })).length).toBeGreaterThan(0);
    expect(await getMappedVideos(db, "4.7", { language: "ar" })).toEqual([]);
  });

  it("5. several relevant videos: all shown, educator and parent versions, without duplicates", async () => {
    const videos = await getMappedVideos(testDb(), "4.1", { language: "he" });
    const ids = videos.map((v) => v.videoId);
    expect(new Set(ids).size).toBe(ids.length);
    expect(videos.some((v) => v.audience === "educator")).toBe(true);
    expect(videos.some((v) => v.audience === "parent")).toBe(true);
    // סדרה 4: the same parent video is linked from 4.1.2 and 4.1.3 -> shown once, both codes listed
    const shared = videos.find((v) => v.videoId === "ymm3UXBjvys");
    expect(shared?.activityCode).toBe("4.1.2");
    expect(shared?.alsoFor).toContain("4.1.3");
  });

  it("hides videos whose language or mapping is contradicted, and unavailable videos", async () => {
    const db = testDb();
    const target = await db.video.findUniqueOrThrow({ where: { provider_providerVideoId: { provider: "youtube", providerVideoId: "j312B6F7PUI" } } });
    for (const patch of [{ languageStatus: "conflict" }, { availabilityStatus: "unavailable" as const }]) {
      await db.video.update({ where: { id: target.id }, data: patch });
      try {
        expect((await getMappedVideos(db, "1.1", { language: "he" })).some((v) => v.videoId === "j312B6F7PUI")).toBe(false);
        expect((await getMappedVideos(db, "1.1", { language: "ar" })).some((v) => v.videoId === "j312B6F7PUI")).toBe(false);
      } finally {
        await db.video.update({ where: { id: target.id }, data: { languageStatus: target.languageStatus, availabilityStatus: target.availabilityStatus } });
      }
    }
    const mapping = await db.activityVideoMapping.findFirstOrThrow({ where: { video: { providerVideoId: "j312B6F7PUI" } } });
    await db.activityVideoMapping.update({ where: { id: mapping.id }, data: { confidenceStatus: "conflict" } });
    try {
      expect((await getMappedVideos(db, "1.1", { language: "he" })).some((v) => v.videoId === "j312B6F7PUI")).toBe(false);
    } finally {
      await db.activityVideoMapping.update({ where: { id: mapping.id }, data: { confidenceStatus: mapping.confidenceStatus } });
    }
  });

  it("shows a video whose YouTube title names another sub-milestone of the same milestone only at milestone level", async () => {
    const db = testDb();
    const mapping = await db.activityVideoMapping.findFirstOrThrow({ where: { language: "he", activity: { activityCode: "1.1.4" }, audience: "educator" }, include: { video: true } });
    const notes = mapping.validationNotes as object[];
    await db.activityVideoMapping.update({ where: { id: mapping.id }, data: { validationNotes: [...notes, { check: "youtube_title", result: "mismatch", scope: "same_milestone" }] as never } });
    try {
      const v = (await getMappedVideos(db, "1.1", { language: "he" })).find((x) => x.videoId === mapping.video.providerVideoId);
      expect(v).toMatchObject({ activityCode: null, title: null }); // not tied to 1.1.4, no segment title
    } finally {
      await db.activityVideoMapping.update({ where: { id: mapping.id }, data: { validationNotes: notes as never } });
    }
  });

  it("10. a missing / invalid link in the workbook produces no mapping and no invented URL", async () => {
    const db = testDb();
    // סדרה 7 row 49 (7.5.1): the parent column L contains the text "חסר?" instead of a link
    expect(await db.activityVideoMapping.count({ where: { language: "he", audience: "parent", activity: { activityCode: "7.5.1" } } })).toBe(0);
    expect(await db.activityVideoMapping.count({ where: { language: "he", audience: "educator", activity: { activityCode: "7.5.1" } } })).toBe(1); // column E is valid
    const issue = await db.importIssue.findFirst({ where: { code: "invalid_video_identifier", worksheet: "סדרה 7", rowNumber: 49 } });
    expect(issue?.message).toMatch(/not imported, nothing substituted/);
    // every stored Hebrew video URL is exactly the canonical form of its own id
    const bad = await db.$queryRawUnsafe<{ n: number }[]>(`SELECT count(*)::int AS n FROM videos WHERE language = 'he' AND canonical_url <> 'https://youtu.be/' || provider_video_id`);
    expect(bad[0].n).toBe(0);
  });

  it("11. switching language returns content only in the new language (nothing left from the previous one)", async () => {
    const db = testDb();
    const he = await answerQuestion(db, { question: "איך מלמדים פעוט לעלות במדרגות?", uiLanguage: "he", clientId: CLIENT });
    const ar = await answerQuestion(db, { question: "איך מלמדים פעוט לעלות במדרגות?", uiLanguage: "ar", clientId: CLIENT, conversationId: he.conversationId });
    expectSingleLanguage(he, "he");
    expectSingleLanguage(ar, "ar"); // same Hebrew question, Arabic selected -> Arabic handbook and videos
    expect(ar.milestone?.code).toBe(he.milestone?.code);
    expect(ar.videos.some((v) => he.videos.some((h) => h.videoId === v.videoId))).toBe(false);
  });
});

describe("answers grounded in the PDFs", () => {
  it("6. when the PDF contains the answer, the response quotes it with document and page", async () => {
    const a = await ask("איך לעודד פעוט לאכול לבד עם כפית?", "he");
    expect(a.status).toBe("answered");
    expect(a.milestone?.code).toBe("6.4");
    const details = (await getMilestoneDetails(testDb(), "6.4", "he"))!;
    const sourceText = [details.summary, details.explanation, details.expectedAge].join(" ");
    for (const sentence of a.explanation.split(/(?<=[.!?])\s+/)) expect(sourceText).toContain(sentence.trim());
    expect(a.sources[0]).toMatchObject({ documentKey: "handbook-he", printedPage: 88 });
    expect(a.evidence.length).toBeGreaterThan(0);
    for (const e of a.evidence.slice(1)) expect(a.activities.some((x) => x.instructions === e.text)).toBe(true);
  });

  it("7. when no document contains the answer: the no-information message in the selected language", async () => {
    for (const [q, lang, msg] of [
      ["איך מורידים חום גבוה לתינוק?", "he", NO_INFO_HE],
      ["כמה שעות שינה צריך תינוק בן שנה?", "he", NO_INFO_HE],
      ["كيف أخفّض حرارة الطفل المرتفعة؟", "ar", NO_INFO_AR],
    ] as const) {
      const a = await ask(q, lang);
      expect(a.status, q).toBe("not_covered");
      expect(a.explanation).toBe(msg);
      expect(a.milestone).toBeNull();
      expect(a.videos).toEqual([]);
      expect(a.sources).toEqual([]);
      expect(a.evidence).toEqual([]);
    }
  });

  it("8. partially covered question: only sentences present in the handbook are returned", async () => {
    // the handbook covers visual tracking but says nothing about which colour of toy is best
    const a = await ask("מתי תינוקות מתחילים לעקוב במבט אחרי חפצים, ואיזה צבע צעצוע הכי טוב לזה?", "he");
    if (a.status === "answered") {
      const d = (await getMilestoneDetails(testDb(), a.milestone!.code, "he"))!;
      const source = [d.summary, d.explanation, d.expectedAge, d.guidance].join(" ");
      for (const sentence of a.explanation.split(/(?<=[.!?])\s+/)) expect(source).toContain(sentence.trim());
      expect(a.explanationSource).toBe("extractive");
    } else {
      expect(a.explanation).toBe(NO_INFO_HE);
    }
  });

  it("9a. handbook in the selected language not indexed: the limitation is reported, nothing else is shown", async () => {
    const db = testDb();
    const doc = await db.sourceDocument.findUniqueOrThrow({ where: { documentKey: "handbook-ar" } });
    await db.sourceDocument.update({ where: { id: doc.id }, data: { currentVersionId: null } });
    try {
      const a = await ask("كيف أشجّع الطفل على الأكل بالملعقة؟", "ar");
      expect(a.status).toBe("source_unavailable");
      expect(a.explanation).toMatch(/غير متاح/);
      expect(a.milestone).toBeNull();
      expect(a.videos).toEqual([]);
      expect(a.sources).toEqual([]);
    } finally {
      await db.sourceDocument.update({ where: { id: doc.id }, data: { currentVersionId: doc.currentVersionId } });
    }
  });

  it("9b. PDF file missing on disk: answer from the indexed text, no dead page links, limitation stated", async () => {
    const db = testDb();
    const doc = await db.sourceDocument.findUniqueOrThrow({ where: { documentKey: "handbook-he" } });
    await db.sourceDocument.update({ where: { id: doc.id }, data: { storagePath: `${doc.storagePath}.missing` } });
    resetSourceFileCache();
    try {
      const a = await ask("איך לעודד פעוט לאכול לבד עם כפית?", "he");
      expect(a.status).toBe("answered");
      expect(a.sources.every((s) => s.url === null)).toBe(true);
      expect(a.sourceNotice).toMatch(/אינו זמין/);
    } finally {
      await db.sourceDocument.update({ where: { id: doc.id }, data: { storagePath: doc.storagePath } });
      resetSourceFileCache();
    }
  });
});
