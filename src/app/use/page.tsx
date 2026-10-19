import type { Metadata } from "next";
import Link from "next/link";
import { CopyBox } from "@/components/copy-box";

export const metadata: Metadata = {
  title: "Use it anywhere",
  description: "Use OAuth Field Guide on the web, inside Claude, Claude Code, Cursor and other MCP clients, with ready-to-copy prompts.",
};

const SITE = process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "https://oauth-field-guide.vercel.app";
const MCP_URL = `${SITE}/api/mcp`;

const SECTIONS = [
  ["web", "Website"],
  ["claude", "Claude"],
  ["claude-code", "Claude Code"],
  ["editors", "Cursor, VS Code & others"],
  ["prompts", "Prompts to try"],
] as const;

const PROMPTS: { title: string; prompt: string }[] = [
  { title: "Compare apps before you commit", prompt: "Using OAuth Field Guide, compare Gmail, Slack and HubSpot: which will take longest before any user can connect my agent, what are we waiting on for each, and what does it cost?" },
  { title: "Choose the right permissions", prompt: "Using OAuth Field Guide, my agent needs to read and draft emails in Gmail. Which scopes do I need, which review tier does each trigger, and is there a lower tier that still works?" },
  { title: "Fix an error you're stuck on", prompt: "Using OAuth Field Guide, I'm getting \"Error 403: access_denied. The app is currently being tested\" from Google. What's the cause and how do I fix it?" },
  { title: "Get the checklist, split by who does what", prompt: "Using OAuth Field Guide, give me the step-by-step setup for a Slack app that reads channel messages. Mark which steps you can do for me and which need me." },
  { title: "Have the AI do the AI steps", prompt: "Using OAuth Field Guide's Google guide, draft the scope justification text and a privacy policy section for an agent that sends email with gmail.send. Flag anything I must confirm in the Google console." },
  { title: "Research an app that isn't in the library", prompt: "Using OAuth Field Guide, research Loom: is there an OAuth app review, how long until any user can connect, and what will block me? If it's not in the library, generate the guide and check back." },
  { title: "Plan a launch", prompt: "Using OAuth Field Guide, I'm launching an agent in 6 weeks that connects to Salesforce, Zoom and Microsoft Outlook. Which applications or reviews do I need to start this week to make that date?" },
];

export default function UsePage() {
  return (
    <main className="mx-auto max-w-4xl px-4 pb-24 sm:px-6">
      <div className="py-5">
        <Link href="/" className="text-sm text-muted hover:text-ink">
          ← All guides
        </Link>
      </div>
      <h1 className="font-display text-4xl font-semibold tracking-tight">Use it anywhere</h1>
      <p className="mt-3 max-w-2xl text-lg leading-relaxed text-muted">
        The guides work on this site, and as a tool your AI assistant can call while you build. Same guides, same evidence labels, same agent for apps that aren&rsquo;t in the
        library yet.
      </p>

      <nav aria-label="On this page" className="mt-6 flex flex-wrap gap-2">
        {SECTIONS.map(([id, label]) => (
          <a key={id} href={`#${id}`} className="rounded-full border border-line bg-surface px-3 py-1 text-sm hover:border-ink">
            {label}
          </a>
        ))}
      </nav>

      <Section id="web" title="On the website">
        <Steps
          items={[
            <>Search for an app on the <Link href="/" className="underline underline-offset-2">home page</Link>, or filter by difficulty. The list starts with the most popular apps.</>,
            <>Open a guide. The top card answers the two questions that matter: how long until it works for you, and how long until any user can connect. Hover or tap the “?” to see how each estimate was made.</>,
            <>Work through <strong>Steps involved</strong>: tick steps off as you go. On steps marked <em>AI can help</em>, use <strong>Copy prompt</strong> and paste it into your AI assistant.</>,
            <>Stuck? Paste the error into <strong>Troubleshoot</strong>, or use <strong>Chat about this guide</strong>. Chat answers only from that guide and cites its sources.</>,
            <>App not in the library? Type its name or website and press <strong>Get the guide</strong>. An agent researches it live in about two minutes and saves it for everyone.</>,
            <>Share it: <strong>Copy link</strong>, <strong>Copy as Markdown</strong> for a ticket or doc, or <strong>Download .md</strong>.</>,
          ]}
        />
      </Section>

      <Section id="claude" title="In Claude (claude.ai and Claude Desktop)">
        <p className="text-muted">Add OAuth Field Guide as a custom connector. Claude can then look up guides, pull just the section you need, and research new apps while you chat.</p>
        <Steps
          items={[
            <>In Claude, open <strong>Settings → Connectors</strong> and choose <strong>Add custom connector</strong>.</>,
            <>Name it <strong>OAuth Field Guide</strong> and paste this URL. No sign-in is needed.</>,
          ]}
        />
        <CopyBox text={MCP_URL} label="Copy URL" />
        <Steps
          start={3}
          items={[
            <>In a new chat, enable the connector from the tools menu, then ask a question that names it, for example: <em>“Using OAuth Field Guide, how long until users can connect Gmail?”</em></>,
            <>Claude asks permission the first time it calls a tool. The three tools are <code>search_guides</code>, <code>get_guide</code> and <code>generate_guide</code>.</>,
          ]}
        />
        <Note>Custom connectors depend on your Claude plan and your organisation&rsquo;s settings. If you don&rsquo;t see the option, ask your workspace admin.</Note>
      </Section>

      <Section id="claude-code" title="In Claude Code">
        <p className="text-muted">Add the server once, and Claude Code can check OAuth requirements while it writes your integration.</p>
        <CopyBox text={`claude mcp add --transport http oauth-field-guide ${MCP_URL}`} />
        <Steps
          items={[
            <>Run the command above in your terminal. Add <code>--scope user</code> to make it available in every project.</>,
            <>Start Claude Code and run <code>/mcp</code> to confirm <strong>oauth-field-guide</strong> is connected.</>,
            <>Ask while you build: <em>“Before we add the Slack integration, check OAuth Field Guide for what blocks an app that reads messages.”</em></>,
          ]}
        />
      </Section>

      <Section id="editors" title="In Cursor, VS Code and other MCP clients">
        <p className="text-muted">Any client that supports remote MCP servers over HTTP works. Point it at the same URL.</p>
        <h3 className="mt-6 font-medium">Cursor</h3>
        <p className="mt-1 text-sm text-muted">
          Add to <code>~/.cursor/mcp.json</code> (all projects) or <code>.cursor/mcp.json</code> (one project):
        </p>
        <div className="mt-2">
          <CopyBox text={JSON.stringify({ mcpServers: { "oauth-field-guide": { url: MCP_URL } } }, null, 2)} />
        </div>
        <h3 className="mt-6 font-medium">VS Code</h3>
        <p className="mt-1 text-sm text-muted">
          Add to <code>.vscode/mcp.json</code> in your project:
        </p>
        <div className="mt-2">
          <CopyBox text={JSON.stringify({ servers: { "oauth-field-guide": { type: "http", url: MCP_URL } } }, null, 2)} />
        </div>
        <h3 className="mt-6 font-medium">Anything else</h3>
        <p className="mt-1 text-sm text-muted">
          Use the URL above with the Streamable HTTP transport. The server is stateless, needs no authentication, and returns plain JSON-RPC responses.
        </p>
      </Section>

      <Section id="prompts" title="Prompts to try">
        <p className="text-muted">Work in Claude, Claude Code, Cursor or any connected assistant. Naming “OAuth Field Guide” helps the assistant pick the right tool.</p>
        <ul className="mt-4 space-y-4">
          {PROMPTS.map((p) => (
            <li key={p.title}>
              <p className="mb-1.5 text-sm font-medium">{p.title}</p>
              <CopyBox text={p.prompt} mono={false} />
            </li>
          ))}
        </ul>
      </Section>

      <Section id="limits" title="Limits">
        <ul className="list-disc space-y-1.5 pl-5 text-muted">
          <li>Looking up and reading guides is free and unlimited.</li>
          <li>Researching a new app is limited to a few per hour per network and a daily cap, because it calls paid AI and search services.</li>
          <li>New guides are agent-written and labelled that way. Check the evidence labels before relying on a claim.</li>
        </ul>
      </Section>
    </main>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mt-14 scroll-mt-6">
      <h2 className="font-display text-2xl font-semibold tracking-tight">{title}</h2>
      <div className="mt-3 space-y-4">{children}</div>
    </section>
  );
}

function Steps({ items, start = 1 }: { items: React.ReactNode[]; start?: number }) {
  return (
    <ol className="space-y-3">
      {items.map((item, i) => (
        <li key={i} className="grid grid-cols-[1.75rem_1fr] gap-2">
          <span className="font-display font-semibold text-muted">{start + i}</span>
          <span className="leading-relaxed">{item}</span>
        </li>
      ))}
    </ol>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return <p className="rounded-lg bg-faint px-4 py-3 text-sm text-muted">{children}</p>;
}
