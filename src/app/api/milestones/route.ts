import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/db";
import { handle } from "@/server/http";
import { listMilestones } from "@/server/knowledge/queries";

const Query = z.object({ lang: z.enum(["he", "ar"]).catch("he"), ageGroup: z.string().regex(/^[0-9a-z-]{3,10}$/).optional() });

export const GET = handle(async (req: Request) => {
  const sp = new URL(req.url).searchParams;
  const q = Query.parse({ lang: sp.get("lang"), ageGroup: sp.get("ageGroup") ?? undefined });
  return NextResponse.json(await listMilestones(prisma, q.lang, { ageGroup: q.ageGroup }));
});
