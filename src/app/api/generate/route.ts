import { NextRequest } from "next/server";
import { startGeneration, clientIp } from "@/lib/generation";
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
      await start.run(emit);
      if (open) controller.close();
    },
  });

  return new Response(stream, {
    headers: { "content-type": "text/event-stream", "cache-control": "no-cache, no-transform", connection: "keep-alive" },
  });
}
