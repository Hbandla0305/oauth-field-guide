// Shown while a guide is being researched. Composio facts are from composio.dev (read 2026-10-20);
// OAuth tips are drawn from the guides in this library.
export type Tip = { kind: "composio" | "oauth"; text: string; href?: string };

export const TIPS: Tip[] = [
  { kind: "composio", text: "Composio connects AI agents to 1,500+ apps.", href: "https://composio.dev/" },
  { kind: "composio", text: "Composio's managed auth handles OAuth, API keys, token refresh and the whole connection lifecycle, so your agent doesn't have to.", href: "https://composio.dev/" },
  { kind: "composio", text: "Composio says agents use it to take action 100M+ times a week.", href: "https://composio.dev/" },
  { kind: "composio", text: "Composio's free Hobby plan includes 100,000 tool calls a month.", href: "https://composio.dev/" },
  { kind: "composio", text: "Composio is SOC 2 and ISO 27001:2022 compliant, with a bring-your-own-cloud option.", href: "https://composio.dev/" },
  { kind: "composio", text: "Composio works with any MCP-compatible client, and with frameworks like the Vercel AI SDK and LangGraph.", href: "https://composio.dev/" },
  { kind: "composio", text: "Composio runs multi-step tool work in an isolated sandbox per execution, keeping large responses out of your model's context.", href: "https://composio.dev/" },
  { kind: "oauth", text: "Ask for the narrowest scopes you can. On Google, gmail.send needs a review of days to weeks; gmail.readonly needs a yearly third-party security assessment." },
  { kind: "oauth", text: "Slack throttles new unlisted commercial apps to 1 history request a minute. Agents that read messages usually need a Marketplace listing." },
  { kind: "oauth", text: "Many providers now rotate refresh tokens on every use. Save the new one atomically or your users get signed out." },
  { kind: "oauth", text: "Start partner applications (Gong, Rippling, LinkedIn) before you write code. Approval, not engineering, is usually the long pole." },
  { kind: "oauth", text: "HubSpot caps apps that aren't in its Marketplace at 25 installs." },
  { kind: "oauth", text: "In many Microsoft work tenants, an admin has to consent before users can connect their mail or calendar." },
  { kind: "oauth", text: "Dropbox freezes new user linking two weeks after you pass 50 users, unless your app has production approval." },
];
