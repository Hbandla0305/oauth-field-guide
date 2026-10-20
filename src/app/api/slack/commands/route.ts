// Slash command: /oauth-guide <app> [section] | research <app> | help
// Slack needs an answer within 3 seconds: library guides answer immediately, and research runs
// after the response, posting the result back through response_url.
import { NextRequest, after } from "next/server";
import { findGuide } from "@/lib/guides";
import { toSlug } from "@/lib/agent/pipeline";
import { startGeneration } from "@/lib/generation";
import { slackConfigured, verifySlack, respond } from "@/lib/slack";
import { HELP, guideMessage, splitSection } from "../shared";

export const runtime = "nodejs";
export const maxDuration = 300;

const ephemeral = (text: string) => Response.json({ response_type: "ephemeral", text });

export async function POST(req: NextRequest) {
  const raw = await req.text();
  // Unsigned callers get the same 401 whether or not Slack is set up here.
  if (!slackConfigured() || !verifySlack(raw, req.headers.get("x-slack-request-timestamp"), req.headers.get("x-slack-signature"))) {
    return new Response("Invalid signature", { status: 401 });
  }
  const form = new URLSearchParams(raw);
  const text = (form.get("text") ?? "").trim();
  const responseUrl = form.get("response_url") ?? "";
  const team = form.get("team_id") ?? "unknown";

  if (!text || /^help$/i.test(text)) return ephemeral(HELP);

  const research = /^research\s+/i.test(text);
  const { app, section } = splitSection(text.replace(/^research\s+/i, ""));

  if (!research) {
    const guide = await findGuide(toSlug(app));
    if (guide) return Response.json({ response_type: "in_channel", ...guideMessage(guide, section) });
  }

  // Not in the library (or explicitly asked): run the live agent, rate-limited per workspace.
  const start = await startGeneration(app, `slack:${team}`);
  if (start.kind === "invalid" || start.kind === "refused") return ephemeral(start.message);
  if (start.kind === "cached") {
    const guide = await findGuide(start.slug);
    return guide ? Response.json({ response_type: "in_channel", ...guideMessage(guide, section) }) : ephemeral("Couldn't open that guide.");
  }

  after(async () => {
    let error: string | null = null;
    const { slug } = await start.run((e) => {
      if (e.type === "error") error = e.message;
    });
    const guide = slug ? await findGuide(slug) : null;
    await respond(
      responseUrl,
      guide ? { response_type: "in_channel", replace_original: false, ...guideMessage(guide, null) } : { response_type: "ephemeral", text: error ?? `Couldn't research ${app}.` },
    );
  });
  return ephemeral(`Researching *${app}*: reading its docs and trying the first setup steps. This takes about 1-3 minutes; I'll post the guide here.`);
}
