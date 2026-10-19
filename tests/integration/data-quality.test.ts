import { beforeAll, describe, expect, it } from "vitest";
import { parseVideoWorkbook } from "@/server/import/workbook/parse";
import { ARABIC_MAPPING_V1, HEBREW_SERIES_V1 } from "@/server/import/workbook/profiles";
import { parseSeriesWorkbook } from "@/server/import/workbook/series";
import { readWorkbookWithPython } from "@/server/import/workbook/readers";
import type { ParseResult } from "@/server/import/workbook/types";
import { importVideoWorkbook } from "@/server/import/workbook/service";
import { tableCounts, testDb, XLSX } from "./helpers";

let parsed: ParseResult;
let parsedHe: ParseResult;
beforeAll(async () => {
  parsed = parseVideoWorkbook(await readWorkbookWithPython(XLSX), "ar", ARABIC_MAPPING_V1);
  parsedHe = parseSeriesWorkbook(await readWorkbookWithPython(XLSX.replace("מרוכזת.xlsx", "מרוכזת עברית.xlsx")), "he", HEBREW_SERIES_V1);
});

describe("populated database", () => {
  it("contains the canonical bilingual structure", async () => {
    const db = testDb();
    expect(await db.milestone.count()).toBe(55);
    expect(await db.ageGroup.count()).toBe(8);
    for (const lang of ["he", "ar"] as const) {
      expect(await db.milestoneTranslation.count({ where: { language: lang, sourceOrigin: "pdf", isPrimary: true } })).toBe(55);
    }
    // 486 sub-milestones from the Arabic workbook; the Hebrew workbook adds those without Arabic videos (e.g. 4.7-4.10)
    expect(await db.activity.count({ where: { activityType: "video_segment", mappings: { some: { language: "ar" } } } })).toBe(486);
    const heCodes = new Set(parsedHe.rows.filter((r) => r.status === "valid").map((r) => r.subMilestoneCode));
    expect(await db.activity.count({ where: { activityType: "video_segment", mappings: { some: { language: "he" } } } })).toBe(heCodes.size);
  });

  it("stores exactly the workbook's mappings — every DB mapping is traceable to its sheet row", async () => {
    const db = testDb();
    const mappings = await db.activityVideoMapping.findMany({ where: { sourceDocument: { documentKey: "video-workbook-ar" } }, include: { video: true, activity: true } });
    const valid = parsed.rows.filter((r) => r.status === "valid");
    expect(mappings).toHaveLength(valid.length);
    const byRow = new Map(valid.map((r) => [r.rowNumber, r]));
    for (const m of mappings) {
      const row = byRow.get(m.sourceRowNumber);
      expect(m.sourceSheet).toBe("מיפוי");
      expect(row, `row ${m.sourceRowNumber}`).toBeDefined();
      expect(m.video.providerVideoId).toBe(row!.videoId);
      expect(m.activity?.activityCode).toBe(row!.subMilestoneCode);
      expect(m.rawSubMilestoneCode).toBe(row!.subMilestoneCode);
      expect(m.language).toBe("ar");
    }
  });

  it("never stores a video that the workbook does not contain (no fabricated mappings)", async () => {
    const workbookIds = new Set([...parsed.rows, ...parsedHe.rows].map((r) => r.videoId).filter(Boolean));
    const dbIds = (await testDb().video.findMany({ select: { providerVideoId: true } })).map((v) => v.providerVideoId);
    expect(dbIds.filter((id) => !workbookIds.has(id))).toEqual([]);
  });

  it("verifies milestone 1.1 in the database against the workbook", async () => {
    const rows = await testDb().activityVideoMapping.findMany({
      where: { milestone: { milestoneCode: "1.1" }, sourceDocument: { documentKey: "video-workbook-ar" } }, include: { activity: true, video: true }, orderBy: { sourceRowNumber: "asc" },
    });
    const fromWorkbook = parsed.rows.filter((r) => r.milestoneCode === "1.1" && r.videoId).map((r) => [r.subMilestoneCode, r.videoId]);
    expect(rows.map((r) => [r.activity?.activityCode, r.video.providerVideoId])).toEqual(fromWorkbook);
    expect(rows.find((r) => r.activity?.activityCode === "1.1.3")?.video.canonicalUrl).toBe("https://youtu.be/e4RsJQ4yJMo");
  });

  it("keeps PDF page references per language (Hebrew and Arabic editions differ)", async () => {
    const refs = await testDb().sourceReference.findMany({ where: { milestone: { milestoneCode: "1.1" }, activityId: null } });
    expect(refs.find((r) => r.language === "he")).toMatchObject({ pdfPageIndex: 8, printedPageNumber: 8 });
    expect(refs.find((r) => r.language === "ar")).toMatchObject({ pdfPageIndex: 6, printedPageNumber: 8 });
  });

  it("assigns development domains only from the scale chart", async () => {
    const db = testDb();
    expect((await db.milestone.findUnique({ where: { milestoneCode: "1.3" } }))?.developmentDomain).toBe("social");
    expect((await db.milestone.findUnique({ where: { milestoneCode: "4.7" } }))?.developmentDomain).toBe("fine_motor");
    expect((await db.milestone.findUnique({ where: { milestoneCode: "2.3" } }))?.developmentDomain).toBeNull(); // not in the chart
  });

  it("flags the source intro copied from 5.1 into 2.1 in both editions", async () => {
    const t = await testDb().milestoneTranslation.findMany({ where: { milestone: { milestoneCode: "2.1" }, sourceOrigin: "pdf", isPrimary: true } });
    expect(t).toHaveLength(2);
    for (const x of t) {
      expect(x.contentReviewStatus).toBe("needs_review");
      expect(x.summary).toBeNull();
    }
  });
});

describe("idempotent import", () => {
  it("re-importing the same workbook changes nothing", async () => {
    const db = testDb();
    const before = await tableCounts(db);
    const res = await importVideoWorkbook(db, XLSX, "ar", ARABIC_MAPPING_V1, { documentKey: "video-workbook-ar" });
    expect(res.published).toMatchObject({ mappingsInserted: 0, mappingsUnchanged: 486, videosCreated: 0 });
    expect(await tableCounts(db)).toEqual(before);
    const versions = await db.sourceVersion.count({ where: { document: { documentKey: "video-workbook-ar" } } });
    expect(versions).toBe(1); // identical checksum -> same version
  });
});
