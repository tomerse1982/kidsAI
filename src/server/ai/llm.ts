/**
 * Source-grounded answer composition with Claude. The model receives only the
 * retrieved handbook excerpts and returns structured JSON: a short explanation,
 * the subset of *provided* activity codes it considers relevant, and follow-up
 * questions. It never sees or returns video ids — videos are selected by SQL.
 */
import Anthropic from "@anthropic-ai/sdk";
import { logger } from "@/server/logger";

export interface GroundingExcerpt {
  ref: string;           // e.g. "M:1.1" or "A:1.1-E2"
  milestoneCode: string;
  activityCode: string | null;
  title: string;
  text: string;
}

export interface LlmAnswer {
  explanation: string;
  activityCodes: string[];
  followUps: string[];
  safetyNote: string | null;
  coveredByHandbook: boolean;
}

export const LLM_MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-5-5";
const EFFORT = (process.env.ANTHROPIC_EFFORT ?? "medium") as "low" | "medium" | "high";

export function llmEnabled(): boolean {
  return process.env.LLM_PROVIDER === "anthropic" && Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
}

let client: Anthropic | null = null;
const getClient = () => (client ??= new Anthropic({ timeout: 60_000, maxRetries: 2 }));

const SYSTEM = `You are the assistant of the "מטפסים בסולם | نتسلّق السُلّم" guidance handbooks for early-childhood educators (nurseries, daycare, kindergartens).

Rules:
- Answer ONLY from the handbook excerpts supplied in the user turn. Do not add facts, milestones, ages or activities that are not in the excerpts.
- If the excerpts do not answer the question, set covered_by_handbook to false and say briefly (in the answer language) that the handbooks do not cover it.
- Write in the requested answer language (Hebrew or Arabic), warm and practical, 2-4 short sentences for "explanation".
- activity_codes: choose up to 4 codes, copied exactly from the excerpt list, ordered by relevance. Never invent codes.
- The handbook is educational, not diagnostic. Never state or imply that a child has a delay or disorder. If the question describes a possible concern or a safety risk, put a short, calm note in safety_note recommending a professional developmental assessment (e.g. through the child's health clinic) when the concern persists; otherwise null.
- follow_up_questions: up to 3 short questions an educator might ask next, answerable from this handbook, in the answer language.
- Never ask for or repeat children's names or other identifying details.`;

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["explanation", "activity_codes", "follow_up_questions", "safety_note", "covered_by_handbook"],
  properties: {
    explanation: { type: "string" },
    activity_codes: { type: "array", items: { type: "string" } },
    follow_up_questions: { type: "array", items: { type: "string" } },
    safety_note: { type: ["string", "null"] },
    covered_by_handbook: { type: "boolean" },
  },
} as const;

export class LlmUnavailableError extends Error {}

export async function composeAnswer(input: {
  question: string;
  language: "he" | "ar";
  ageText: string | null;
  excerpts: GroundingExcerpt[];
  history: { role: "user" | "assistant"; content: string }[];
}): Promise<LlmAnswer> {
  if (!llmEnabled()) throw new LlmUnavailableError("LLM disabled");
  const excerptText = input.excerpts
    .map((e) => `[${e.ref}] (${e.activityCode ?? e.milestoneCode}) ${e.title}\n${e.text}`)
    .join("\n\n");
  const userTurn = [
    `Answer language: ${input.language === "he" ? "Hebrew" : "Arabic"}`,
    input.ageText ? `Child age mentioned: ${input.ageText}` : null,
    `Allowed activity codes: ${input.excerpts.filter((e) => e.activityCode).map((e) => e.activityCode).join(", ") || "(none)"}`,
    `Handbook excerpts:\n${excerptText}`,
    `Educator question: ${input.question}`,
  ].filter(Boolean).join("\n\n");

  const messages: Anthropic.Beta.BetaMessageParam[] = [
    ...input.history.slice(-4).map((m) => ({ role: m.role, content: m.content })),
    { role: "user", content: userTurn },
  ];

  try {
    const response = await getClient().beta.messages.create({
      model: LLM_MODEL,
      max_tokens: 4000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: SYSTEM,
      output_config: { effort: EFFORT, format: { type: "json_schema", schema: SCHEMA } },
      messages,
    } as Anthropic.Beta.MessageCreateParamsNonStreaming);

    if (response.stop_reason === "refusal") {
      logger.warn({ category: response.stop_details?.category ?? null }, "llm: refusal");
      throw new LlmUnavailableError("model declined");
    }
    const text = response.content.find((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")?.text;
    if (!text) throw new LlmUnavailableError(`no text block (stop_reason ${response.stop_reason})`);
    const parsed = JSON.parse(text) as Record<string, unknown>;
    logger.info({ model: response.model, inTok: response.usage.input_tokens, outTok: response.usage.output_tokens }, "llm: answered");
    return {
      explanation: String(parsed.explanation ?? ""),
      activityCodes: Array.isArray(parsed.activity_codes) ? parsed.activity_codes.map(String) : [],
      followUps: Array.isArray(parsed.follow_up_questions) ? parsed.follow_up_questions.map(String).slice(0, 3) : [],
      safetyNote: typeof parsed.safety_note === "string" && parsed.safety_note.trim() ? parsed.safety_note : null,
      coveredByHandbook: parsed.covered_by_handbook !== false,
    };
  } catch (err) {
    if (err instanceof LlmUnavailableError) throw err;
    if (err instanceof Anthropic.RateLimitError) logger.warn("llm: rate limited");
    else if (err instanceof Anthropic.AuthenticationError) logger.error("llm: authentication failed");
    else if (err instanceof Anthropic.APIError) logger.error({ status: err.status }, "llm: api error");
    else logger.error({ err: (err as Error).message }, "llm: unexpected error");
    throw new LlmUnavailableError((err as Error).message);
  }
}
