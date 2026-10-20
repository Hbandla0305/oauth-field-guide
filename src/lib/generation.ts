// One entry point for live generation, shared by the web page (streamed) and the MCP tool
// (run in the background). Every caller goes through the same validation, cache check,
// spend reservation and rate limits.
import { revalidatePath } from "next/cache";
import { LIMITS, generationEnabled } from "./agent/config";
import { runAgent, screenInput, toSlug, RunCost, NoThirdPartyOAuth, type AgentEvent } from "./agent/pipeline";
import { isSharedHost } from "./agent/probes";
import { findGuide } from "./guides";
import { hashIp, recordProgress, reserveRun, saveGuide, settleRun } from "./db";

const INPUT_PATTERN = /^[\p{L}\p{N} .,&'()+\-/:]+$/u;

const REFUSALS = {
  budget: "Live generation has used its demo budget. The existing guides still work.",
  daily_budget: "Live generation has used today's budget. It resets within 24 hours; the existing guides still work.",
  ip_rate: `You can generate ${LIMITS.runsPerIpPerHour} new guides per hour. Try again later, or open an existing guide.`,
  ip_daily: "You've reached today's limit for new guides. Try again tomorrow, or open an existing guide.",
  daily_rate: "Today's live generation limit has been reached. Try again tomorrow, or open an existing guide.",
} as const;

export type Start =
  | { kind: "invalid"; message: string }
  | { kind: "cached"; slug: string }
  | { kind: "refused"; message: string; status: number }
  | { kind: "started"; run: (emit: (e: AgentEvent) => void) => Promise<{ slug: string | null }> };

export async function startGeneration(rawInput: unknown, ip: string): Promise<Start> {
  const input = typeof rawInput === "string" ? rawInput.trim() : "";
  if (!input || input.length > LIMITS.inputMaxLength || !INPUT_PATTERN.test(input)) {
    return { kind: "invalid", message: `Enter an app name or website (up to ${LIMITS.inputMaxLength} characters).` };
  }

  // Free path: an existing guide for this name costs nothing.
  const existing = await findGuide(toSlug(input));
  if (existing) return { kind: "cached", slug: existing.app.slug };

  if (!generationEnabled()) {
    return { kind: "refused", status: 503, message: "Live generation is turned off right now. Browse the existing guides instead." };
  }

  const reservation = await reserveRun(hashIp(ip), input);
  if (!reservation.ok) return { kind: "refused", status: 429, message: REFUSALS[reservation.reason] };
  const { runId } = reservation;

  return {
    kind: "started",
    run: async (send) => {
      // Every event goes to the live stream; stages and errors are also saved in order, so a
      // reloaded page can follow the run from the database.
      let saving = Promise.resolve();
      const emit = (e: AgentEvent) => {
        send(e);
        const patch = e.type === "stage" ? { [e.stage]: { status: e.status, detail: e.detail ?? null } } : e.type === "error" ? { error: e.message } : null;
        if (patch) saving = saving.then(() => recordProgress(runId, patch)).catch(() => {});
      };
      send({ type: "run", runId });
      const cost = new RunCost();
      const signal = AbortSignal.timeout(LIMITS.runTimeoutMs);
      let slug: string | null = null;
      try {
        emit({ type: "stage", stage: "screen", status: "active" });
        const screen = await screenInput(input, cost, signal);
        if (screen.verdict !== "oauth_app") {
          emit({ type: "error", message: screenMessage(screen.verdict, screen.reason) });
          await settleRun(runId, cost.usd, "rejected", null, screen.verdict);
          return { slug: null };
        }
        // Anyone can publish on shared hosting (github.io, vercel.app) or a bare IP, so those are
        // never treated as a provider's official site.
        if (!screen.slug || isSharedHost(screen.website)) {
          emit({ type: "error", message: "Enter the app's own website or name. Pages on shared hosting can't be used as official docs." });
          await settleRun(runId, cost.usd, "rejected", null, "shared host or empty slug");
          return { slug: null };
        }
        slug = screen.slug;
        emit({ type: "stage", stage: "screen", status: "done", detail: screen.name });

        const cached = await findGuide(slug);
        if (cached) {
          emit({ type: "done", slug: cached.app.slug, cached: true });
          await settleRun(runId, cost.usd, "cached", slug);
          return { slug: cached.app.slug };
        }

        const guide = await runAgent(input, screen, cost, emit, signal);
        emit({ type: "stage", stage: "save", status: "active" });
        // Two runs for the same app can finish together; the first one saved wins.
        if (!(await saveGuide(guide, input, cost.usd))) {
          await settleRun(runId, cost.usd, "cached", slug, undefined, cost.firecrawlCredits);
          emit({ type: "done", slug: guide.app.slug, cached: true });
          return { slug: guide.app.slug };
        }
        // Without this, a 404 cached before the guide existed (or a stale home list) hides it.
        revalidatePath(`/guides/${guide.app.slug}`);
        revalidatePath("/");
        await settleRun(runId, cost.usd, "done", slug, undefined, cost.firecrawlCredits);
        emit({ type: "stage", stage: "save", status: "done" });
        emit({ type: "done", slug: guide.app.slug, cached: false });
        return { slug: guide.app.slug };
      } catch (err) {
        if (err instanceof NoThirdPartyOAuth) {
          await settleRun(runId, cost.usd, "rejected", slug, "no inbound oauth", cost.firecrawlCredits).catch(() => {});
          emit({ type: "error", message: screenMessage("no_oauth", err.message) });
          return { slug: null };
        }
        const message = err instanceof Error ? err.message : String(err);
        console.error("generate failed", { runId, message });
        // Charge what we know was spent (every completed call is in `cost`), with a floor that covers
        // one call failing after spending tokens. A timeout keeps the full reservation.
        const charged = signal.aborted ? Math.max(cost.usd, LIMITS.reservePerRunUsd) : Math.max(cost.usd, LIMITS.failureMinimumUsd);
        const credits = signal.aborted ? Math.max(cost.firecrawlCredits, LIMITS.firecrawl.reservePerRun) : cost.firecrawlCredits;
        await settleRun(runId, charged, "failed", slug, message.slice(0, 500), credits).catch(() => {});
        emit({
          type: "error",
          message: signal.aborted
            ? "The investigation took too long and was stopped. Try again, or try a more specific name."
            : "The investigation failed before finishing. Try again in a minute.",
        });
        return { slug: null };
      } finally {
        await saving;
      }
    },
  };
}

// Model-written reasons arrive as fragments ("input resembles a fake domain"); make them sentences.
function sentence(text: string): string {
  const t = text.trim().replace(/\s+/g, " ");
  if (!t) return "";
  const s = t[0].toUpperCase() + t.slice(1);
  return /[.!?]$/.test(s) ? s : `${s}.`;
}

function screenMessage(verdict: string, raw: string) {
  const reason = sentence(raw);
  if (verdict === "no_oauth") return `This app doesn't appear to offer OAuth for third-party developers. ${reason}`;
  if (verdict === "unsafe") return "Enter just an app name or website, for example “Asana” or “calendly.com”.";
  return `We couldn't identify an app from that. ${reason}`;
}

// Vercel sets x-vercel-forwarded-for and x-real-ip itself; a client can't choose them.
export function clientIp(headers: Headers): string {
  const ip = headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() || headers.get("x-real-ip")?.trim() || headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return ip || (process.env.VERCEL_ENV === "production" ? "unknown" : "local");
}
