import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/db";
import { handle } from "@/server/http";
import { listAgeGroups } from "@/server/knowledge/queries";

export const GET = handle(async (req: Request) => {
  const lang = z.enum(["he", "ar"]).catch("he").parse(new URL(req.url).searchParams.get("lang"));
  return NextResponse.json(await listAgeGroups(prisma, lang));
});
