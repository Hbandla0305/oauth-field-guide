// Finds and reads official docs pages with Firecrawl search (https://docs.firecrawl.dev/api-reference/endpoint/search).
// Our code picks what to read; the model only ever sees the resulting text.
import { LIMITS } from "./config";

export type Page = { id: string; url: string; title: string; markdown: string };

type SearchResult = { url: string; title?: string; markdown?: string; metadata?: { statusCode?: number } };

export function firecrawlConfigured(): boolean {
  return Boolean(process.env.FIRECRAWL_API_KEY);
}

async function search(query: string, signal: AbortSignal): Promise<{ results: SearchResult[]; credits: number }> {
  const res = await fetch("https://api.firecrawl.dev/v2/search", {
    method: "POST",
    headers: { authorization: `Bearer ${process.env.FIRECRAWL_API_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({
      query,
      limit: LIMITS.firecrawl.resultsPerQuery,
      timeout: 45_000,
      scrapeOptions: { formats: [{ type: "markdown" }], onlyMainContent: true },
    }),
    signal,
  });
  if (!res.ok) throw new Error(`Firecrawl search failed: ${res.status}`);
  const body = await res.json();
  return { results: body?.data?.web ?? [], credits: Number(body?.creditsUsed ?? 0) };
}

// Official pages first: hosts that contain the provider's name (zoom.us, developers.zoom.us).
function officialness(url: string, brand: string): number {
  try {
    const host = new URL(url).hostname;
    return host.includes(brand) ? 0 : 1;
  } catch {
    return 2;
  }
}

export async function readOfficialDocs(
  name: string,
  website: string,
  signal: AbortSignal,
  onQuery: (q: string) => void,
): Promise<{ pages: Page[]; credits: number }> {
  const brand = new URL(website).hostname.replace(/^www\./, "").split(".").slice(-2, -1)[0] ?? name.toLowerCase();
  const queries = [
    `${name} OAuth app developer documentation scopes`,
    `${name} app review verification marketplace listing requirements for developers`,
  ];
  let credits = 0;
  const seen = new Set<string>();
  const found: SearchResult[] = [];
  for (const q of queries) {
    onQuery(q);
    const { results, credits: used } = await search(q, signal);
    credits += used;
    for (const r of results) {
      const key = r.url.replace(/[#?].*$/, "").replace(/\/$/, "");
      if (seen.has(key) || !r.markdown || (r.metadata?.statusCode ?? 200) >= 400) continue;
      seen.add(key);
      found.push(r);
    }
  }
  const pages = found
    .sort((a, b) => officialness(a.url, brand) - officialness(b.url, brand))
    .slice(0, LIMITS.firecrawl.maxPages)
    .map((r, i) => ({
      id: `s${i + 1}`,
      url: r.url,
      title: (r.title ?? r.url).slice(0, 160),
      markdown: r.markdown!.slice(0, LIMITS.firecrawl.maxCharsPerPage),
    }));
  return { pages, credits };
}
