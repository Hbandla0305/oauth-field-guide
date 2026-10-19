import { NextRequest } from "next/server";
import { LIMITS, generationEnabled } from "@/lib/agent/config";
import { runAgent, screenInput, toSlug, RunCost, type AgentEvent } from "@/lib/agent/pipeline";
import { findGuide } from "@/lib/guides";
import { hashIp, reserveRun, saveGuide, settleRun } from "@/lib/db";

export const runtime = "nodejs";
export const maxDuration = 300;

const INPUT_PATTERN = /^[\p{L}\p{N} .,&'()+\-/:]+$/u;

const REFUSALS = {
  budget: "Live generation has used its demo budget. The curated guides still work.",
  ip_rate: `You can generate ${LIMITS.runsPerIpPerHour} new guides per hour. Try again later, or open an existing guide.`,
  daily_rate: "Today's live generation limit has been reached. Try again tomorrow, or open an existing guide.",
} as const;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const input = typeof body?.app === "string" ? body.app.trim() : "";

  if (!input || input.length > LIMITS.inputMaxLength || !INPUT_PATTERN.test(input)) {
    return Response.json({ error: `Enter an app name or website (up to ${LIMITS.inputMaxLength} characters).` }, { status: 400 });
  }

  // Free path: an existing guide for this name costs nothing.
  const existing = await findGuide(toSlug(input));
  if (existing) return Response.json({ slug: existing.app.slug, cached: true });

  if (!generationEnabled()) {
    return Response.json({ error: "Live generation is turned off right now. Browse the existing guides instead." }, { status: 503 });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const reservation = await reserveRun(hashIp(ip), input);
  if (!reservation.ok) return Response.json({ error: REFUSALS[reservation.reason] }, { status: 429 });

  const { runId } = reservation;
  const encoder = new TextEncoder();
  const cost = new RunCost();
  const signal = AbortSignal.timeout(LIMITS.runTimeoutMs);

  const stream = new ReadableStream({
    async start(controller) {
      let open = true;
      const emit = (e: AgentEvent) => {
        if (!open) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(e)}\n\n`));
        } catch {
          open = false; // client went away; keep running so the guide is still saved
        }
      };
      let slug: string | null = null;
      try {
        emit({ type: "stage", stage: "screen", status: "active" });
        const screen = await screenInput(input, cost, signal);
        if (screen.verdict !== "oauth_app") {
          emit({ type: "error", message: screenMessage(screen.verdict, screen.reason) });
          await settleRun(runId, cost.usd, "rejected", null, screen.verdict);
          return;
        }
        slug = screen.slug;
        emit({ type: "stage", stage: "screen", status: "done", detail: screen.name });

        const cached = await findGuide(slug);
        if (cached) {
          emit({ type: "done", slug: cached.app.slug, cached: true });
          await settleRun(runId, cost.usd, "cached", slug);
          return;
        }

        const guide = await runAgent(input, screen, cost, emit, signal);
        emit({ type: "stage", stage: "save", status: "active" });
        await saveGuide(guide, input, cost.usd);
        await settleRun(runId, cost.usd, "done", slug, undefined, cost.firecrawlCredits);
        emit({ type: "stage", stage: "save", status: "done" });
        emit({ type: "done", slug: guide.app.slug, cached: false });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error("generate failed", { runId, message });
        // An interrupted call may have spent tokens we never saw; keep the full reservation.
        await settleRun(runId, Math.max(cost.usd, LIMITS.reservePerRunUsd), "failed", slug, message.slice(0, 500), Math.max(cost.firecrawlCredits, LIMITS.firecrawl.reservePerRun)).catch(() => {});
        emit({
          type: "error",
          message: signal.aborted
            ? "The investigation took too long and was stopped. Try again, or try a more specific name."
            : "The investigation failed before finishing. Try again in a minute.",
        });
      } finally {
        if (open) controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "content-type": "text/event-stream", "cache-control": "no-cache, no-transform", connection: "keep-alive" },
  });
}

function screenMessage(verdict: string, reason: string) {
  if (verdict === "no_oauth") return `This app doesn't appear to offer OAuth for third-party developers. ${reason}`;
  if (verdict === "unsafe") return "Enter just an app name or website, for example “Asana” or “calendly.com”.";
  return `We couldn't identify an app from that. ${reason}`;
}
