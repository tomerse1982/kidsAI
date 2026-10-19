import { NextResponse } from "next/server";
import { llmEnabled } from "@/server/ai/llm";
import { prisma } from "@/server/db";

export async function GET() {
  try {
    const [milestones, mappings] = await Promise.all([prisma.milestone.count(), prisma.activityVideoMapping.count({ where: { isActive: true } })]);
    return NextResponse.json({ ok: true, milestones, activeMappings: mappings, answerMode: llmEnabled() ? "anthropic" : "extractive" });
  } catch {
    return NextResponse.json({ ok: false }, { status: 503 });
  }
}
