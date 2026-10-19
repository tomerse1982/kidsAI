/**
 * Relates Excel video segments (1.1.3) to handbook exercises (1.1-E2) of the same
 * milestone. These links are *derived* (the sources do not state them), so every
 * link records its method and score, starts as `needs_review`, and only strong,
 * unambiguous matches are typed `exact_activity`. Manual links are never touched.
 */
import { cosine, embed } from "@/server/ai/embeddings";
import type { Prisma as Db } from "@/server/prisma-factory";

export const LINK_THRESHOLDS = { exact: 0.86, margin: 0.015, review: 0.82 };

interface Item { id: string; code: string; role: string; he?: string; ar?: string }

export async function linkSegmentsToExercises(db: Db): Promise<Record<string, number>> {
  const currentVersions = (await db.sourceDocument.findMany({ select: { currentVersionId: true } }))
    .map((d) => d.currentVersionId).filter((x): x is string => Boolean(x));
  const activities = await db.activity.findMany({
    where: { status: { not: "archived" } },
    include: { translations: { where: { sourceVersionId: { in: currentVersions } } }, milestone: { select: { milestoneCode: true } } },
  });
  const byMilestone = new Map<string, { segments: Item[]; exercises: Item[] }>();
  for (const a of activities) {
    const entry = byMilestone.get(a.milestoneId) ?? { segments: [], exercises: [] };
    const tr = (lang: "he" | "ar") => a.translations.find((t) => t.language === lang);
    const item: Item = {
      id: a.id, code: a.activityCode, role: a.role,
      he: tr("he") ? `${tr("he")!.title}${a.activityType === "handbook_exercise" ? `: ${(tr("he")!.instructions ?? "").slice(0, 240)}` : ""}` : undefined,
      ar: tr("ar") ? `${tr("ar")!.title}${a.activityType === "handbook_exercise" ? `: ${(tr("ar")!.instructions ?? "").slice(0, 240)}` : ""}` : undefined,
    };
    (a.activityType === "video_segment" ? entry.segments : entry.exercises).push(item);
    byMilestone.set(a.milestoneId, entry);
  }

  const manual = new Set((await db.activityLink.findMany({ where: { method: "manual" } })).map((l) => `${l.segmentId}|${l.exerciseId}`));
  const counts: Record<string, number> = { exact_activity: 0, parent_guidance: 0, requires_review: 0, unlinked: 0, overview_segments: 0 };
  const desired: { segmentId: string; exerciseId: string; linkType: "exact_activity" | "parent_guidance" | "requires_review"; method: string; score: number | null }[] = [];

  for (const { segments, exercises } of byMilestone.values()) {
    if (!segments.length || !exercises.length) continue;
    const texts = (lang: "he" | "ar") => [...segments.map((s) => s[lang] ?? ""), ...exercises.map((e) => e[lang] ?? "")];
    const [heVecs, arVecs] = await Promise.all([embed(texts("he"), "passage"), embed(texts("ar"), "passage")]);
    const seg = (vecs: number[][], i: number) => vecs[i];
    const ex = (vecs: number[][], j: number) => vecs[segments.length + j];

    segments.forEach((s, i) => {
      if (s.role === "overview") {
        counts.overview_segments++;
        return; // milestone-level video: mapped to the milestone, not to one exercise
      }
      if (s.role === "parent_guidance") {
        const target = exercises.find((e) => e.role === "parent_guidance");
        if (target) {
          desired.push({ segmentId: s.id, exerciseId: target.id, linkType: "parent_guidance", method: "role_rule", score: null });
          counts.parent_guidance++;
          return;
        }
      }
      const scores = exercises.map((e, j) => {
        const parts: number[] = [];
        if (s.he && e.he) parts.push(cosine(seg(heVecs, i), ex(heVecs, j)));
        if (s.ar && e.ar) parts.push(cosine(seg(arVecs, i), ex(arVecs, j)));
        return parts.length ? parts.reduce((a, b) => a + b, 0) / parts.length : 0;
      });
      const order = scores.map((sc, j) => [sc, j] as const).sort((a, b) => b[0] - a[0]);
      const [best, bestIdx] = order[0];
      const second = order[1]?.[0] ?? 0;
      if (best >= LINK_THRESHOLDS.exact && best - second >= LINK_THRESHOLDS.margin) {
        desired.push({ segmentId: s.id, exerciseId: exercises[bestIdx].id, linkType: "exact_activity", method: "title_similarity", score: best });
        counts.exact_activity++;
      } else if (best >= LINK_THRESHOLDS.review) {
        desired.push({ segmentId: s.id, exerciseId: exercises[bestIdx].id, linkType: "requires_review", method: "title_similarity", score: best });
        counts.requires_review++;
      } else counts.unlinked++;
    });
  }

  await db.$transaction(async (tx) => {
    await tx.activityLink.deleteMany({ where: { method: { not: "manual" } } });
    for (const d of desired) {
      if (manual.has(`${d.segmentId}|${d.exerciseId}`)) continue;
      await tx.activityLink.upsert({
        where: { segmentId_exerciseId: { segmentId: d.segmentId, exerciseId: d.exerciseId } },
        create: { ...d, confidence: "needs_review" },
        update: {},
      });
    }
  }, { timeout: 120_000 });
  return counts;
}
