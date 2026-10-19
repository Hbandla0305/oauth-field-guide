import { NextRequest } from "next/server";
import OpenAI from "openai";
import { z } from "zod";
import { LIMITS, MODELS, costOf, generationEnabled } from "@/lib/agent/config";
import { CHAT_INSTRUCTIONS } from "@/lib/agent/prompts";
import { findGuide } from "@/lib/guides";
import { hashIp, reserveChat, settleRun } from "@/lib/db";
import type { Guide } from "@/lib/guide-schema";

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

// The guide as numbered plain text: compact, and the numbers match the citations on the page.
function guideContext(g: Guide): string {
  const idx = new Map(g.sources.map((s, i) => [s.id, i + 1]));
  const cite = (ids: string[]) => ids.filter((id) => idx.has(id)).map((id) => `[${idx.get(id)}]`).join("");
  const v = g.verdict;
  return [
    `GUIDE: ${g.app.name} (${v.difficulty}). Status: ${g.verification.status}, last checked ${g.verification.lastChecked}.`,
    `Summary: ${v.summary}`,
    `Working in dev: ${v.timeToDev.range} (${v.timeToDev.evidence.label}). Any user can connect: ${v.timeToProd.range} (${v.timeToProd.evidence.label}). Assumes: ${v.timeToProd.assumes} Waiting on: ${v.timeToProd.waitingOn}. Cost: ${v.cost ?? "none"}.`,
    `Developer portal: ${g.app.developerPortal}`,
    "OFFICIAL DOCS:",
    ...g.officialDocs.map((d) => `- ${d.label}: ${d.url}`),
    "PREREQUISITES:",
    ...g.prerequisites.map((p) => `- ${p.item}: ${p.why} (${p.evidence.label}) ${cite(p.evidence.sourceIds)}`),
    "PERMISSION TIERS:",
    ...g.scopeTiers.map((t) => `- ${t.tier} | review ${t.reviewRequired ? "required" : "none"} | ${t.time} | e.g. ${t.examples.join(", ")} | ${t.impact} (${t.evidence.label}) ${cite(t.evidence.sourceIds)}`),
    "STEPS:",
    ...g.steps.map((s, i) => `${i + 1}. ${s.title} [${s.owner}${s.duration ? `, ${s.duration}` : ""}] ${s.detail}${s.url ? ` (${s.url})` : ""} (${s.evidence.label}) ${cite(s.evidence.sourceIds)}`),
    `AGENT CAN DO: ${g.agentCanDo.join("; ")}`,
    `HUMAN MUST DO: ${g.humanMustDo.join("; ")}`,
    "BLOCKERS:",
    ...g.blockers.map((b) => `- ${b.symptom} | cause: ${b.cause} | fix: ${b.fix} (${b.evidence.label}) ${cite(b.evidence.sourceIds)}`),
    "GOOD TO KNOW:",
    ...g.nuances.map((n) => `- ${n.text} (${n.evidence.label}) ${cite(n.evidence.sourceIds)}`),
    `OPEN QUESTIONS: ${g.verification.openQuestions.join("; ") || "none"}`,
    "SOURCES:",
    ...g.sources.map((s, i) => `[${i + 1}] ${s.title} ${s.url}`),
  ].join("\n");
}

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

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
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
