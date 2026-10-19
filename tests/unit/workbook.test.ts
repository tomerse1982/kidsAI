import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { parseVideoWorkbook } from "@/server/import/workbook/parse";
import { ARABIC_MAPPING_V1, matchBuiltinProfile, proposeProfiles } from "@/server/import/workbook/profiles";
import { readWorkbookWithExcelJs, readWorkbookWithPython } from "@/server/import/workbook/readers";
import type { MappingProfile, ParseResult, RawWorkbook } from "@/server/import/workbook/types";

const XLSX = path.resolve("source-files/טבלה כללית מרוכזת.xlsx");

let raw: RawWorkbook;
let parsed: ParseResult;

beforeAll(async () => {
  raw = await readWorkbookWithPython(XLSX); // openpyxl, the primary reader
  parsed = parseVideoWorkbook(raw, "ar", ARABIC_MAPPING_V1);
});

describe("real workbook: structure", () => {
  it("contains the verified worksheets", () => {
    expect(raw.sheets.map((s) => s.name)).toEqual([
      "סדרה 1", "סדרה 2", "סדרה 3", "סדרה 4", "סדרה 5", "סדרה 6", "סדרה 7", "סדרה 8", "רישמה מאוחד ערבית", "מיפוי", "Sheet2",
    ]);
    const mapping = raw.sheets.find((s) => s.name === "מיפוי")!;
    expect(mapping.maxRow).toBe(488);
    expect(mapping.maxCol).toBe(11);
    expect(raw.sheets.find((s) => s.name === "רישמה מאוחד ערבית")!.maxRow).toBe(490);
  });

  it("is recognised by the built-in Arabic profile", () => {
    expect(matchBuiltinProfile(raw)?.id).toBe("ar-mapping-v1");
  });

  it("openpyxl and exceljs readers produce identical raw rows and merges", async () => {
    const other = await readWorkbookWithExcelJs(XLSX);
    expect(other.sha256).toBe(raw.sha256);
    expect(other.sheets.map((s) => [s.rows, s.merges])).toEqual(raw.sheets.map((s) => [s.rows, s.merges]));
  });
});

describe("real workbook: milestone 1.1 (required exact example)", () => {
  it("maps 1.1.1-1.1.6 to the six source video ids, read from the actual workbook", () => {
    const rows = parsed.rows.filter((r) => r.milestoneCode === "1.1" && r.status === "valid");
    // these ids are the expectation; the values compared come from the workbook just parsed
    expect(rows.map((r) => [r.subMilestoneCode, r.videoId])).toEqual([
      ["1.1.1", "pn-JcrmEDA0"],
      ["1.1.2", "LG-AImdjzSw"],
      ["1.1.3", "e4RsJQ4yJMo"],
      ["1.1.4", "dIzoimC-730"],
      ["1.1.5", "1xsVhpIbnZI"],
      ["1.1.6", "9Dct0YJ8Z84"],
    ]);
    expect(rows.every((r) => r.worksheet === "מיפוי")).toBe(true);
    expect(rows.map((r) => r.rowNumber)).toEqual([2, 3, 4, 5, 6, 7]);
  });

  it("cross-validates 1.1.3 against column E, column D, the unified Arabic list and the series sheet", () => {
    const r = parsed.rows.find((x) => x.subMilestoneCode === "1.1.3")!;
    const byCheck = Object.fromEntries(r.validation.map((v) => [v.check, v.result]));
    expect(byCheck).toMatchObject({ correlation_text: "match", original_title_code: "match", unified_arabic_list: "match", series_sheet: "match" });
    expect(r.confidence).toBe("verified");
    expect(r.correlationText).toBe("מלאה: 1.1 תת-סעיף 3");
    expect(r.activityHe).toBe("שימוש בצעצועים בולטים ומושכי עין");
  });
});

describe("real workbook: mapping rules", () => {
  it("fills column A from the merged ranges and validates it against column B", () => {
    const filled = parsed.rows.filter((r) => r.milestoneCodeSource === "merged_range");
    expect(filled.length).toBeGreaterThan(400);
    expect(filled.every((r) => r.validation.some((v) => v.check === "milestone_merged_range" && v.result === "match"))).toBe(true);
    expect(parsed.rows.filter((r) => r.milestoneCodeSource === "explicit")).toHaveLength(51);
  });

  it("finds 51 milestones, 486 valid rows and 484 unique videos", () => {
    expect(parsed.stats).toMatchObject({ dataRows: 487, valid: 486, skipped: 1, invalid: 0, duplicate: 0, milestones: 51, uniqueVideos: 484 });
  });

  it("has no column E / column D / cross-sheet conflicts", () => {
    expect(parsed.issues.filter((i) => ["correlation_mismatch", "original_title_mismatch", "cross_check_mismatch", "milestone_sub_mismatch"].includes(i.code))).toEqual([]);
  });

  it("reports the row without a video instead of inventing one", () => {
    const r = parsed.rows.find((x) => x.subMilestoneCode === "7.5.13")!;
    expect(r.status).toBe("skipped");
    expect(r.videoId).toBeNull();
    expect(parsed.issues.some((i) => i.code === "missing_video" && i.rowNumber === r.rowNumber)).toBe(true);
  });

  it("detects sub-milestones listed in the series sheets that have no video (missing mappings)", () => {
    const codes = parsed.missingMappings.map((m) => m.code);
    expect(codes).toEqual(expect.arrayContaining(["4.7.1", "4.10.13", "5.6.12", "5.6.13", "7.5.13", "7.8.10", "8.4.10"]));
    expect(parsed.stats.missingMappings).toBe(53);
  });

  it("flags duplicated video ids for review", () => {
    const dups = parsed.rows.filter((r) => r.validation.some((v) => v.check === "unique_video" && v.result === "mismatch"));
    expect(dups.map((r) => r.subMilestoneCode).sort()).toEqual(["4.3.12", "4.3.13", "6.3.3", "6.3.4"]);
    expect(dups.every((r) => r.confidence === "needs_review")).toBe(true);
  });

  it("records the alternative 'Arabic link' in series 1 without importing it", () => {
    const alt = parsed.issues.find((i) => i.code === "alternative_link_in_cross_sheet");
    expect(alt?.details).toMatchObject({ mappingVideo: "e4RsJQ4yJMo", otherIds: ["uNM3WHAm7k0"] });
    expect(parsed.rows.some((r) => r.videoId === "uNM3WHAm7k0")).toBe(false);
  });

  it("uses the hyperlink target when the unified list cell text is wrong (6.9.1 shows '6')", () => {
    const r = parsed.rows.find((x) => x.subMilestoneCode === "6.9.1")!;
    expect(r.validation.find((v) => v.check === "unified_arabic_list")?.result).toBe("match");
    expect(parsed.issues.some((i) => i.code === "hyperlink_text_mismatch" && i.rowNumber === 327)).toBe(true);
  });

  it("audits Sheet2 (draft copy of 8.3-8.5) without importing it", () => {
    const audit = parsed.issues.find((i) => i.code === "auxiliary_sheet_audit" && i.worksheet === "Sheet2");
    expect(audit?.details).toMatchObject({ consistent: 24, inconsistent: [], unknown: [] });
  });

  it("classifies intro and parent-guidance segments from the source titles", () => {
    expect(parsed.rows.find((r) => r.subMilestoneCode === "1.1.1")!.role).toBe("overview");
    expect(parsed.rows.find((r) => r.subMilestoneCode === "8.3.8")!.role).toBe("parent_guidance");
    expect(parsed.rows.find((r) => r.subMilestoneCode === "1.1.3")!.role).toBe("exercise");
  });
});

// ------------------------------------------------------------- synthetic ----

function wb(rows: (string | number | null)[][], merges: string[] = [], extra: RawWorkbook["sheets"] = []): RawWorkbook {
  return {
    reader: "test", file: "t.xlsx", sha256: "x",
    sheets: [{ name: "map", maxRow: rows.length, maxCol: 4, merges, rows: rows.map((cells, i) => ({ r: i + 1, cells })) }, ...extra],
  };
}
const PROFILE: MappingProfile = { id: "t", description: "t", sheet: "map", headerRow: 1, columns: { milestone: "A", subMilestone: "B", video: "C", correlation: "D" }, crossChecks: [], inventorySheets: [] };

describe("synthetic edge cases", () => {
  it("rejects invalid video identifiers and duplicate sub-milestones", () => {
    const r = parseVideoWorkbook(wb([
      ["אבן דרך", "תת אבן דרך", "קישור", "קורלציה"],
      [2.1, "2.1.1", "not a video link", null],
      [null, "2.1.2", "https://youtu.be/0iOZ0RJAcs4", null],
      [null, "2.1.2", "https://youtu.be/6rorIqDjUzU", null],
    ], ["A2:A4"]), "he", PROFILE);
    expect(r.rows.map((x) => x.status)).toEqual(["invalid", "valid", "duplicate"]);
    expect(r.issues.map((i) => i.code)).toEqual(expect.arrayContaining(["invalid_video_identifier", "duplicate_sub_milestone"]));
  });

  it("does not forward-fill across a milestone boundary without column A", () => {
    const r = parseVideoWorkbook(wb([
      ["אבן דרך", "תת אבן דרך", "קישור", "קורלציה"],
      [2.1, "2.1.1", "0iOZ0RJAcs4", "מלאה: 2.1 תת-סעיף 1"],
      [null, "2.2.1", "6rorIqDjUzU", "מלאה: 2.1 תת-סעיף 2"],
    ]), "he", PROFILE);
    expect(r.rows[1].milestoneCodeSource).toBe("derived_from_sub");
    expect(r.issues.map((i) => i.code)).toEqual(expect.arrayContaining(["forward_fill_mismatch", "correlation_mismatch"]));
    expect(r.rows[1].confidence).toBe("conflict");
  });

  it("reads 4.10 correctly even though column A holds the float 4.1", () => {
    const r = parseVideoWorkbook(wb([["א", "ב", "ג", "ד"], [4.1, "4.10.1", "0iOZ0RJAcs4", null]]), "he", PROFILE);
    expect(r.rows[0].milestoneCode).toBe("4.10");
    expect(r.issues.some((i) => i.code === "milestone_float_rendering")).toBe(true);
  });
});

describe("future Hebrew workbook: column-mapping proposal", () => {
  it("proposes a mapping for an unknown layout", () => {
    const hebrew = wb([
      ["תת אבן דרך", "קישור לסרטון", "תת אבן דרך (עברית)", "קהל יעד", "גיל יעד"],
      ["1.1.3", "https://youtu.be/AAAAAAAAAAA", "שימוש בצעצועים", "גננת", "לידה עד 3 חודשים"],
    ]);
    expect(matchBuiltinProfile(hebrew)).toBeNull();
    const [p] = proposeProfiles(hebrew);
    expect(p.columns).toMatchObject({ subMilestone: "A", video: "B", activityHe: "C", audience: "D", age: "E" });
    expect(p.confidence).not.toBe("low");
  });
});
