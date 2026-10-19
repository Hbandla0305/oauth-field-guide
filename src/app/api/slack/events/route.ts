// Events API: answers @mentions in a thread. Acknowledge immediately (Slack retries after
// 3 seconds), then do the work after the response.
import { NextRequest, after } from "next/server";
import { answerFromGuide } from "@/lib/answer";
import { hashIp } from "@/lib/db";
import { slackConfigured, verifySlack, postMessage, matchApp } from "@/lib/slack";
import { HELP, guideMessage, guideUrl, splitSection } from "../shared";

export const runtime = "nodejs";
export const maxDuration = 60;

type Mention = { type: "app_mention"; text: string; channel: string; ts: string; thread_ts?: string; bot_id?: string };

export async function POST(req: NextRequest) {
  const raw = await req.text();
  const body = JSON.parse(raw || "{}");

  // Slack checks the endpoint once with a challenge when you save the Request URL.
  if (body.type === "url_verification") {
    return verifySlack(raw, req.headers.get("x-slack-request-timestamp"), req.headers.get("x-slack-signature"))
      ? Response.json({ challenge: body.challenge })
      : new Response("Invalid signature", { status: 401 });
  }
  if (!slackConfigured()) return new Response("Slack isn't configured", { status: 503 });
  if (!verifySlack(raw, req.headers.get("x-slack-request-timestamp"), req.headers.get("x-slack-signature"))) {
    return new Response("Invalid signature", { status: 401 });
  }
  // We already acknowledged the original delivery; ignore Slack's retries.
  if (req.headers.get("x-slack-retry-num")) return new Response(null, { status: 200 });

  const event = body.event as Mention | undefined;
  if (event?.type !== "app_mention" || event.bot_id) return new Response(null, { status: 200 });

  after(() => handleMention(event, String(body.team_id ?? "unknown")));
  return new Response(null, { status: 200 });
}

async function handleMention(event: Mention, team: string) {
  const thread_ts = event.thread_ts ?? event.ts;
  const text = event.text.replace(/<@[A-Z0-9]+>/g, "").trim();
  const reply = (msg: { text: string; blocks?: unknown[] }) => postMessage(event.channel, { ...msg, thread_ts });

  if (!text || /^help$/i.test(text)) return reply({ text: HELP });

  const guide = matchApp(text);
  if (!guide) {
    return reply({ text: "Which app? Try `@OAuth Field Guide gmail`, or ask about a specific app, e.g. “what blocks a Slack app from reading messages?”. For an app that isn't in the library, use `/oauth-guide research <app>`." });
  }

  // Just an app name (optionally with a section) gets the card or section; anything longer is a question.
  const { app, section } = splitSection(text);
  const isLookup = app.split(/\s+/).length <= 3 && matchApp(app)?.app.slug === guide.app.slug && !/\?$/.test(text);
  if (isLookup) return reply(guideMessage(guide, section));

  const answer = await answerFromGuide(guide, text, hashIp(`slack:${team}`));
  await reply({ text: answer.ok ? `${answer.text}\n\n<${guideUrl(guide.app.slug)}|Full ${guide.app.name} guide>` : answer.error });
}
