import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { compareTitleCode, parseVideoTitleCode } from "@/lib/codes";
import { titleVerdict } from "../../scripts/check-videos";
import { HEBREW_SERIES_V1, matchBuiltinProfile } from "@/server/import/workbook/profiles";
import { readWorkbookWithPython } from "@/server/import/workbook/readers";
import { parseSeriesWorkbook } from "@/server/import/workbook/series";
import type { ParseResult, RawWorkbook } from "@/server/import/workbook/types";

const XLSX_HE = path.resolve("source-files/טבלה כללית מרוכזת עברית.xlsx");
let raw: RawWorkbook;
let parsed: ParseResult;

beforeAll(async () => {
  raw = await readWorkbookWithPython(XLSX_HE);
  parsed = parseSeriesWorkbook(raw, "he", HEBREW_SERIES_V1);
});

describe("YouTube title codes", () => {
  it.each([
    ["1.1.3", "", "1.1.3"],
    ["P.1.1.1", "P", "1.1.1"],
    ["P1.1.1", "P", "1.1.1"],
    ["A1.1.3", "A", "1.1.3"],
    ["4 8 12", "", "4.8.12"],
    ["P8.1. 2", "P", "8.1.2"],
    ["7.5..7", "", "7.5.7"],
  ])("%s -> %s %s", (title, prefix, code) => {
    expect(parseVideoTitleCode(title)).toMatchObject({ prefix, code, retired: false });
  });

  it("recognises retired uploads and titles without a code", () => {
    expect(parseVideoTitleCode("8.1.1XXX")).toMatchObject({ code: "8.1.1", retired: true });
    expect(parseVideoTitleCode("ابتسامة اجتماعية")).toBeNull();
  });

  it("classifies a title against the mapped code", () => {
    expect(compareTitleCode("7.2.1", "7.2.3")).toBe("same_milestone");
    expect(compareTitleCode("7.1.11", "7.2.1")).toBe("different_milestone");
    expect(titleVerdict("1.1.3", "he", "educator", "1.1.3")).toBe("match");
    expect(titleVerdict("P.1.1.3", "he", "parent", "1.1.3")).toBe("match");
    expect(titleVerdict("A1.1.3", "he", "educator", "1.1.3")).toBe("different"); // Arabic series in a Hebrew slot
    expect(titleVerdict("1.1.3", "he", "parent", "1.1.3")).toBe("different"); // educator video in the parent column
    expect(titleVerdict("8.1.1XXX", "he", "educator", "8.1.1")).toBe("different"); // retired upload
    expect(titleVerdict("7.1.11", "he", "educator", "7.2.1")).toBe("different");
    expect(titleVerdict("7.2.1", "he", "educator", "7.2.3")).toBe("same_milestone");
    expect(titleVerdict(undefined, "he", "educator", "7.2.3")).toBeNull();
  });
});

describe("Hebrew workbook (real file)", () => {
  it("is recognised by the Hebrew series profile, all 8 series sheets", () => {
    expect(matchBuiltinProfile(raw)?.id).toBe("he-series-v1");
    expect(new Set(parsed.rows.map((r) => r.worksheet))).toEqual(new Set([1, 2, 3, 4, 5, 6, 7, 8].map((n) => `סדרה ${n}`)));
  });

  it("reads educator and parent videos of every sub-milestone", () => {
    expect(parsed.stats).toMatchObject({ dataRows: 1078, valid: 1061, invalid: 2, skipped: 15, educatorVideos: 533, parentVideos: 528, milestones: 55 });
    const r11 = parsed.rows.filter((r) => r.milestoneCode === "1.1" && r.status === "valid");
    expect(r11.filter((r) => r.audience === "educator").map((r) => [r.subMilestoneCode, r.videoId])).toEqual([
      ["1.1.1", "jMs2-ktt5cw"], ["1.1.2", "36Dya9njr7g"], ["1.1.3", "j312B6F7PUI"],
      ["1.1.4", "4ToTo_4V1Sc"], ["1.1.5", "KUKBgGEgtJs"], ["1.1.6", "QSrSmd6Mask"],
    ]);
    expect(r11.find((r) => r.audience === "parent" && r.subMilestoneCode === "1.1.1")?.videoId).toBe("LqyXxUs9tZk");
  });

  it("rejects the non-link text 'חסר?' without inventing a URL", () => {
    const bad = parsed.rows.filter((r) => r.status === "invalid");
    expect(bad.map((r) => [r.worksheet, r.rowNumber, r.audience, r.videoRaw])).toEqual([
      ["סדרה 7", 49, "parent", "חסר?"],
      ["סדרה 8", 23, "parent", "חסר?"],
    ]);
    expect(bad.every((r) => r.videoId === null)).toBe(true);
  });

  it("does not import the Arabic columns, the 'old links' column or the copied mapping sheet", () => {
    const allIds = new Set(parsed.rows.map((r) => r.videoId));
    expect(allIds.has("pn-JcrmEDA0")).toBe(false); // Arabic 1.1.1 (סדרה 1 column P / mapping sheet)
    expect(allIds.has("vNicvAfn8co")).toBe(false); // סדרה 8 "לינקים ישנים!!!!" (YouTube title 8.1.1XXX)
    expect(parsed.issues.filter((i) => i.code === "excluded_column")).toHaveLength(9);
    expect(parsed.issues.some((i) => i.code === "auxiliary_sheet_audit" && i.worksheet === "מיפוי סרטים ותוכן")).toBe(true);
  });

  it("flags the shifted column-A labels of סדרה 7 for review instead of trusting them", () => {
    const shifted = parsed.issues.filter((i) => i.code === "milestone_column_shifted");
    expect(shifted.length).toBeGreaterThan(0);
    expect(shifted.every((i) => i.worksheet === "סדרה 7")).toBe(true);
    const r = parsed.rows.find((x) => x.worksheet === "סדרה 7" && x.rowNumber === 24 && x.audience === "educator")!;
    expect(r).toMatchObject({ subMilestoneCode: "7.2.12", milestoneCode: "7.2", confidence: "needs_review" }); // code from column B
  });

  it("reports duplicate video ids", () => {
    const dups = new Set(parsed.issues.filter((i) => i.code === "duplicate_video_id").map((i) => (i.details as { videoId: string }).videoId));
    expect([...dups].sort()).toEqual(["AtUBbseNWuQ", "OSypaB9L7Hs", "ymm3UXBjvys"]);
  });
});
