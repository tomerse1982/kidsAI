/**
 * Editorial decisions must survive re-imports: approving/rejecting derived links,
 * rejecting a flagged handbook text, and an admin verdict on a video mapping.
 * The test restores the reviewed records afterwards.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { decideLink, decideTranslation, reviewQueue, updateMapping } from "@/server/admin/service";
import { sha256File } from "@/server/import/common";
import { publishHandbook } from "@/server/import/handbook/publish";
import type { HandbookStructure } from "@/server/import/handbook/types";
import { linkSegmentsToExercises } from "@/server/import/link-activities";
import { ARABIC_MAPPING_V1 } from "@/server/import/workbook/profiles";
import { importVideoWorkbook } from "@/server/import/workbook/service";
import { getMilestoneActivities, getMilestoneDetails } from "@/server/knowledge/queries";
import { testDb, XLSX } from "./helpers";

const PDF_HE = path.resolve("source-files/חוברת הדרכות מטפסים בסולם למעונות והגנים.pdf");
let actorId: string;
let approvedLink: string;
let rejectedLink: { id: string; segmentId: string; exerciseId: string; exerciseCode: string; segmentCode: string };
let translationId: string;
let mappingId: string;

beforeAll(async () => {
  const db = testDb();
  actorId = (await db.user.findFirstOrThrow({ where: { role: "admin" } })).id;
  const q = await reviewQueue(db, { take: 10 });
  expect(q.links.items.length).toBeGreaterThan(1);
  approvedLink = q.links.items[0].id;
  const r = await db.activityLink.findUniqueOrThrow({ where: { id: q.links.items[1].id }, include: { exercise: true, segment: true } });
  rejectedLink = { id: r.id, segmentId: r.segmentId, exerciseId: r.exerciseId, exerciseCode: r.exercise.activityCode, segmentCode: r.segment.activityCode };
  translationId = q.translations.find((t) => t.milestone === "2.1" && t.language === "he")!.id;
  mappingId = (await db.activityVideoMapping.findFirstOrThrow({ where: { mappingKey: "ar:4.3.12:vtSRPTohxAk" } })).id;
});

afterAll(async () => {
  const db = testDb();
  // restore: links back to automatic, text back to needs_review, mapping back to the import's verdict
  await db.activityLink.deleteMany({ where: { id: { in: [approvedLink, rejectedLink.id] } } });
  await linkSegmentsToExercises(db);
  await db.milestoneTranslation.update({ where: { id: translationId }, data: { contentReviewStatus: "needs_review", summary: null } });
  const m = await db.activityVideoMapping.findUniqueOrThrow({ where: { id: mappingId } });
  await db.activityVideoMapping.update({
    where: { id: mappingId },
    data: { confidenceStatus: "needs_review", validationNotes: (m.validationNotes as { check: string }[]).filter((n) => n.check !== "admin_review") as never },
  });
});

describe("editorial review", () => {
  it("approves and rejects derived segment↔exercise links, and the decisions survive re-linking", async () => {
    const db = testDb();
    await decideLink(db, actorId, approvedLink, "approve", "checked: same activity");
    await decideLink(db, actorId, rejectedLink.id, "reject", "checked: different activity");
    await linkSegmentsToExercises(db); // what every import runs afterwards

    expect(await db.activityLink.findUnique({ where: { id: approvedLink } })).toMatchObject({ method: "manual", linkType: "exact_activity", confidence: "verified" });
    expect(await db.activityLink.findUnique({ where: { id: rejectedLink.id } })).toMatchObject({ method: "manual", confidence: "conflict" });
    // the rejected pair is not recreated automatically and is not shown to educators
    expect(await db.activityLink.count({ where: { segmentId: rejectedLink.segmentId, exerciseId: rejectedLink.exerciseId } })).toBe(1);
    const milestone = rejectedLink.exerciseCode.split("-")[0];
    const exercises = await getMilestoneActivities(db, milestone, "he");
    const ex = exercises.find((e) => e.code === rejectedLink.exerciseCode);
    expect(ex?.relatedSegments.map((s) => s.code) ?? []).not.toContain(rejectedLink.segmentCode);
    // and both decisions are audited
    expect(await db.adminAuditLog.count({ where: { entityId: { in: [approvedLink, rejectedLink.id] } } })).toBe(2);
  });

  it("hides a rejected handbook text and keeps the decision when the same PDF is published again", async () => {
    const db = testDb();
    await decideTranslation(db, actorId, translationId, "reject", "intro is copied from 5.1");
    expect((await getMilestoneDetails(db, "2.1", "he"))?.explanation).toBeNull();

    const structure = JSON.parse(readFileSync("ingestion/output/he_structure.json", "utf8")) as HandbookStructure;
    await publishHandbook(db, { structure, filePath: PDF_HE, checksum: await sha256File(PDF_HE), documentKey: "handbook-he" });

    const t = await db.milestoneTranslation.findUniqueOrThrow({ where: { id: translationId } });
    expect(t.contentReviewStatus).toBe("rejected");
    expect(t.summary).toBeNull();
    expect(t.developmentalExplanation).toMatch(/הבעת צרכים/); // source text itself is never altered
  }, 600_000);

  it("keeps an admin's verdict on a mapping when the workbook is imported again", async () => {
    const db = testDb();
    await updateMapping(db, actorId, mappingId, { confidenceStatus: "verified" }, "watched: correct video for 4.3.12");
    await importVideoWorkbook(db, XLSX, "ar", ARABIC_MAPPING_V1, { documentKey: "video-workbook-ar" });
    const m = await db.activityVideoMapping.findUniqueOrThrow({ where: { id: mappingId } });
    expect(m.confidenceStatus).toBe("verified");
    expect((m.validationNotes as { check: string }[]).some((n) => n.check === "admin_review")).toBe(true);
    expect((m.validationNotes as { check: string }[]).some((n) => n.check === "unique_video")).toBe(true); // fresh import evidence too
  }, 600_000);
});
