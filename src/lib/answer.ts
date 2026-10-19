// Non-streaming "answer from this guide" for integrations (Slack). Same model, prompt, context
// and spend ledger as the in-page chat.
import OpenAI from "openai";
import { LIMITS, MODELS, costOf, generationEnabled } from "./agent/config";
import { CHAT_INSTRUCTIONS } from "./agent/prompts";
import { reserveChat, settleRun } from "./db";
import { guideContext } from "./guide-text";
import type { Guide } from "./guide-schema";

export async function answerFromGuide(guide: Guide, question: string, ipHash: string): Promise<{ ok: true; text: string } | { ok: false; error: string }> {
  if (!generationEnabled()) return { ok: false, error: "Answers are turned off right now. The guide link still works." };
  const q = question.trim().slice(0, LIMITS.chat.maxQuestionLength);
  const reservation = await reserveChat(ipHash, `${guide.app.slug}: ${q.slice(0, 200)}`);
  if (!reservation.ok) return { ok: false, error: "The question limit has been reached for now. Open the guide instead." };
  let usd = 0;
  try {
    const res = await new OpenAI({ apiKey: process.env.OPENAI_API_KEY, maxRetries: 1 }).responses.create(
      {
        model: MODELS.research,
        instructions: `${CHAT_INSTRUCTIONS}\n\n${guideContext(guide)}`,
        input: [{ role: "user", content: q }],
        reasoning: { effort: "minimal" },
        max_output_tokens: LIMITS.chat.maxOutputTokens,
        store: false,
      },
      { signal: AbortSignal.timeout(45_000) },
    );
    usd = costOf(MODELS.research, res.usage);
    await settleRun(reservation.runId, usd, "answered", guide.app.slug);
    return { ok: true, text: res.output_text.replace(/\s*—\s*/g, ", ") };
  } catch (err) {
    console.error("answer failed", err instanceof Error ? err.message : err);
    await settleRun(reservation.runId, Math.max(usd, LIMITS.chat.reservePerMessageUsd), "failed", guide.app.slug).catch(() => {});
    return { ok: false, error: "That answer failed. Try again in a minute, or open the guide." };
  }
}
