import { NextRequest } from "next/server";
import OpenAI from "openai";
import { z } from "zod";
import { LIMITS, MODELS, costOf, generationEnabled } from "@/lib/agent/config";
import { CHAT_INSTRUCTIONS } from "@/lib/agent/prompts";
import { findGuide } from "@/lib/guides";
import { hashIp, reserveChat, settleRun } from "@/lib/db";
import { clientIp } from "@/lib/generation";
import { guideContext } from "@/lib/guide-text";

export const runtime = "nodejs";
export const maxDuration = 60;

const Body = z.object({
  slug: z.string().regex(/^[a-z0-9-]{1,60}$/),
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().min(1).max(4_000) }))
    .min(1)
    .max(LIMITS.chat.maxTurns),
});

const REFUSALS = {
  budget: "Chat has used its demo budget. Everything in the guide is still on the page.",
  ip_rate: `You can ask ${LIMITS.chat.perIpPerHour} questions an hour. Try again later.`,
  daily_rate: "Today's chat limit has been reached. Try again tomorrow.",
} as const;

export async function POST(req: NextRequest) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "That message couldn't be sent." }, { status: 400 });
  const { slug, messages } = parsed.data;
  const question = messages[messages.length - 1];
  if (question.role !== "user" || question.content.length > LIMITS.chat.maxQuestionLength) {
    return Response.json({ error: `Keep questions under ${LIMITS.chat.maxQuestionLength} characters.` }, { status: 400 });
  }
  if (!generationEnabled()) return Response.json({ error: "Chat is turned off right now." }, { status: 503 });

  const guide = await findGuide(slug);
  if (!guide) return Response.json({ error: "Guide not found." }, { status: 404 });

  const ip = clientIp(req.headers);
  const reservation = await reserveChat(hashIp(ip), `${slug}: ${question.content.slice(0, 200)}`);
  if (!reservation.ok) return Response.json({ error: REFUSALS[reservation.reason] }, { status: 429 });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let usd = 0;
      try {
        const res = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, maxRetries: 1 }).responses.stream(
          {
            model: MODELS.research,
            instructions: `${CHAT_INSTRUCTIONS}\n\n${guideContext(guide)}`,
            input: messages.map((m) => ({ role: m.role, content: m.content })),
            reasoning: { effort: "minimal" },
            max_output_tokens: LIMITS.chat.maxOutputTokens,
            store: false,
          },
          { signal: AbortSignal.timeout(45_000) },
        );
        for await (const event of res) {
          if (event.type === "response.output_text.delta") controller.enqueue(encoder.encode(event.delta.replace(/\s*—\s*/g, ", ")));
        }
        const final = await res.finalResponse();
        usd = costOf(MODELS.research, final.usage);
        await settleRun(reservation.runId, usd, "answered", slug);
      } catch (err) {
        console.error("chat failed", err instanceof Error ? err.message : err);
        await settleRun(reservation.runId, Math.max(usd, LIMITS.chat.reservePerMessageUsd), "failed", slug).catch(() => {});
        controller.enqueue(encoder.encode("\n\nThe answer was cut off. Try asking again."));
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-cache" } });
}
