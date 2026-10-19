import { Guide, type Difficulty } from "./guide-schema";
import { getGeneratedGuide, listGeneratedGuides } from "./db";
import github from "@/data/guides/github.json";
import google from "@/data/guides/google.json";
import slack from "@/data/guides/slack.json";
import notion from "@/data/guides/notion.json";
import hubspot from "@/data/guides/hubspot.json";
import linkedin from "@/data/guides/linkedin.json";

const DIFFICULTY_ORDER: Difficulty[] = ["trivial", "moderate", "hard", "gated"];

export const CURATED: Guide[] = [github, notion, slack, hubspot, google, linkedin]
  .map((g) => Guide.parse(g))
  .sort((a, b) => DIFFICULTY_ORDER.indexOf(a.verdict.difficulty) - DIFFICULTY_ORDER.indexOf(b.verdict.difficulty));

// Names people type for products covered by a curated guide.
const ALIASES: Record<string, string> = {
  gmail: "google",
  "google-calendar": "google",
  "google-drive": "google",
  "google-workspace": "google",
  "google-cloud": "google",
  "gmail-api": "google",
  "slack-api": "slack",
  "linkedin-api": "linkedin",
  "hubspot-crm": "hubspot",
  "notion-api": "notion",
  "github-app": "github",
};

export async function findGuide(slug: string): Promise<Guide | null> {
  const key = ALIASES[slug] ?? slug;
  return CURATED.find((g) => g.app.slug === key) ?? (await getGeneratedGuide(key).catch(() => null));
}

export async function recentGenerated(): Promise<Guide[]> {
  const curated = new Set(CURATED.map((g) => g.app.slug));
  return (await listGeneratedGuides().catch(() => [])).filter((g) => !curated.has(g.app.slug));
}
