// A small, stateless MCP server (Streamable HTTP, JSON responses) so Claude, Cursor and other MCP
// clients can use the guides as tools. No SDK: the protocol surface we need is four methods.
import { NextRequest, after } from "next/server";
import { LIBRARY, findGuide, recentGenerated, summarise } from "@/lib/guides";
import { guideSection, SECTIONS, type Section } from "@/lib/guide-text";
import { startGeneration, clientIp } from "@/lib/generation";
import { toSlug } from "@/lib/agent/pipeline";
import type { Difficulty } from "@/lib/guide-schema";

export const runtime = "nodejs";
export const maxDuration = 300;

const SUPPORTED = ["2025-11-25", "2025-06-18", "2025-03-26"];

const INSTRUCTIONS =
  "OAuth Field Guide tells developers what it takes to get their own OAuth app approved with a provider: difficulty, time to a working dev app vs. time until any user can connect, permission tiers, steps (and which an AI can help with), blockers and sources. Every claim has an evidence label (tested, sourced, inferred, unverified); pass those through to the user. Use get_guide with a section to keep answers short. If an app isn't in the library, generate_guide researches it in 1-3 minutes.";

const TOOLS = [
  {
    name: "search_guides",
    title: "Search OAuth setup guides",
    description: "Find OAuth setup guides by app name or category, or list popular apps. Returns difficulty and both timelines for each match.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "App name, website or category, e.g. 'gmail', 'crm'. Omit to list popular apps." },
        difficulty: { type: "string", enum: ["trivial", "moderate", "hard", "gated"], description: "Only return apps of this difficulty." },
        limit: { type: "number", minimum: 1, maximum: 25, description: "Maximum results (default 10)." },
      },
    },
    annotations: { readOnlyHint: true },
  },
  {
    name: "get_guide",
    title: "Get an OAuth setup guide",
    description: "Get the setup and approval guide for one app, or a single section of it. Sections: summary (default), steps, permissions, good_to_know, troubleshoot, resources, all.",
    inputSchema: {
      type: "object",
      properties: {
        app: { type: "string", description: "App name or slug, e.g. 'Gmail', 'slack', 'hubspot'." },
        section: { type: "string", enum: [...SECTIONS], description: "Which part of the guide to return. Default: summary." },
      },
      required: ["app"],
    },
    annotations: { readOnlyHint: true },
  },
  {
    name: "generate_guide",
    title: "Research a new app",
    description:
      "Research an app that isn't in the library: an agent reads the provider's docs, tries the first setup steps logged out, and saves a guide. Returns immediately; the guide is ready in about 1-3 minutes, then use get_guide.",
    inputSchema: {
      type: "object",
      properties: { app: { type: "string", description: "App name or website, e.g. 'Calendly' or 'calendly.com'." } },
      required: ["app"],
    },
  },
];

type Rpc = { jsonrpc: "2.0"; id?: string | number | null; method: string; params?: Record<string, unknown> };

const text = (t: string, isError = false) => ({ content: [{ type: "text", text: t }], ...(isError ? { isError: true } : {}) });

async function callTool(name: string, args: Record<string, unknown>, origin: string, ip: string) {
  const guideUrl = (slug: string) => `${origin}/guides/${slug}`;

  if (name === "search_guides") {
    const q = typeof args.query === "string" ? args.query.toLowerCase().trim() : "";
    const difficulty = typeof args.difficulty === "string" ? (args.difficulty as Difficulty) : null;
    const limit = Math.min(Math.max(Number(args.limit) || 10, 1), 25);
    const all = [...LIBRARY, ...(await recentGenerated())].map(summarise);
    const words = q.split(/\s+/).filter(Boolean);
    const matches = all
      .filter((g) => (!difficulty || g.difficulty === difficulty) && words.every((w) => `${g.name} ${g.slug} ${g.category}`.toLowerCase().includes(w)))
      .sort((a, b) => a.popularity - b.popularity || a.name.localeCompare(b.name))
      .slice(0, limit);
    if (!matches.length) return text(`No guide matches "${args.query}". Use generate_guide to research it.`);
    return text(matches.map((g) => `${g.name} [${g.difficulty}]: dev ${g.dev}; any user ${g.prod}. ${guideUrl(g.slug)}`).join("\n"));
  }

  if (name === "get_guide") {
    const app = typeof args.app === "string" ? args.app : "";
    const section = (SECTIONS as readonly string[]).includes(String(args.section)) ? (args.section as Section) : "summary";
    const guide = app ? await findGuide(toSlug(app)) : null;
    if (!guide) return text(`No guide for "${app}" yet. Call generate_guide with app="${app}" to research it.`);
    return text(guideSection(guide, section, guideUrl(guide.app.slug)));
  }

  if (name === "generate_guide") {
    const start = await startGeneration(args.app, ip);
    if (start.kind === "invalid") return text(start.message, true);
    if (start.kind === "refused") return text(start.message, true);
    if (start.kind === "cached") {
      const guide = await findGuide(start.slug);
      return text(`Already in the library.\n\n${guide ? guideSection(guide, "summary", guideUrl(start.slug)) : guideUrl(start.slug)}`);
    }
    // Run after responding: tool calls that block for minutes time out in many clients.
    after(() => start.run(() => {}).then(() => undefined));
    return text(
      `Research started for "${args.app}". It takes about 1-3 minutes. Then call get_guide with app="${args.app}". The guide will be at ${guideUrl(toSlug(String(args.app)))} (the name may be normalised).`,
    );
  }

  return null;
}

async function handle(msg: Rpc, origin: string, ip: string) {
  const reply = (result: unknown) => ({ jsonrpc: "2.0", id: msg.id ?? null, result });
  const fail = (code: number, message: string) => ({ jsonrpc: "2.0", id: msg.id ?? null, error: { code, message } });

  switch (msg.method) {
    case "initialize": {
      const requested = String(msg.params?.protocolVersion ?? "");
      return reply({
        protocolVersion: SUPPORTED.includes(requested) ? requested : SUPPORTED[0],
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: "oauth-field-guide", title: "OAuth Field Guide", version: "1.0.0" },
        instructions: INSTRUCTIONS,
      });
    }
    case "ping":
      return reply({});
    case "tools/list":
      return reply({ tools: TOOLS });
    case "tools/call": {
      const name = String(msg.params?.name ?? "");
      const args = (msg.params?.arguments as Record<string, unknown>) ?? {};
      try {
        const result = await callTool(name, args, origin, ip);
        return result ? reply(result) : fail(-32602, `Unknown tool: ${name}`);
      } catch (err) {
        console.error("mcp tool failed", name, err);
        return reply(text("That request failed. Try again in a moment.", true));
      }
    }
    default:
      return fail(-32601, `Method not found: ${msg.method}`);
  }
}

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "POST, GET, OPTIONS",
  "access-control-allow-headers": "content-type, mcp-protocol-version, mcp-session-id, authorization",
};

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return Response.json({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } }, { status: 400, headers: CORS });

  const messages: Rpc[] = Array.isArray(body) ? body : [body];
  const origin = req.nextUrl.origin;
  const ip = clientIp(req.headers);
  // Notifications (no id) get no response.
  const responses = (await Promise.all(messages.filter((m) => m.id !== undefined).map((m) => handle(m, origin, ip)))).filter(Boolean);
  if (!responses.length) return new Response(null, { status: 202, headers: CORS });
  return Response.json(Array.isArray(body) ? responses : responses[0], { headers: CORS });
}

// We don't offer a server-initiated event stream.
export async function GET() {
  return new Response("This MCP endpoint accepts POST requests (Streamable HTTP).", { status: 405, headers: { ...CORS, allow: "POST, OPTIONS" } });
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}
