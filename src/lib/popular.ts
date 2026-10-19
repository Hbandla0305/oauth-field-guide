// "Popular first" ordering. There's no public usage data per OAuth app, so this is a stated
// heuristic: apps featured on composio.dev's homepage (read 2026-10-20) first, then other
// integrations agent builders commonly ask for. Everything else follows, hardest first.
export const POPULAR = [
  // Featured on composio.dev
  "google", "slack", "github", "microsoft", "notion", "hubspot", "salesforce", "linear",
  "meta", "linkedin", "youtube", "google-ads", "sentry", "supabase", "vercel",
  // Common agent integrations
  "atlassian", "zoom", "asana", "dropbox", "airtable", "calendly", "shopify", "stripe",
  "zendesk", "intercom", "discord", "trello", "figma", "monday", "clickup", "box",
  "quickbooks", "xero", "docusign", "x", "gitlab", "pipedrive", "attio", "gong",
];

export const POPULAR_NOTE = "Popular first: apps featured on composio.dev, then other common agent integrations, then the rest hardest first.";

export function popularity(slug: string): number {
  const i = POPULAR.indexOf(slug);
  return i === -1 ? POPULAR.length : i;
}
