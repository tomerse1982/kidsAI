import { NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { getClientId, handle, jsonError } from "@/server/http";

/** Lets an educator delete their own conversation history. */
export const DELETE = handle(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/.test(id)) return jsonError(400, "invalid_id");
  const clientId = await getClientId();
  const res = await prisma.conversation.deleteMany({ where: { id, clientId } });
  return NextResponse.json({ deleted: res.count });
});
