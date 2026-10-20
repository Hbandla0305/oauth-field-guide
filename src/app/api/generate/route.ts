import { NextRequest, after } from "next/server";
import { startGeneration, clientIp } from "@/lib/generation";
import { getRunStatus } from "@/lib/db";
import { crossSiteRefusal } from "@/lib/request-guard";
import type { AgentEvent } from "@/lib/agent/pipeline";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const refused = crossSiteRefusal(req);
  if (refused) return refused;
  const body = await req.json().catch(() => null);
  const start = await startGeneration(body?.app, clientIp(req.headers));

  if (start.kind === "invalid") return Response.json({ error: start.message }, { status: 400 });
  if (start.kind === "cached") return Response.json({ slug: start.slug, cached: true });
  if (start.kind === "refused") return Response.json({ error: start.message }, { status: start.status });

  const encoder = new TextEncoder();
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
      // Keep the function alive until the run finishes, even if the visitor reloads or leaves.
      const run = start.run(emit);
      after(() => run);
      await run;
      if (open) controller.close();
    },
  });

  return new Response(stream, {
    headers: { "content-type": "text/event-stream", "cache-control": "no-cache, no-transform", connection: "keep-alive" },
  });
}

// Status of a live run, for a page that was reloaded mid-run. The run id is an unguessable UUID
// handed only to the visitor who started it; the answer holds no personal data.
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("run") ?? "";
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(id)) return Response.json({ error: "Unknown run." }, { status: 400 });
  const run = await getRunStatus(id).catch(() => null);
  if (!run) return Response.json({ error: "Unknown run." }, { status: 404 });
  return Response.json(run, { headers: { "cache-control": "no-store" } });
}
