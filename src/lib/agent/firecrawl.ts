// Finds and reads docs pages with Firecrawl search (https://docs.firecrawl.dev/api-reference/endpoint/search).
// Our code picks what to read; the model only ever sees the resulting text.
//
// Two searches: one restricted to the provider's own domain (official docs, and it rules out
// same-named products), one on the open web for review/marketplace rules, filtered hard.
import { LIMITS } from "./config";
import { rootDomain } from "./probes";

export type Page = { id: string; url: string; title: string; markdown: string };

type SearchResult = { url: string; title?: string; markdown?: string; metadata?: { statusCode?: number } };

// Sites that rank well but never document an OAuth process.
const NOISE = /(^|\.)(youtube\.com|youtu\.be|capterra\.com|g2\.com|trustradius\.com|getapp\.com|softwareadvice\.com|trustpilot\.com|reddit\.com|quora\.com|facebook\.com|x\.com|twitter\.com|linkedin\.com|pinterest\.com|instagram\.com|tiktok\.com)$/;

// Third-party pages are only read from well-known documentation and Q&A sites, so anyone can't
// get a page into the agent's reading list just by mentioning a provider and "OAuth".
export const TRUSTED_THIRD_PARTY = /(^|\.)(learn\.microsoft\.com|docs\.github\.com|github\.com|stackoverflow\.com|developers\.google\.com|support\.google\.com|nango\.dev|developer\.nylas\.com|docs\.merge\.dev|developer\.mozilla\.org|oauth\.net)$/;

export function firecrawlConfigured(): boolean {
  return Boolean(process.env.FIRECRAWL_API_KEY);
}

async function search(query: string, signal: AbortSignal, includeDomains?: string[]): Promise<{ results: SearchResult[]; credits: number }> {
  const res = await fetch("https://api.firecrawl.dev/v2/search", {
    method: "POST",
    headers: { authorization: `Bearer ${process.env.FIRECRAWL_API_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({
      query,
      limit: LIMITS.firecrawl.resultsPerQuery,
      timeout: 45_000,
      ...(includeDomains ? { includeDomains } : {}),
      scrapeOptions: { formats: [{ type: "markdown" }], onlyMainContent: true },
    }),
    signal,
  });
  if (!res.ok) throw new Error(`Firecrawl search failed: ${res.status}`);
  const body = await res.json();
  return { results: body?.data?.web ?? [], credits: Number(body?.creditsUsed ?? 0) };
}

function host(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

// "Harvest (Harvest Time Tracking)" -> "Harvest"; keeps search terms tight.
function searchName(name: string): string {
  return name.replace(/\s*\(.*\)\s*/g, " ").trim() || name;
}

// Follow-up reading for the gap-filling step: the agent picks the questions, our code runs the
// searches with the same filters and returns only pages it hasn't read yet.
export async function readMore(
  name: string,
  website: string,
  questions: string[],
  alreadyRead: string[],
  firstId: number,
  signal: AbortSignal,
  onQuery: (q: string) => void,
): Promise<{ pages: Page[]; credits: number }> {
  const root = rootDomain(website);
  const brand = root.split(".")[0];
  const term = searchName(name);
  const seen = new Set(alreadyRead.map((u) => u.replace(/[#?].*$/, "").replace(/\/$/, "")));
  let credits = 0;
  const found: SearchResult[] = [];
  for (const question of questions.slice(0, LIMITS.agent.maxGapSearches)) {
    const q = `${term} ${question}`.slice(0, 200);
    onQuery(q);
    const { results, credits: used } = await search(q, signal);
    credits += used;
    for (const r of results) {
      const key = r.url.replace(/[#?].*$/, "").replace(/\/$/, "");
      if (seen.has(key) || !r.markdown || (r.metadata?.statusCode ?? 200) >= 400) continue;
      const official = host(r.url) === root || host(r.url).endsWith(`.${root}`);
      if (!official && (!TRUSTED_THIRD_PARTY.test(host(r.url)) || !/oauth|api|app/i.test(r.markdown) || !r.markdown.toLowerCase().includes(brand))) continue;
      seen.add(key);
      found.push(r);
    }
  }
  const pages = found.slice(0, LIMITS.agent.maxNewPages).map((r, i) => ({
    id: `s${firstId + i}`,
    url: r.url,
    title: (r.title ?? r.url).slice(0, 160),
    markdown: r.markdown!.slice(0, LIMITS.firecrawl.maxCharsPerPage),
  }));
  return { pages, credits };
}

export async function readOfficialDocs(
  name: string,
  website: string,
  signal: AbortSignal,
  onQuery: (q: string) => void,
): Promise<{ pages: Page[]; credits: number }> {
  const root = rootDomain(website); // getharvest.com
  const brand = root.split(".")[0];
  const term = searchName(name);
  const isOfficial = (url: string) => host(url) === root || host(url).endsWith(`.${root}`);

  let credits = 0;
  const seen = new Set<string>();
  const official: SearchResult[] = [];
  const other: SearchResult[] = [];
  const add = (results: SearchResult[]) => {
    for (const r of results) {
      const key = r.url.replace(/[#?].*$/, "").replace(/\/$/, "");
      if (seen.has(key) || !r.markdown || (r.metadata?.statusCode ?? 200) >= 400) continue;
      seen.add(key);
      if (isOfficial(r.url)) official.push(r);
      else if (NOISE.test(host(r.url)) || /\/reviews?\b/i.test(r.url) || !TRUSTED_THIRD_PARTY.test(host(r.url))) continue;
      // Third-party pages only count if they're about this provider's OAuth.
      else if (/oauth/i.test(r.markdown) && r.markdown.toLowerCase().includes(brand)) other.push(r);
    }
  };

  const queries: { q: string; domains?: string[] }[] = [
    { q: `${term} OAuth authorization API documentation scopes`, domains: [root] },
    { q: `${term} OAuth app review marketplace listing developer requirements` },
  ];
  for (const { q, domains } of queries) {
    onQuery(q);
    const { results, credits: used } = await search(q, signal, domains);
    credits += used;
    add(results);
  }
  // Official docs sometimes live on a separate developer domain; widen once if we found too few.
  if (official.length < 2) {
    const q = `${term} developer API OAuth docs`;
    onQuery(q);
    const { results, credits: used } = await search(q, signal);
    credits += used;
    add(results);
  }

  // Official docs first; relevant third-party pages fill the rest (at least 2 slots, more when a
  // provider's docs live on another domain, e.g. LinkedIn on Microsoft Learn).
  const officialPicked = official.slice(0, LIMITS.firecrawl.maxPages - 2);
  const picked = [...officialPicked, ...other.slice(0, LIMITS.firecrawl.maxPages - officialPicked.length)];
  const pages = picked.map((r, i) => ({
    id: `s${i + 1}`,
    url: r.url,
    title: (r.title ?? r.url).slice(0, 160),
    markdown: r.markdown!.slice(0, LIMITS.firecrawl.maxCharsPerPage),
  }));
  return { pages, credits };
}
