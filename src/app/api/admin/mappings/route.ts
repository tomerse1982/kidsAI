import { NextResponse } from "next/server";
import { z } from "zod";
import { addManualMapping, mappingsForMilestone } from "@/server/admin/service";
import { requireRole } from "@/server/auth/session";
import { prisma } from "@/server/db";
import { handle, jsonError } from "@/server/http";

export const GET = handle(async (req: Request) => {
  await requireRole("viewer");
  const code = z.string().regex(/^\d{1,2}\.\d{1,2}$/).parse(new URL(req.url).searchParams.get("code"));
  const data = await mappingsForMilestone(prisma, code);
  return data ? NextResponse.json(data) : jsonError(404, "not_found");
});

const Create = z.object({
  activityCode: z.string().regex(/^\d{1,2}\.\d{1,2}\.\d{1,3}$/),
  video: z.string().min(11).max(300),
  language: z.enum(["he", "ar"]),
  reason: z.string().trim().min(3).max(500),
});

export const POST = handle(async (req: Request) => {
  const session = await requireRole("editor");
  const body = Create.parse(await req.json());
  try {
    const m = await addManualMapping(prisma, session.userId, body);
    return NextResponse.json({ id: m.id, mappingKey: m.mappingKey }, { status: 201 });
  } catch (err) {
    return jsonError(400, "invalid_mapping", (err as Error).message.split("\n")[0]);
  }
});
