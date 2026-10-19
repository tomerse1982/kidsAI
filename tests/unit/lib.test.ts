import { describe, expect, it } from "vitest";
import { ageGroupForMonths, AGE_GROUPS } from "@/lib/age-groups";
import { parseAge } from "@/lib/age-parse";
import {
  compareCodes, milestoneCellMatches, parseCorrelationText, parseOriginalTitleCode, splitSubMilestoneCode,
} from "@/lib/codes";
import { detectLanguage, keywordTokens, normalizeForSearch } from "@/lib/text-normalize";
import { parseYouTube, youTubeUrls } from "@/lib/youtube";

describe("milestone codes", () => {
  it("splits sub-milestone codes", () => {
    expect(splitSubMilestoneCode("1.1.3")).toEqual({ milestone: "1.1", chapter: 1, sequence: 3 });
    expect(splitSubMilestoneCode("4.10.13")).toEqual({ milestone: "4.10", chapter: 4, sequence: 13 });
    expect(splitSubMilestoneCode("1.1")).toBeNull();
  });

  it("treats spreadsheet floats as equivalent but never as the source of the code", () => {
    expect(milestoneCellMatches(1.1, "1.1")).toBe("exact");
    expect(milestoneCellMatches(4.1, "4.10")).toBe("float_equivalent"); // 4.10 stored as a number
    expect(milestoneCellMatches(4.1, "4.1")).toBe("exact");
    expect(milestoneCellMatches(2.2, "2.1")).toBe("mismatch");
    expect(milestoneCellMatches(null, "2.1")).toBe("mismatch");
  });

  it("sorts codes numerically", () => {
    expect(["1.10", "1.2", "1.1"].sort(compareCodes)).toEqual(["1.1", "1.2", "1.10"]);
    expect(["4.3.12", "4.3.2"].sort(compareCodes)).toEqual(["4.3.2", "4.3.12"]);
  });

  it("parses column E correlation text", () => {
    expect(parseCorrelationText("מלאה: 1.1 תת-סעיף 3")).toEqual({ kind: "מלאה", milestone: "1.1", subsection: 3, isIntro: false });
    expect(parseCorrelationText("מלאה: 8.3 תת-סעיף 1 (מבוא לסדרה)")?.isIntro).toBe(true);
    expect(parseCorrelationText("random")).toBeNull();
  });

  it("parses column D original YouTube title codes", () => {
    expect(parseOriginalTitleCode("A1.1.3")).toEqual({ prefix: "A", code: "1.1.3" });
    expect(parseOriginalTitleCode("x")).toBeNull();
  });
});

describe("YouTube identifiers", () => {
  it.each([
    ["e4RsJQ4yJMo", "e4RsJQ4yJMo"],
    ["https://youtu.be/e4RsJQ4yJMo", "e4RsJQ4yJMo"],
    ["https://www.youtube.com/watch?v=uNM3WHAm7k0&list=PLcinKDvyLEnFzdcn3W0zFcWYRL4WMDCD2&index=3", "uNM3WHAm7k0"],
    ["https://www.youtube.com/embed/dIzoimC-730", "dIzoimC-730"],
    ["youtube.com/shorts/9Dct0YJ8Z84", "9Dct0YJ8Z84"],
  ])("normalises %s", (raw, id) => {
    const r = parseYouTube(raw);
    expect(r.ok && r.id).toBe(id);
  });

  it("rejects invalid identifiers instead of guessing", () => {
    expect(parseYouTube("6")).toMatchObject({ ok: false });
    expect(parseYouTube("")).toMatchObject({ ok: false, reason: "empty" });
    expect(parseYouTube("https://vimeo.com/123")).toMatchObject({ ok: false, reason: "not_youtube" });
    expect(parseYouTube("https://youtu.be/short")).toMatchObject({ ok: false, reason: "invalid_id" });
  });

  it("builds canonical and privacy-enhanced embed URLs", () => {
    expect(youTubeUrls("e4RsJQ4yJMo")).toMatchObject({ canonicalUrl: "https://youtu.be/e4RsJQ4yJMo", embedUrl: "https://www.youtube-nocookie.com/embed/e4RsJQ4yJMo" });
  });
});

describe("age parsing (Hebrew and Arabic)", () => {
  it.each([
    ["מה אפשר לעשות עם ילד בן שנתיים שמתקשה לדבר?", 24],
    ["תינוק בן 4 חודשים", 4],
    ["ילדה בת שלוש", 36],
    ["פעוט בן שנה וחצי", 18],
    ["ילד בן שנתיים וחצי", 30],
    ["תינוקת בת חצי שנה", 6],
    ["תינוק בן חודשיים", 2],
    ["בן שנה ו-3 חודשים", 15],
    ["כמעט שנתיים", 24],
    ["كيف أساعد طفلاً عمره سنتان على تطوير اللغة؟", 24],
    ["طفل عمره ٨ أشهر", 8],
    ["طفلة عمرها سنة ونصف", 18],
    ["عمره ثلاث سنوات", 36],
  ])("%s -> %d months", (q, months) => {
    expect(parseAge(q)?.months).toBe(months);
  });

  it("keeps weeks precise (6 weeks is not rounded to a month)", () => {
    const a = parseAge("תינוק בן 6 שבועות");
    expect(a?.months).toBeCloseTo(1.38, 2);
  });

  it("flags approximate ages and returns null when no age is present", () => {
    expect(parseAge("בערך בן שנתיים")?.approximate).toBe(true);
    expect(parseAge("איך לעודד תינוק לעקוב במבט?")).toBeNull();
  });
});

describe("age groups", () => {
  it("has the eight handbook chapters with an exact six-week start", () => {
    expect(AGE_GROUPS).toHaveLength(8);
    expect(AGE_GROUPS[0]).toMatchObject({ code: "6w-3m", minAgeWeeks: 6 });
    expect(AGE_GROUPS[0].minAgeMonths).toBeCloseTo(1.38, 2);
  });
  it("maps ages to bands", () => {
    expect(ageGroupForMonths(2)?.chapter).toBe(1);
    expect(ageGroupForMonths(3)?.chapter).toBe(2);
    expect(ageGroupForMonths(24)?.chapter).toBe(7);
    expect(ageGroupForMonths(40)?.chapter).toBe(8);
    expect(ageGroupForMonths(60)).toBeNull();
  });
});

describe("text normalisation", () => {
  it("detects the script of the question", () => {
    expect(detectLanguage("איך לעודד תינוק")).toBe("he");
    expect(detectLanguage("كيف أساعد طفلاً")).toBe("ar");
    expect(detectLanguage("hello")).toBe("unknown");
  });
  it("removes Arabic diacritics and unifies alef forms for search only", () => {
    expect(normalizeForSearch("يَتَتَبَّعُ إلى")).toBe("يتتبع الي");
    expect(keywordTokens("איך לעודד תינוק לעקוב במבט אחרי חפצים?")).toEqual(expect.arrayContaining(["לעודד", "לעקוב", "במבט", "חפצים"]));
  });
});
