import type { Guide } from "@/lib/guide-schema";
import { guideSection, type Section } from "@/lib/guide-text";
import { guideCard, slackText } from "@/lib/slack";

export const SITE = process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "https://oauth-field-guide.vercel.app";

export const guideUrl = (slug: string) => `${SITE}/guides/${slug}`;

// Words people use for each section, so "/oauth-guide gmail scopes" works.
const SECTION_WORDS: Record<string, Section> = {
  steps: "steps",
  checklist: "steps",
  permissions: "permissions",
  scopes: "permissions",
  troubleshoot: "troubleshoot",
  errors: "troubleshoot",
  blockers: "troubleshoot",
  "good-to-know": "good_to_know",
  nuances: "good_to_know",
  limits: "good_to_know",
  resources: "resources",
  docs: "resources",
  sources: "resources",
  all: "all",
};

export function splitSection(text: string): { app: string; section: Section | null } {
  const words = text.trim().split(/\s+/);
  const last = words.at(-1)?.toLowerCase() ?? "";
  if (words.length > 1 && SECTION_WORDS[last]) return { app: words.slice(0, -1).join(" "), section: SECTION_WORDS[last] };
  return { app: text.trim(), section: null };
}

export function guideMessage(g: Guide, section: Section | null) {
  const url = guideUrl(g.app.slug);
  if (section) return { text: slackText(guideSection(g, section, url)) };
  return { text: `${g.app.name}: ${g.verdict.difficulty}. Dev ${g.verdict.timeToDev.range}, any user ${g.verdict.timeToProd.range}. ${url}`, blocks: guideCard(g, url) };
}

export const HELP = [
  "*OAuth Guide* tells you what it takes to get your own OAuth app approved with a provider.",
  "• `/oauth-guide gmail`: difficulty, how long until it works in dev and until any user can connect, what you're waiting on, cost",
  "• `/oauth-guide gmail permissions`: one section (`steps`, `permissions`, `troubleshoot`, `good-to-know`, `resources`)",
  "• `/oauth-guide research loom`: research an app that isn't in the library (about 2 minutes)",
  "• `@OAuth Guide what blocks a Slack app from reading messages?`: an answer from the matching guide, with sources",
  `Browse every guide: ${SITE}`,
].join("\n");
