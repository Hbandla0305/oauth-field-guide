import { Guide, type Difficulty } from "./guide-schema";
import { getGeneratedGuide, listGeneratedGuides } from "./db";
import { RAW_GUIDES } from "@/data/guides/index";
import { popularity } from "./popular";

const DIFFICULTY_ORDER: Difficulty[] = ["trivial", "moderate", "hard", "gated"];
const TIER_ORDER = ["human-verified", "agent-researched", "agent-generated"] as const;

// Invalid files are skipped rather than breaking the site; `npm run validate` reports them.
export const LIBRARY: Guide[] = RAW_GUIDES.flatMap((raw) => {
  const parsed = Guide.safeParse(raw);
  if (!parsed.success) console.warn(`Skipping invalid guide: ${(raw as { app?: { slug?: string } })?.app?.slug}`);
  return parsed.success ? [parsed.data] : [];
}).sort(
  (a, b) =>
    TIER_ORDER.indexOf(a.verification.status) - TIER_ORDER.indexOf(b.verification.status) ||
    DIFFICULTY_ORDER.indexOf(a.verdict.difficulty) - DIFFICULTY_ORDER.indexOf(b.verdict.difficulty) ||
    a.app.name.localeCompare(b.app.name),
);

// Names people type for products covered by a library guide.
const ALIASES: Record<string, string> = {
  gmail: "google",
  "google-calendar": "google",
  "google-drive": "google",
  "google-workspace": "google",
  outlook: "microsoft",
  "microsoft-teams": "microsoft",
  teams: "microsoft",
  onedrive: "microsoft",
  "microsoft-graph": "microsoft",
  "office-365": "microsoft",
  jira: "atlassian",
  confluence: "atlassian",
  facebook: "meta",
  instagram: "meta",
  whatsapp: "meta",
  twitter: "x",
  "quickbooks-online": "quickbooks",
  intuit: "quickbooks",
  "apollo-io": "apollo",
  "monday-com": "monday",
  "cal": "cal-com",
};

export function resolveSlug(slug: string): string {
  return ALIASES[slug] ?? slug;
}

export async function findGuide(slug: string): Promise<Guide | null> {
  const key = resolveSlug(slug);
  return LIBRARY.find((g) => g.app.slug === key) ?? (await getGeneratedGuide(key).catch(() => null));
}

export async function recentGenerated(): Promise<Guide[]> {
  const known = new Set(LIBRARY.map((g) => g.app.slug));
  return (await listGeneratedGuides(30).catch(() => [])).filter((g) => !known.has(g.app.slug));
}

// The slim shape the search page needs, so 100+ full guides aren't shipped to the browser.
export type GuideSummary = {
  slug: string;
  name: string;
  category: string;
  difficulty: Difficulty;
  status: Guide["verification"]["status"];
  dev: string;
  prod: string;
  devHours: Guide["verdict"]["timeToDev"]["hours"];
  prodHours: Guide["verdict"]["timeToProd"]["hours"];
  popularity: number;
};

export function summarise(g: Guide): GuideSummary {
  return {
    slug: g.app.slug,
    name: g.app.name,
    category: g.app.category,
    difficulty: g.verdict.difficulty,
    status: g.verification.status,
    dev: g.verdict.timeToDev.range,
    prod: g.verdict.timeToProd.range,
    devHours: g.verdict.timeToDev.hours,
    prodHours: g.verdict.timeToProd.hours,
    popularity: popularity(g.app.slug),
  };
}
