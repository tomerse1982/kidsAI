import { NextResponse } from "next/server";
import { z } from "zod";
import { clientCookieOptions } from "@/lib/framing";
import { answerQuestion } from "@/server/chat/answer";
import { prisma } from "@/server/db";
import { CLIENT_COOKIE, getClientId, handle, jsonError, rateLimit } from "@/server/http";

export const runtime = "nodejs";

const Body = z.object({
  question: z.string().trim().min(2).max(600),
  language: z.enum(["he", "ar"]).default("he"),
  conversationId: z.string().uuid().nullish(),
});

export const POST = handle(async (req: Request) => {
  const body = Body.parse(await req.json());
  const clientId = await getClientId();
  const limit = await rateLimit(`chat:${clientId}`, Number(process.env.CHAT_RATE_LIMIT_PER_MIN ?? 20));
  if (!limit.ok) return jsonError(429, "rate_limited", "Too many questions, please wait a moment", { retryAfter: limit.retryAfter });
  const answer = await answerQuestion(prisma, { question: body.question, uiLanguage: body.language, clientId, conversationId: body.conversationId });
  const res = NextResponse.json(answer);
  res.cookies.set(CLIENT_COOKIE, clientId, clientCookieOptions());
  return res;
});
