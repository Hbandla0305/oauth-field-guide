// Finds and reads docs pages with Firecrawl search (https://docs.firecrawl.dev/api-reference/endpoint/search).
// Our code picks what to read; the model only ever sees the resulting text.
//
// Two searches: one restricted to the provider's own domain (official docs, and it rules out
// same-named products), one on the open web for review/marketplace rules, filtered hard.
import { LIMITS } from "./config";

export type Page = { id: string; url: string; title: string; markdown: string };

type SearchResult = { url: string; title?: string; markdown?: string; metadata?: { statusCode?: number } };

// Sites that rank well but never document an OAuth process.
const NOISE = /(^|\.)(youtube\.com|youtu\.be|capterra\.com|g2\.com|trustradius\.com|getapp\.com|softwareadvice\.com|trustpilot\.com|reddit\.com|quora\.com|facebook\.com|x\.com|twitter\.com|linkedin\.com|pinterest\.com|instagram\.com|tiktok\.com)$/;

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

export async function readOfficialDocs(
  name: string,
  website: string,
  signal: AbortSignal,
  onQuery: (q: string) => void,
): Promise<{ pages: Page[]; credits: number }> {
  const root = host(website).split(".").slice(-2).join("."); // getharvest.com
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
      else if (NOISE.test(host(r.url)) || /\/reviews?\b/i.test(r.url)) continue;
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
