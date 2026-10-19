import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/db";
import { getClientId, handle } from "@/server/http";

const BookmarkItem = z.object({
  itemType: z.enum(["milestone", "activity", "video"]),
  itemKey: z.string().regex(/^(\d{1,2}\.\d{1,2}(\.\d{1,3}|-E\d{1,3}(-(he|ar))?)?|youtube:[A-Za-z0-9_-]{11})$/),
});

export const GET = handle(async () => {
  const clientId = await getClientId();
  return NextResponse.json(
    await prisma.bookmark.findMany({ where: { clientId }, orderBy: { createdAt: "desc" }, select: { itemType: true, itemKey: true, createdAt: true } }),
  );
});

export const POST = handle(async (req: Request) => {
  const item = BookmarkItem.parse(await req.json());
  const clientId = await getClientId();
  await prisma.bookmark.upsert({ where: { clientId_itemType_itemKey: { clientId, ...item } }, create: { clientId, ...item }, update: {} });
  return NextResponse.json({ ok: true });
});

export const DELETE = handle(async (req: Request) => {
  const item = BookmarkItem.parse(await req.json());
  const clientId = await getClientId();
  await prisma.bookmark.deleteMany({ where: { clientId, ...item } });
  return NextResponse.json({ ok: true });
});
