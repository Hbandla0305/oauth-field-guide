"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { Difficulty } from "@/lib/guide-schema";
import type { GuideSummary } from "@/lib/guides";
import { DIFFICULTY, DifficultyBadge } from "./difficulty";
import { InfoTip } from "./info-tip";
import { POPULAR_NOTE } from "@/lib/popular";
import { markStart } from "@/lib/start-intent";

const FILTERS: (Difficulty | "all")[] = ["all", "trivial", "moderate", "hard", "gated"];
const PAGE = 25;

const RANK: Record<Difficulty, number> = { trivial: 0, moderate: 1, hard: 2, gated: 3 };

type SortKey = "popular" | "difficulty" | "name" | "dev" | "prod";
type Sort = { key: SortKey; dir: "asc" | "desc" };

// Popular apps first by default (see lib/popular.ts for how that order is built).
const DEFAULT_SORT: Sort = { key: "popular", dir: "asc" };

function compare(a: GuideSummary, b: GuideSummary, { key, dir }: Sort): number {
  const sign = dir === "asc" ? 1 : -1;
  if (key === "popular") {
    return a.popularity - b.popularity || RANK[b.difficulty] - RANK[a.difficulty] || a.name.localeCompare(b.name);
  }
  const by =
    key === "name"
      ? a.name.localeCompare(b.name)
      : key === "dev"
        ? a.devHours.max - b.devHours.max
        : key === "prod"
          ? a.prodHours.max - b.prodHours.max
          : RANK[a.difficulty] - RANK[b.difficulty] || a.prodHours.max - b.prodHours.max;
  return sign * by || a.name.localeCompare(b.name);
}

const normalise = (s: string) => s.toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/[^a-z0-9]+/g, " ").trim();

const haystack = (g: GuideSummary) => normalise(`${g.name} ${g.slug} ${g.category} ${g.aliases.join(" ")}`);

// Edit distance with adjacent swaps counted as one edit ("slak", "hubspt", "gihtub").
function distance(a: string, b: string): number {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  }
  return d[a.length][b.length];
}

// How far a typed word is from the closest word in a guide (also against same-length prefixes,
// so a half-typed typo still matches). Infinity when it's too far to be a typo.
function closeness(word: string, g: GuideSummary): number {
  if (word.length < 3) return Infinity;
  const allowed = word.length <= 5 ? 1 : 2;
  let best = Infinity;
  for (const w of haystack(g).split(" ")) {
    best = Math.min(best, distance(word, w), w.length > word.length ? distance(word, w.slice(0, word.length)) + 0.5 : Infinity);
  }
  return best <= allowed ? best : Infinity;
}

export function GuideSearch({ guides }: { guides: GuideSummary[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Difficulty | "all">("all");
  const [showAll, setShowAll] = useState(false);
  const [sort, setSort] = useState<Sort>(DEFAULT_SORT);

  const q = normalise(query);
  // Exact matches first; if there are none, close matches for typos, closest first.
  const { results, fuzzy } = useMemo(() => {
    const words = q.split(" ").filter(Boolean);
    const pool = guides.filter((g) => filter === "all" || g.difficulty === filter);
    const exact = pool.filter((g) => words.every((w) => haystack(g).includes(w))).sort((a, b) => compare(a, b, sort));
    if (exact.length || !words.length) return { results: exact, fuzzy: false };
    const scored = pool
      .map((g) => ({ g, score: words.reduce((sum, w) => sum + (haystack(g).includes(w) ? 0 : closeness(w, g)), 0) }))
      .filter((x) => Number.isFinite(x.score))
      .sort((a, b) => a.score - b.score || a.g.popularity - b.g.popularity);
    return { results: scored.slice(0, 5).map((x) => x.g), fuzzy: true };
  }, [guides, q, filter, sort]);

  const counts = useMemo(() => Object.fromEntries(FILTERS.map((f) => [f, f === "all" ? guides.length : guides.filter((g) => g.difficulty === f).length])), [guides]);
  const visible = showAll || q ? results : results.slice(0, PAGE);

  function submit() {
    if (!query.trim()) return;
    const exact = results.find((g) => normalise(g.name) === q || g.slug === q.replace(/ /g, "-") || g.aliases.includes(q));
    if (exact) router.push(`/guides/${exact.slug}`);
    else if (results.length === 1) router.push(`/guides/${results[0].slug}`);
    // Close matches are on screen: let the visitor pick one rather than research a typo.
    else if (fuzzy && results.length) document.getElementById("search-results")?.scrollIntoView({ block: "nearest" });
    else {
      markStart(query);
      router.push(`/generate?app=${encodeURIComponent(query.trim())}`);
    }
  }

  return (
    <div>
      <form
        role="search"
        className="flex flex-col gap-2 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <label htmlFor="q" className="sr-only">
          Search apps
        </label>
        <input
          id="q"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          maxLength={80}
          autoComplete="off"
          placeholder={`Search ${guides.length} apps or any website`}
          aria-label="Search apps, or enter any app or website"
          className="h-12 flex-1 rounded-lg border border-line bg-surface px-4 text-base placeholder:text-muted focus:border-ink focus:outline-none"
        />
        <button type="submit" className="h-12 rounded-lg bg-ink px-5 font-medium text-surface hover:bg-ink/90">
          Get the guide
        </button>
      </form>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by difficulty">
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              aria-pressed={filter === f}
              onClick={() => setFilter(f)}
              className={`rounded-full border px-3 py-1 text-sm ${filter === f ? "border-ink bg-ink text-surface" : "border-line bg-surface text-ink hover:border-ink"}`}
            >
              {f === "all" ? "All" : DIFFICULTY[f].label} <span className={filter === f ? "text-surface/70" : "text-muted"}>{counts[f]}</span>
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-sm">
          <span className="text-muted">Sort</span>
          <select
            value={`${sort.key}:${sort.dir}`}
            onChange={(e) => {
              const [key, dir] = e.target.value.split(":") as [SortKey, Sort["dir"]];
              setSort({ key, dir });
            }}
            className="rounded-md border border-line bg-surface px-2 py-1"
          >
            <option value="popular:asc">Popular first</option>
            <option value="difficulty:desc">Hardest first</option>
            <option value="difficulty:asc">Easiest first</option>
            <option value="prod:desc">Longest to go live</option>
            <option value="prod:asc">Quickest to go live</option>
            <option value="dev:asc">Quickest to work in dev</option>
            <option value="dev:desc">Longest to work in dev</option>
            <option value="name:asc">A to Z</option>
            <option value="name:desc">Z to A</option>
          </select>
        </label>
      </div>

      {results.length === 0 ? (
        <div className="mt-5 rounded-xl border border-dashed border-muted/50 bg-surface p-6">
          <p className="font-medium">
            {query.trim() ? `No guide for “${query.trim()}” yet.` : "No guides match these filters."}
          </p>
          {query.trim() && (
            <>
              <p className="mt-1 text-muted">An agent can research it now. It reads the provider&rsquo;s docs, checks its live OAuth endpoints and writes a guide in about two minutes.</p>
              <button type="button" onClick={submit} className="mt-4 rounded-lg bg-ink px-4 py-2 font-medium text-surface hover:bg-ink/90">
                Research {query.trim()}
              </button>
            </>
          )}
        </div>
      ) : (
        <>
          {fuzzy ? (
            <p id="search-results" className="mt-4 text-sm" aria-live="polite">
              No exact match for &ldquo;{query.trim()}&rdquo;. <span className="font-medium">Did you mean:</span>
            </p>
          ) : (
          <p id="search-results" className="mt-4 text-sm text-muted" aria-live="polite">
            {results.length} {results.length === 1 ? "guide" : "guides"}
            {q ? " match" : ""}
            {sort.key === "popular" ? ", popular first" : sort.key === "difficulty" && sort.dir === "desc" ? ", hardest first" : ""}. All are agent-researched unless marked otherwise.
            {sort.key === "popular" && (
              <InfoTip label="How the popular order is built" align="start">
                {POPULAR_NOTE} There&rsquo;s no public usage data for OAuth apps, so this is a stated heuristic, not a measurement.
              </InfoTip>
            )}
          </p>
          )}
          <ResultsTable guides={visible} sort={sort} onSort={setSort} />
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm text-muted">
            <span />
            {!q && !showAll && results.length > PAGE && (
              <button type="button" onClick={() => setShowAll(true)} className="font-medium text-ink underline underline-offset-2">
                Show all {results.length}
              </button>
            )}
            {q && (
              <span>
                Not the one?{" "}
                <Link href={`/generate?app=${encodeURIComponent(query.trim())}`} onClick={() => markStart(query)} className="font-medium text-ink underline underline-offset-2">
                  Research “{query.trim()}” with the agent
                </Link>
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// Only call out guides that differ from the default (agent-researched), so the list isn't
// the same label 110 times.
const STATUS = {
  "human-verified": { label: "Checked by a person", cls: "text-trivial" },
  "agent-researched": null,
  "agent-generated": { label: "Live agent", cls: "text-moderate" },
} as const;

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: "name", label: "App" },
  { key: "difficulty", label: "Difficulty" },
  { key: "dev", label: "Working in dev" },
  { key: "prod", label: "Any user can connect" },
];

// Whole row is clickable via onClick (a stretched ::after link breaks in browsers that
// ignore position on <tr> and swallows clicks elsewhere). The link keeps keyboard access.
function ResultsTable({ guides, sort, onSort }: { guides: GuideSummary[]; sort: Sort; onSort: (s: Sort) => void }) {
  const router = useRouter();
  return (
    <div className="mt-2 overflow-hidden rounded-xl border border-line bg-surface">
      <table className="w-full text-left">
        <thead className="hidden border-b border-line text-sm text-muted md:table-header-group">
          <tr>
            {COLUMNS.map((c) => {
              const active = sort.key === c.key;
              return (
                <th key={c.key} aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"} className="px-5 py-3 font-medium">
                  <button
                    type="button"
                    // First click: A to Z, quickest first, hardest first. A second click reverses it.
                    onClick={() => onSort({ key: c.key, dir: active ? (sort.dir === "asc" ? "desc" : "asc") : c.key === "difficulty" ? "desc" : "asc" })}
                    title={`Sort by ${c.label.toLowerCase()}`}
                    className={`inline-flex items-center gap-1 hover:text-ink ${active ? "text-ink" : ""}`}
                  >
                    {c.label}
                    <span aria-hidden className={active ? "" : "text-muted/60"}>
                      {active ? (sort.dir === "asc" ? "↑" : "↓") : "↕"}
                    </span>
                  </button>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {guides.map((g) => {
            const status = STATUS[g.status];
            return (
              <tr key={g.slug} onClick={() => router.push(`/guides/${g.slug}`)} className="group block cursor-pointer hover:bg-paper md:table-row">
                <td className="block px-5 pt-4 md:table-cell md:py-3.5">
                  <Link href={`/guides/${g.slug}`} onClick={(e) => e.stopPropagation()} className="font-medium group-hover:underline">
                    {g.name}
                  </Link>
                  <p className="text-sm text-muted">
                    {g.category}
                    {status && <span className={`ml-2 ${status.cls}`}>{status.label}</span>}
                  </p>
                </td>
                <td className="block px-5 pt-2 md:table-cell md:py-3.5">
                  <DifficultyBadge difficulty={g.difficulty} />
                </td>
                <td className="inline-block px-5 pt-2 pb-4 text-sm md:table-cell md:py-3.5 md:text-base">
                  <span className="text-muted md:hidden">Dev </span>
                  {g.dev}
                </td>
                <td className="inline-block pt-2 pb-4 text-sm md:table-cell md:px-5 md:py-3.5 md:text-base">
                  <span className="text-muted md:hidden">Any user </span>
                  <span className="font-medium">{g.prod}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
