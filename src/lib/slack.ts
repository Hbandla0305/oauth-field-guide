// Slack app: verified requests, a Block Kit "verdict card", and posting replies.
import { createHmac, timingSafeEqual } from "node:crypto";
import type { Guide } from "./guide-schema";
import { LIBRARY, resolveSlug } from "./guides";

export function slackConfigured(): boolean {
  return Boolean(process.env.SLACK_SIGNING_SECRET && process.env.SLACK_BOT_TOKEN);
}

// https://api.slack.com/authentication/verifying-requests-from-slack
// Rejects requests older than 5 minutes so captured requests can't be replayed.
export function verifySlack(rawBody: string, timestamp: string | null, signature: string | null): boolean {
  const secret = process.env.SLACK_SIGNING_SECRET;
  if (!secret || !timestamp || !signature) return false;
  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > 300) return false;
  const expected = `v0=${createHmac("sha256", secret).update(`v0:${timestamp}:${rawBody}`).digest("hex")}`;
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}

const DIFF = { trivial: "🟢 Trivial", moderate: "🟡 Moderate", hard: "🔴 Hard", gated: "🟣 Gated" } as const;

const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

// Guide text is agent-written from web pages. Escaping stops it from pinging a channel
// (<!channel>), mentioning people, or posting disguised links (https://api.slack.com/reference/surfaces/formatting#escaping).
export const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function headline(summary: string): string {
  return summary.match(/^(.+?[.!?])\s+(?=[A-Z])/)?.[1] ?? summary;
}

export function guideCard(g: Guide, url: string) {
  const v = g.verdict;
  const status = g.verification.status === "human-verified" ? "Checked by a person" : g.verification.status === "agent-generated" ? "Written live by an agent" : "Agent-researched";
  return [
    { type: "header", text: { type: "plain_text", text: clip(g.app.name, 150) } },
    { type: "section", text: { type: "mrkdwn", text: `*${DIFF[v.difficulty]}*  ${esc(clip(headline(v.summary), 2500))}` } },
    {
      type: "section",
      fields: [
        { type: "mrkdwn", text: `*Working in dev*\n${esc(clip(v.timeToDev.range, 200))}` },
        { type: "mrkdwn", text: `*Any user can connect*\n${esc(clip(v.timeToProd.range, 200))}` },
        { type: "mrkdwn", text: `*Waiting on*\n${esc(clip(v.timeToProd.waitingOn, 600))}` },
        { type: "mrkdwn", text: `*Cost*\n${esc(clip(v.cost ?? "None", 600))}` },
      ],
    },
    {
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: `${status} · researched ${g.verification.lastChecked} · ${g.steps.filter((s) => s.owner === "agent").length} of ${g.steps.length} steps AI can help with`,
        },
      ],
    },
    {
      type: "actions",
      elements: [
        { type: "button", text: { type: "plain_text", text: "Open the full guide" }, url, style: "primary" },
        { type: "button", text: { type: "plain_text", text: "Steps" }, url: `${url}#steps` },
        { type: "button", text: { type: "plain_text", text: "Troubleshoot" }, url: `${url}#troubleshoot` },
      ],
    },
  ];
}

// Plain text that Slack renders well: guideSection output with Slack's bold syntax for labels.
export function slackText(text: string): string {
  return clip(esc(text).replace(/\*\*/g, "*"), 2900);
}

export async function postMessage(channel: string, body: { text: string; blocks?: unknown[]; thread_ts?: string }) {
  const res = await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: { authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`, "content-type": "application/json; charset=utf-8" },
    body: JSON.stringify({ channel, unfurl_links: false, ...body }),
  });
  const json = await res.json().catch(() => ({}));
  if (!json.ok) console.error("slack postMessage failed", json.error);
}

export async function respond(responseUrl: string, body: Record<string, unknown>) {
  // Only ever post back to Slack's own response URLs.
  if (!/^https:\/\/hooks\.slack\.com\//.test(responseUrl)) return;
  await fetch(responseUrl, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }).catch((e) =>
    console.error("slack response_url failed", e),
  );
}

// Finds which library app a free-text question is about ("what blocks slack apps from…").
// Whole-word match on the display name (without the parenthetical) and slug; short slugs like
// "x" only count as an exact token to avoid false hits.
export function matchApp(text: string): Guide | null {
  const t = ` ${text.toLowerCase().replace(/[^a-z0-9.\- ]+/g, " ")} `;
  const tokens = new Set(t.trim().split(/\s+/));
  for (const token of tokens) {
    const slug = resolveSlug(token);
    const g = LIBRARY.find((x) => x.app.slug === slug);
    if (g && (slug.length > 2 || tokens.has(slug))) return g;
  }
  const byName = [...LIBRARY].sort((a, b) => b.app.name.length - a.app.name.length);
  for (const g of byName) {
    const name = g.app.name.toLowerCase().replace(/\s*\(.*\)\s*/, "").trim();
    if (name.length > 2 && t.includes(` ${name} `)) return g;
  }
  return null;
}
