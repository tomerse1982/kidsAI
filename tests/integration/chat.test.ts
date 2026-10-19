import { describe, expect, it } from "vitest";
import { answerQuestion } from "@/server/chat/answer";
import { getMappedVideos } from "@/server/knowledge/queries";
import { testDb } from "./helpers";

const ask = (question: string, uiLanguage: "he" | "ar" = "he") => answerQuestion(testDb(), { question, uiLanguage, clientId: "11111111-1111-4111-8111-111111111111" });

describe("bilingual retrieval and answers", () => {
  it("maps equivalent Hebrew and Arabic questions to the same canonical milestone", async () => {
    const he = await ask("איך לעודד תינוק לעקוב במבט אחרי עצם נע או פנים?");
    const ar = await ask("كيف نشجّع الطفل على تتبّع جسم متحرك أو وجه بنظره؟", "ar");
    expect(he.milestone?.code).toBe("1.1");
    expect(ar.milestone?.code).toBe("1.1");
  });

  it("answers Hebrew questions from the Hebrew handbook and Arabic questions from the Arabic one", async () => {
    const he = await ask("איך מלמדים פעוט לעלות במדרגות?");
    const ar = await ask("ما هي أفضل طريقة لتعليم الطفل الأكل بالملعقة؟", "ar");
    expect(he.language).toBe("he");
    expect(he.sources.every((s) => s.documentKey === "handbook-he" && s.language === "he")).toBe(true);
    expect(he.activities.every((a) => a.language === "he")).toBe(true);
    expect(ar.language).toBe("ar");
    expect(ar.milestone?.code).toBe("6.4");
    expect(ar.sources.every((s) => s.documentKey === "handbook-ar" && s.language === "ar")).toBe(true);
  });

  it("cites the correct handbook page", async () => {
    const a = await ask("צעצועים בולטים ומושכי עין לתינוק");
    expect(a.milestone?.code).toBe("1.1");
    expect(a.sources[0]).toMatchObject({ documentKey: "handbook-he", pdfPageIndex: 8, printedPage: 8 });
    expect(a.sources[0].url).toBe("/api/sources/handbook-he/pdf#page=9");
  });

  it("prioritises the specific sub-milestone video (1.1.3) in the selected language only", async () => {
    const a = await ask("צעצועים בולטים ומושכי עין לתינוק");
    // one video per answer: the educator version only (the parent version P.1.1.3 is not added)
    expect(a.videos).toHaveLength(1);
    expect(a.videos[0]).toMatchObject({ videoId: "j312B6F7PUI", activityCode: "1.1.3", audience: "educator", language: "he", highlighted: true });
  });

  it("returns exactly one video per answer in Hebrew and in Arabic", async () => {
    for (const [q, lang] of [
      ["איך לעודד תינוק לעקוב במבט אחרי חפצים?", "he"], ["איך לעודד פעוט לאכול לבד עם כפית?", "he"],
      ["استعمال ألعاب بارزة وملفتة للنظر للرضيع", "ar"], ["كيف أشجّع الطفل على الأكل بالملعقة؟", "ar"],
    ] as const) {
      const a = await ask(q, lang);
      expect(a.status, q).toBe("answered");
      expect(a.videos, q).toHaveLength(1);
      expect(a.videos[0].language, q).toBe(lang);
    }
  });

  it("returns only videos that exist in the mapping table for the chosen milestone", async () => {
    for (const q of ["איך לעודד תינוק לעקוב במבט אחרי חפצים?", "תינוק לא מרים ראש בשכיבה על הבטן", "ما الأنشطة التي تساعد الرضيع على متابعة الأشياء بعينيه؟"]) {
      const a = await ask(q);
      if (!a.milestone) continue;
      const mapped = new Set((await getMappedVideos(testDb(), a.milestone.code, { language: a.language })).map((v) => v.videoId));
      expect(a.videos.every((v) => mapped.has(v.videoId))).toBe(true);
    }
  });

  it("does not fabricate content or links for questions outside the handbooks", async () => {
    const a = await ask("מה המתכון לעוגת שוקולד?");
    expect(a.status).toBe("not_covered");
    expect(a.videos).toEqual([]);
    expect(a.milestone).toBeNull();
    expect(a.sources).toEqual([]);
  });

  it("never answers a question without meaningful words (e.g. mis-encoded '????')", async () => {
    for (const q of ["??? ?????? ???? ?????", "🙂🙂🙂", "....."]) {
      const a = await ask(q);
      expect(a.status, q).toBe("not_covered");
      expect(a.videos).toEqual([]);
    }
  });

  it("adds the professional-assessment note for concerns without diagnosing", async () => {
    const a = await ask("ילד בן שנתיים עדיין לא מדבר, מה לעשות?");
    expect(a.safetyNote).toMatch(/הערכה התפתחותית/);
    expect(a.disclaimer).toMatch(/אינו אבחון/);
    expect(a.explanation).not.toMatch(/עיכוב התפתחותי|אבחנה/);
  });

  it("uses the conversation context for follow-up questions", async () => {
    const db = testDb();
    const first = await answerQuestion(db, { question: "ילד בן שנתיים שמתקשה לדבר", uiLanguage: "he", clientId: "22222222-2222-4222-8222-222222222222" });
    const second = await answerQuestion(db, { question: "ואיך משתפים את ההורים?", uiLanguage: "he", clientId: "22222222-2222-4222-8222-222222222222", conversationId: first.conversationId });
    expect(second.conversationId).toBe(first.conversationId);
    expect(second.age?.months).toBe(24); // age carried over from the conversation
  });
});
