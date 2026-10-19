import path from "node:path";
import { createPrisma, type Prisma } from "@/server/prisma-factory";

export const XLSX = path.resolve("source-files/טבלה כללית מרוכזת.xlsx");
let db: Prisma | null = null;
export const testDb = () => (db ??= createPrisma(process.env.TEST_DATABASE_URL));

export async function tableCounts(d: Prisma) {
  const [milestones, activities, translations, videos, mappings, chunks, references] = await Promise.all([
    d.milestone.count(), d.activity.count(), d.activityTranslation.count(), d.video.count(),
    d.activityVideoMapping.count(), d.knowledgeChunk.count(), d.sourceReference.count(),
  ]);
  return { milestones, activities, translations, videos, mappings, chunks, references };
}
