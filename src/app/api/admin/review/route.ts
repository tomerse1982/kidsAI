import { NextResponse } from "next/server";
import { z } from "zod";
import { decideLink, decideTranslation, reviewQueue } from "@/server/admin/service";
import { requireRole } from "@/server/auth/session";
import { prisma } from "@/server/db";
import { handle } from "@/server/http";

export const GET = handle(async () => {
  await requireRole("viewer");
  return NextResponse.json(await reviewQueue(prisma));
});

const Decision = z.object({
  kind: z.enum(["link", "translation"]),
  id: z.string().uuid(),
  decision: z.enum(["approve", "reject"]),
  reason: z.string().trim().min(3).max(500),
});

export const POST = handle(async (req: Request) => {
  const session = await requireRole("editor");
  const d = Decision.parse(await req.json());
  const res = d.kind === "link"
    ? await decideLink(prisma, session.userId, d.id, d.decision, d.reason)
    : await decideTranslation(prisma, session.userId, d.id, d.decision, d.reason);
  return NextResponse.json({ id: res.id, ok: true });
});
