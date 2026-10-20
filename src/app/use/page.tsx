import type { Metadata } from "next";
import Link from "next/link";
import { CopyBox } from "@/components/copy-box";
import { PageTour } from "@/components/page-tour";
import { TOURS } from "@/lib/tours";

export const metadata: Metadata = {
  title: "Use it anywhere",
  description: "Use OAuth Guide on the web, in Slack, and inside Claude, Claude Code, Cursor and other MCP clients, with ready-to-copy prompts.",
};

const SITE = process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "https://oauth-guide-composio.hrudvibandla.com";
const MCP_URL = `${SITE}/api/mcp`;

const SECTIONS = [
  ["web", "Website"],
  ["claude", "Claude"],
  ["claude-code", "Claude Code"],
  ["editors", "Cursor, VS Code & other assistants"],
  ["slack", "Slack"],
  ["prompts", "Prompts to try"],
] as const;

// Paste into Slack's "Create an app → From a manifest".
const SLACK_MANIFEST = {
  display_information: {
    name: "OAuth Guide",
    description: "How long until your users can connect? OAuth app setup and approval guides.",
    background_color: "#142033",
  },
  features: {
    bot_user: { display_name: "OAuth Guide", always_online: true },
    slash_commands: [
      {
        command: "/oauth-guide",
        url: `${SITE}/api/slack/commands`,
        description: "OAuth app setup and approval guide for any app",
        usage_hint: "gmail | gmail permissions | research loom | help",
        should_escape: false,
      },
    ],
  },
  oauth_config: { scopes: { bot: ["app_mentions:read", "chat:write", "commands"] } },
  settings: {
    event_subscriptions: { request_url: `${SITE}/api/slack/events`, bot_events: ["app_mention"] },
    org_deploy_enabled: false,
    socket_mode_enabled: false,
    token_rotation_enabled: false,
  },
};

const SLACK_EXAMPLES = [
  "/oauth-guide gmail",
  "/oauth-guide slack permissions",
  "/oauth-guide hubspot troubleshoot",
  "/oauth-guide research loom",
  "@OAuth Guide what blocks a Slack app from reading messages?",
  "@OAuth Guide do I need admin consent for Microsoft Outlook?",
];

const PROMPTS: { title: string; prompt: string }[] = [
  { title: "Compare apps before you commit", prompt: "Using OAuth Guide, compare Gmail, Slack and HubSpot: which will take longest before any user can connect my agent, what are we waiting on for each, and what does it cost?" },
  { title: "Choose the right permissions", prompt: "Using OAuth Guide, my agent needs to read and draft emails in Gmail. Which scopes do I need, which review tier does each trigger, and is there a lower tier that still works?" },
  { title: "Fix an error you're stuck on", prompt: "Using OAuth Guide, I'm getting \"Error 403: access_denied. The app is currently being tested\" from Google. What's the cause and how do I fix it?" },
  { title: "Get the checklist, split by who does what", prompt: "Using OAuth Guide, give me the step-by-step setup for a Slack app that reads channel messages. Mark which steps you can do for me and which need me." },
  { title: "Have the AI do the AI steps", prompt: "Using OAuth Guide's Google guide, draft the scope justification text and a privacy policy section for an agent that sends email with gmail.send. Flag anything I must confirm in the Google console." },
  { title: "Research an app that isn't in the library", prompt: "Using OAuth Guide, research Loom: is there an OAuth app review, how long until any user can connect, and what will block me? If it's not in the library, generate the guide and check back." },
  { title: "Plan a launch", prompt: "Using OAuth Guide, I'm launching an agent in 6 weeks that connects to Salesforce, Zoom and Microsoft Outlook. Which applications or reviews do I need to start this week to make that date?" },
];

export default function UsePage() {
  return (
    <main className="mx-auto max-w-4xl px-4 pb-24 sm:px-6">
      <PageTour id="use" steps={TOURS.use} />
      <div className="py-5">
        <Link href="/" className="text-sm text-muted hover:text-ink">
          ← All guides
        </Link>
      </div>
      <h1 className="font-display text-4xl font-semibold tracking-tight">Use it anywhere</h1>
      <p className="mt-3 max-w-2xl text-lg leading-relaxed text-muted">
        The guides work on this site, in Slack, and as a tool any AI assistant that supports MCP can call while you build: Claude, ChatGPT, Cursor, VS Code, Windsurf and others. Same guides, same evidence labels, same agent for apps that aren&rsquo;t in the
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
        <p className="text-muted">Add OAuth Guide as a custom connector. Claude can then look up guides, pull just the section you need, and research new apps while you chat.</p>
        <Steps
          items={[
            <>In Claude, open <strong>Settings → Connectors</strong> and choose <strong>Add custom connector</strong>.</>,
            <>Name it <strong>OAuth Guide</strong> and paste this URL. No sign-in is needed.</>,
          ]}
        />
        <CopyBox text={MCP_URL} label="Copy URL" />
        <Steps
          start={3}
          items={[
            <>In a new chat, enable the connector from the tools menu, then ask a question that names it, for example: <em>“Using OAuth Guide, how long until users can connect Gmail?”</em></>,
            <>Claude asks permission the first time it calls a tool. The three tools are <code>search_guides</code>, <code>get_guide</code> and <code>generate_guide</code>.</>,
          ]}
        />
        <Note>Custom connectors depend on your Claude plan and your organisation&rsquo;s settings. If you don&rsquo;t see the option, ask your workspace admin.</Note>
      </Section>

      <Section id="claude-code" title="In Claude Code">
        <p className="text-muted">Add the server once, and Claude Code can check OAuth requirements while it writes your integration.</p>
        <CopyBox text={`claude mcp add --transport http oauth-guide ${MCP_URL}`} />
        <Steps
          items={[
            <>Run the command above in your terminal. Add <code>--scope user</code> to make it available in every project.</>,
            <>Start Claude Code and run <code>/mcp</code> to confirm <strong>oauth-guide</strong> is connected.</>,
            <>Ask while you build: <em>“Before we add the Slack integration, check OAuth Guide for what blocks an app that reads messages.”</em></>,
          ]}
        />
      </Section>

      <Section id="editors" title="In Cursor, VS Code and other AI assistants">
        <p className="text-muted">
          Any assistant that supports remote MCP servers over HTTP works with the same URL, including ChatGPT (as a custom connector), Windsurf and Zed. Setup for the most common ones:
        </p>
        <h3 className="mt-6 font-medium">Cursor</h3>
        <p className="mt-1 text-sm text-muted">
          Add to <code>~/.cursor/mcp.json</code> (all projects) or <code>.cursor/mcp.json</code> (one project):
        </p>
        <div className="mt-2">
          <CopyBox text={JSON.stringify({ mcpServers: { "oauth-guide": { url: MCP_URL } } }, null, 2)} />
        </div>
        <h3 className="mt-6 font-medium">VS Code</h3>
        <p className="mt-1 text-sm text-muted">
          Add to <code>.vscode/mcp.json</code> in your project:
        </p>
        <div className="mt-2">
          <CopyBox text={JSON.stringify({ servers: { "oauth-guide": { type: "http", url: MCP_URL } } }, null, 2)} />
        </div>
        <h3 className="mt-6 font-medium">Anything else</h3>
        <p className="mt-1 text-sm text-muted">
          Use the URL above with the Streamable HTTP transport. The server is stateless, needs no authentication, and returns plain JSON-RPC responses.
        </p>
      </Section>

      <Section id="slack" title="In Slack">
        <p className="text-muted">
          Ask from any channel: <code>/oauth-guide gmail</code> posts a card with the difficulty, both timelines, what you&rsquo;re waiting on and the cost. Mention the bot with a question and
          it answers in a thread from the matching guide, with sources.
        </p>
        <Note>
          <strong>Status:</strong> the Slack app is built and tested with Slack-signed requests (signature checks, slash commands, the verdict card), but isn&rsquo;t installed
          in a public workspace yet. Install it in your own workspace with the steps below; it runs on this deployment once the two Slack secrets are set.
        </Note>
        <h3 className="mt-6 font-medium">Set it up (about 5 minutes, once per workspace)</h3>
        <Steps
          items={[
            <>
              Go to <a href="https://api.slack.com/apps?new_app=1" className="underline underline-offset-2" target="_blank" rel="noreferrer">api.slack.com/apps</a>, choose <strong>Create New App → From a manifest</strong>, and pick your workspace.
            </>,
            <>Choose JSON, paste the manifest below, and create the app. It asks for three permissions: read mentions, post messages, and add a slash command.</>,
          ]}
        />
        <CopyBox text={JSON.stringify(SLACK_MANIFEST, null, 2)} label="Copy manifest" />
        <Steps
          start={3}
          items={[
            <>Under <strong>Install App</strong>, install it to your workspace and copy the <strong>Bot User OAuth Token</strong> (starts with <code>xoxb-</code>).</>,
            <>Under <strong>Basic Information</strong>, copy the <strong>Signing Secret</strong>.</>,
            <>
              Whoever runs this deployment adds both in Vercel (<strong>Settings → Environment Variables</strong>, Production) as <code>SLACK_BOT_TOKEN</code> and <code>SLACK_SIGNING_SECRET</code>, then
              redeploys.
            </>,
            <>
              Back in Slack, under <strong>Event Subscriptions</strong>, check that the Request URL shows <em>Verified</em>. Invite the bot to a channel with <code>/invite @OAuth Guide</code>.
            </>,
          ]}
        />
        <h3 className="mt-6 font-medium">Try these</h3>
        <ul className="mt-2 space-y-2">
          {SLACK_EXAMPLES.map((e) => (
            <li key={e}>
              <CopyBox text={e} />
            </li>
          ))}
        </ul>
        <Note>
          Library apps answer instantly. Researching a new app posts the guide in the channel when it&rsquo;s ready, about 1-3 minutes later. This is an internal app for one
          workspace, so it isn&rsquo;t affected by the rate limits Slack applies to Marketplace-unlisted commercial apps (see our <Link href="/guides/slack" className="underline underline-offset-2">Slack guide</Link>).
        </Note>
      </Section>

      <Section id="prompts" title="Prompts to try">
        <p className="text-muted">Work in Claude, Claude Code, Cursor or any connected assistant. Naming “OAuth Guide” helps the assistant pick the right tool. In Slack, put the question after <code>@OAuth Guide</code>.</p>
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
