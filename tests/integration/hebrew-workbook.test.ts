/**
 * Future Hebrew video workbook: a file with an unknown layout is staged, the admin
 * confirms a proposed column mapping, it is published, and Hebrew videos coexist
 * with — and never overwrite — the Arabic mappings. Cleans up after itself.
 */
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import ExcelJS from "exceljs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { answerQuestion } from "@/server/chat/answer";
import { getMappedVideos } from "@/server/knowledge/queries";
import { publishVideoWorkbookJob, stageVideoWorkbook } from "@/server/import/workbook/service";
import type { MappingProfile } from "@/server/import/workbook/types";
import { testDb } from "./helpers";

const DOC_KEY = "video-workbook-he-test";
// synthetic test ids (11 url-safe chars); they exist only in the test database
const HE_IDS = { "1.1.3": "HEBtest1130", "1.1.4": "HEBtest1140" };
let dir: string;
let file: string;
let arabicBefore: { key: string; video: string; active: boolean }[];

async function arabicSnapshot() {
  const rows = await testDb().activityVideoMapping.findMany({ where: { language: "ar" }, include: { video: true }, orderBy: { mappingKey: "asc" } });
  return rows.map((r) => ({ key: r.mappingKey, video: r.video.providerVideoId, active: r.isActive }));
}

async function cleanup() {
  const db = testDb();
  const doc = await db.sourceDocument.findUnique({ where: { documentKey: DOC_KEY } });
  if (doc) {
    await db.activityVideoMapping.deleteMany({ where: { sourceDocumentId: doc.id } });
    await db.knowledgeChunk.deleteMany({ where: { sourceVersion: { sourceDocumentId: doc.id } } });
    await db.activityTranslation.deleteMany({ where: { sourceVersion: { sourceDocumentId: doc.id } } });
    await db.milestoneTranslation.deleteMany({ where: { sourceVersion: { sourceDocumentId: doc.id } } });
    await db.sourceDocument.update({ where: { id: doc.id }, data: { currentVersionId: null } });
    await db.importJob.deleteMany({ where: { sourceDocumentId: doc.id } });
    await db.sourceVersion.deleteMany({ where: { sourceDocumentId: doc.id } });
    await db.sourceDocument.delete({ where: { id: doc.id } });
  }
  await db.importJob.deleteMany({ where: { stats: { path: ["documentKey"], equals: DOC_KEY } } });
  await db.video.deleteMany({ where: { providerVideoId: { in: [...Object.values(HE_IDS), "HEBtest9910"] } } });
}

beforeAll(async () => {
  await cleanup();
  arabicBefore = await arabicSnapshot();
  dir = await mkdtemp(path.join(tmpdir(), "kidsai-he-"));
  file = path.join(dir, "hebrew-videos.xlsx");
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("סרטונים בעברית");
  ws.addRow(["תת אבן דרך", "קישור לסרטון", "תת אבן דרך (עברית)", "קהל יעד", "גיל יעד"]);
  ws.addRow(["1.1.3", `https://youtu.be/${HE_IDS["1.1.3"]}`, "שימוש בצעצועים בולטים ומושכי עין", "גננת", "לידה עד 3 חודשים"]);
  ws.addRow(["1.1.4", `https://youtu.be/${HE_IDS["1.1.4"]}`, "הנעת חפצים באיטיות", "גננת", "לידה עד 3 חודשים"]);
  ws.addRow(["9.9.1", "https://youtu.be/HEBtest9910", "שורה עם קוד לא קיים", "גננת", ""]);
  await wb.xlsx.writeFile(file);
});

afterAll(async () => {
  await cleanup();
  await rm(dir, { recursive: true, force: true });
});

describe("workbook with an unknown layout (synthetic Hebrew file, admin column mapping)", () => {
  let profile: MappingProfile;

  it("asks for a column mapping when the layout is unknown, with a proposal", async () => {
    const res = await stageVideoWorkbook(testDb(), { filePath: file, language: "he", documentKey: DOC_KEY });
    expect(res.status).toBe("needs_mapping");
    if (res.status !== "needs_mapping") return;
    const p = res.proposals[0];
    expect(p.columns).toMatchObject({ subMilestone: "A", video: "B", activityHe: "C" });
    profile = { id: "he-test", description: "test", sheet: p.sheet, headerRow: p.headerRow, columns: { subMilestone: "A", video: "B", ...p.columns }, crossChecks: [], inventorySheets: [] };
  });

  it("stages the rows with the confirmed mapping and previews the changes", async () => {
    const res = await stageVideoWorkbook(testDb(), { filePath: file, language: "he", profile, documentKey: DOC_KEY });
    expect(res.status).toBe("staged");
    if (res.status !== "staged") return;
    expect(res.actions).toMatchObject({ insert: 2 });
    expect(res.parse.stats).toMatchObject({ valid: 2, invalid: 1, sourceAsserted: 2 }); // no cross-check sheets -> asserted, not verified
    // 9.9.1 points at a milestone outside the handbooks: rejected in the preview, not imported
    const rejected = await testDb().importIssue.findFirst({ where: { importJobId: res.jobId, code: "unknown_milestone" } });
    expect(rejected?.rowNumber).toBe(4);
    const job = await testDb().importJob.findUniqueOrThrow({ where: { id: res.jobId } });
    expect(job.status).toBe("staged");

    const published = await publishVideoWorkbookJob(testDb(), res.jobId);
    expect(published).toMatchObject({ mappingsInserted: 2, milestonesCreated: 0, videosCreated: 2 });
    expect(await testDb().milestone.findUnique({ where: { milestoneCode: "9.9" } })).toBeNull();
  });

  it("keeps every Arabic mapping unchanged", async () => {
    expect(await arabicSnapshot()).toEqual(arabicBefore);
  });

  it("lets Arabic and Hebrew videos coexist on the same sub-milestone", async () => {
    const he = await getMappedVideos(testDb(), "1.1", { language: "he", activityCodes: ["1.1.3"] });
    const ar = await getMappedVideos(testDb(), "1.1", { language: "ar", activityCodes: ["1.1.3"] });
    expect(he.map((v) => v.videoId)).toEqual(expect.arrayContaining(["HEBtest1130", "j312B6F7PUI"])); // synthetic + real Hebrew workbook
    expect(ar.map((v) => v.videoId)).toEqual(["e4RsJQ4yJMo"]);
  });

  it("prefers Hebrew videos for Hebrew questions and Arabic videos for Arabic questions, without silent substitution", async () => {
    const he = await getMappedVideos(testDb(), "1.1", { language: "he" });
    expect(he.find((v) => v.videoId === "HEBtest1130")).toMatchObject({ activityCode: "1.1.3", language: "he" });
    expect(he.every((v) => v.language === "he")).toBe(true);
    const ar = await getMappedVideos(testDb(), "1.1", { language: "ar" });
    expect(ar.find((v) => v.activityCode === "1.1.3")).toMatchObject({ videoId: "e4RsJQ4yJMo", language: "ar" });
    expect(ar.some((v) => v.language === "he")).toBe(false);
  });

  it("shows the Hebrew video in a Hebrew chat answer", async () => {
    const a = await answerQuestion(testDb(), { question: "צעצועים בולטים ומושכי עין לתינוק", uiLanguage: "he", clientId: "33333333-3333-4333-8333-333333333333" });
    // one video per answer: a Hebrew educator version of 1.1.3 (synthetic or from the real Hebrew workbook)
    expect(a.videos).toHaveLength(1);
    expect(a.videos[0]).toMatchObject({ activityCode: "1.1.3", audience: "educator", language: "he", highlighted: true });
    expect(["HEBtest1130", "j312B6F7PUI"]).toContain(a.videos[0].videoId);
  });
});
