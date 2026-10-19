import { describe, expect, it } from "vitest";
import { bankQuestions } from "@/lib/question-bank";
import { buildSuggestIndex, MAX_SUGGESTIONS, normalizeForMatch, suggest } from "@/lib/suggest";

const norm = (s: string) => normalizeForMatch(s).text;
const items = (...texts: string[]) => buildSuggestIndex(texts.map((text, i) => ({ id: String(i), text })));
const texts = (r: { text: string }[]) => r.map((x) => x.text);
const highlighted = (r: { text: string; match: { start: number; end: number } }) => r.text.slice(r.match.start, r.match.end);

describe("normalizeForMatch", () => {
  it("removes Hebrew niqqud and Arabic harakat / shadda / tatweel", () => {
    expect(norm("תִּינוֹק")).toBe("תינוק");
    expect(norm("يَتَتَبَّعُ")).toBe("يتتبع");
    expect(norm("أشجّع")).toBe("اشجع");
    expect(norm("كـــيف")).toBe("كيف");
  });

  it("unifies Arabic letter variants: أ/إ/آ/ٱ -> ا, ة -> ه, ى -> ي, ؤ -> و, ئ -> ي", () => {
    expect(norm("أإآٱ")).toBe("اااا");
    expect(norm("الملعقة")).toBe("الملعقه");
    expect(norm("إلى")).toBe("الي");
    expect(norm("مسؤول بيئة")).toBe("مسوول بييه");
  });

  it("folds Hebrew final letters so a word typed in full matches its inflected forms", () => {
    expect(norm("ךםןףץ")).toBe("כמנפצ");
    expect(norm("חפציםחפץ")).toBe("חפצימחפצ");
  });

  it("ignores punctuation and repeated spaces", () => {
    expect(norm("  איך   לעודד,   תינוק?! ")).toBe("איכ לעודד תינוק");
    expect(norm("ביי-ביי")).toBe("ביי ביי");
    expect(norm("\"تن لي\"؟")).toBe("تن لي");
    expect(norm("كيف، ماذا؛")).toBe("كيف ماذا");
  });

  it("maps every normalised character back to the original text", () => {
    const original = "أشجّع الطفل";
    const { text, map } = normalizeForMatch(original);
    expect(map).toHaveLength(text.length);
    expect(map.every((i, k) => k === 0 || i > map[k - 1])).toBe(true);
    expect(original[map[text.indexOf("الطفل")]]).toBe("ا");
  });
});

describe("suggest", () => {
  const he = items("איך לעודד תינוק לזחול?", "תינוק בן עשרה חודשים לא זוחל, מה עושים?", "אילו משחקים מעודדים זחילה?", "איך ללמד ילד לקפוץ?");

  it("needs at least 2 characters", () => {
    expect(suggest(he, "")).toEqual([]);
    expect(suggest(he, "ת")).toEqual([]);
    expect(suggest(he, " ת ")).toEqual([]);
    expect(suggest(he, "תי").length).toBeGreaterThan(0);
  });

  it("matches in the middle of the sentence, entries that start with the query first", () => {
    expect(texts(suggest(he, "תינוק"))).toEqual(["תינוק בן עשרה חודשים לא זוחל, מה עושים?", "איך לעודד תינוק לזחול?"]);
    expect(texts(suggest(he, "איך"))).toEqual(["איך לעודד תינוק לזחול?", "איך ללמד ילד לקפוץ?"]);
  });

  it("ranks a match at a word start before a match inside a word", () => {
    // "אצבעות" contains "צבע" earlier, but inside a word; "צבעים" starts with it
    expect(texts(suggest(items("אצבעות קטנות", "משחק צבעים"), "צבע"))).toEqual(["משחק צבעים", "אצבעות קטנות"]);
  });

  it("returns no suggestions when nothing matches", () => {
    expect(suggest(he, "עוגת שוקולד")).toEqual([]);
  });

  it("returns at most 8 suggestions", () => {
    const many = items(...Array.from({ length: 20 }, (_, i) => `איך לעודד ${i}`));
    expect(suggest(many, "איך")).toHaveLength(MAX_SUGGESTIONS);
  });

  it("matches across punctuation and extra spaces in the query", () => {
    expect(texts(suggest(he, "זוחל   מה"))).toEqual(["תינוק בן עשרה חודשים לא זוחל, מה עושים?"]);
    expect(texts(suggest(he, "זוחל, מה?"))).toEqual(["תינוק בן עשרה חודשים לא זוחל, מה עושים?"]);
  });

  it("highlights the matched part of the original text", () => {
    expect(highlighted(suggest(he, "לעודד")[0])).toBe("לעודד");
    expect(highlighted(suggest(he, "זוחל מה")[0])).toBe("זוחל, מה");
  });

  it("Arabic: matches without harakat and across letter variants, highlighting the original letters with their marks", () => {
    const ar = items("كيف أشجّع الطفل على الأكل بالملعقة؟", "ما الألعاب المناسبة للرضيع؟");
    const r = suggest(ar, "اشجع");
    expect(texts(r)).toEqual(["كيف أشجّع الطفل على الأكل بالملعقة؟"]);
    expect(highlighted(r[0])).toBe("أشجّع");
    expect(highlighted(suggest(ar, "بالملعقه")[0])).toBe("بالملعقة");
    expect(texts(suggest(ar, "على الاكل"))).toHaveLength(1);
    expect(texts(suggest(ar, "عَلَى"))).toHaveLength(1);
  });

  it("Hebrew: matches with niqqud in the query, and a final letter typed mid-word", () => {
    expect(texts(suggest(he, "תִּינוֹק"))).toHaveLength(2);
    expect(texts(suggest(items("אילו צעצועים מתאימים?"), "צעצוע"))).toHaveLength(1);
    expect(texts(suggest(items("עוקב אחרי חפצים"), "חפץ"))).toEqual(["עוקב אחרי חפצים"]);
  });

  it("on the real bank: only the selected language, relevant results", () => {
    const heIndex = buildSuggestIndex(bankQuestions("he"));
    const arIndex = buildSuggestIndex(bankQuestions("ar"));
    const r = suggest(heIndex, "כפית");
    expect(r.length).toBeGreaterThan(0);
    expect(r.every((x) => x.item.lang === "he" && x.text.includes("כפית"))).toBe(true);
    expect(suggest(heIndex, "الملعقة")).toEqual([]);
    const a = suggest(arIndex, "الملعقه");
    expect(a.length).toBeGreaterThan(0);
    expect(a.every((x) => x.item.lang === "ar" && x.item.milestoneCode === "6.4")).toBe(true);
  });
});
