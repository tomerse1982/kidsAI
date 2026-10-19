import { NextResponse } from "next/server";
import { z } from "zod";
import { MILESTONE_CODE } from "@/lib/codes";
import { prisma } from "@/server/db";
import { handle, jsonError } from "@/server/http";
import { getMappedVideos, getMilestoneActivities, getMilestoneDetails, getVideoSegments } from "@/server/knowledge/queries";

export const GET = handle(async (req: Request, ctx: { params: Promise<{ code: string }> }) => {
  const { code } = await ctx.params;
  if (!MILESTONE_CODE.test(code)) return jsonError(400, "invalid_code");
  const lang = z.enum(["he", "ar"]).catch("he").parse(new URL(req.url).searchParams.get("lang"));
  const milestone = await getMilestoneDetails(prisma, code, lang);
  if (!milestone) return jsonError(404, "not_found");
  const [activities, videos, segments] = await Promise.all([
    getMilestoneActivities(prisma, code, lang),
    getMappedVideos(prisma, code, { language: lang }),
    getVideoSegments(prisma, code, lang),
  ]);
  return NextResponse.json({ milestone, activities, videos, segments });
});
