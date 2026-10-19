import { describe, expect, it } from "vitest";
import { bankQuestions } from "@/lib/question-bank";
import { detectLanguage, normalizeForSearch } from "@/lib/text-normalize";

describe("question bank", () => {
  const he = bankQuestions("he");
  const ar = bankQuestions("ar");

  it("covers the same milestones in Hebrew and Arabic", () => {
    const codes = (qs: typeof he) => [...new Set(qs.map((q) => q.milestoneCode))].sort();
    expect(codes(he)).toEqual(codes(ar));
    expect(codes(he).length).toBeGreaterThanOrEqual(55);
    expect(codes(he).every((c) => /^\d+\.\d+$/.test(c))).toBe(true);
  });

  it("keeps each language in its own script", () => {
    expect(he.every((q) => q.lang === "he" && detectLanguage(q.text) === "he")).toBe(true);
    expect(ar.every((q) => q.lang === "ar" && detectLanguage(q.text) === "ar")).toBe(true);
  });

  it("has unique ids and no duplicate questions", () => {
    const all = [...he, ...ar];
    expect(new Set(all.map((q) => q.id)).size).toBe(all.length);
    for (const qs of [he, ar]) expect(new Set(qs.map((q) => normalizeForSearch(q.text))).size).toBe(qs.length);
  });
});
