"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { Difficulty } from "@/lib/guide-schema";
import type { GuideSummary } from "@/lib/guides";
import { DIFFICULTY, DifficultyBadge } from "./difficulty";

const FILTERS: (Difficulty | "all")[] = ["all", "trivial", "moderate", "hard", "gated"];
const PAGE = 25;

const normalise = (s: string) => s.toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/[^a-z0-9]+/g, " ").trim();

export function GuideSearch({ guides }: { guides: GuideSummary[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Difficulty | "all">("all");
  const [checkedOnly, setCheckedOnly] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const q = normalise(query);
  const results = useMemo(() => {
    const words = q.split(" ").filter(Boolean);
    return guides.filter(
      (g) =>
        (filter === "all" || g.difficulty === filter) &&
        (!checkedOnly || g.status === "human-verified") &&
        words.every((w) => normalise(`${g.name} ${g.slug} ${g.category}`).includes(w)),
    );
  }, [guides, q, filter, checkedOnly]);

  const counts = useMemo(() => Object.fromEntries(FILTERS.map((f) => [f, f === "all" ? guides.length : guides.filter((g) => g.difficulty === f).length])), [guides]);
  const visible = showAll || q ? results : results.slice(0, PAGE);

  function submit() {
    if (!query.trim()) return;
    const exact = results.find((g) => normalise(g.name) === q || g.slug === q.replace(/ /g, "-"));
    if (exact) router.push(`/guides/${exact.slug}`);
    else if (results.length === 1) router.push(`/guides/${results[0].slug}`);
    else router.push(`/generate?app=${encodeURIComponent(query.trim())}`);
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
          placeholder={`Search ${guides.length} apps, or enter any app or website`}
          className="h-12 flex-1 rounded-lg border border-line bg-surface px-4 text-base placeholder:text-muted/70 focus:border-ink focus:outline-none"
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
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input type="checkbox" checked={checkedOnly} onChange={(e) => setCheckedOnly(e.target.checked)} className="size-4 accent-ink" />
          Checked by a person only
        </label>
      </div>

      {results.length === 0 ? (
        <div className="mt-5 rounded-xl border border-dashed border-muted/50 bg-surface p-6">
          <p className="font-medium">
            {query.trim()
              ? `No guide for “${query.trim()}” yet.`
              : checkedOnly && !guides.some((g) => g.status === "human-verified")
                ? "No guides have been checked by a person yet. Every guide is agent-researched; untick the box to see them all."
                : "No guides match these filters."}
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
          <ResultsTable guides={visible} />
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm text-muted">
            <span aria-live="polite">
              {results.length} {results.length === 1 ? "guide" : "guides"}
              {q && " match"}
            </span>
            {!q && !showAll && results.length > PAGE && (
              <button type="button" onClick={() => setShowAll(true)} className="font-medium text-ink underline underline-offset-2">
                Show all {results.length}
              </button>
            )}
            {q && (
              <span>
                Not the one?{" "}
                <Link href={`/generate?app=${encodeURIComponent(query.trim())}`} className="font-medium text-ink underline underline-offset-2">
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

const STATUS = {
  "human-verified": { label: "Checked", cls: "text-trivial" },
  "agent-researched": { label: "Agent-researched", cls: "text-muted" },
  "agent-generated": { label: "Live agent", cls: "text-moderate" },
} as const;

// Whole row is clickable via onClick (a stretched ::after link breaks in browsers that
// ignore position on <tr> and swallows clicks elsewhere). The link keeps keyboard access.
function ResultsTable({ guides }: { guides: GuideSummary[] }) {
  const router = useRouter();
  return (
    <div className="mt-4 overflow-hidden rounded-xl border border-line bg-surface">
      <table className="w-full text-left">
        <thead className="hidden border-b border-line text-sm text-muted md:table-header-group">
          <tr>
            <th className="px-5 py-3 font-medium">App</th>
            <th className="px-5 py-3 font-medium">Difficulty</th>
            <th className="px-5 py-3 font-medium">Working in dev</th>
            <th className="px-5 py-3 font-medium">Any user can connect</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {guides.map((g) => (
            <tr key={g.slug} onClick={() => router.push(`/guides/${g.slug}`)} className="group block cursor-pointer hover:bg-paper md:table-row">
              <td className="block px-5 pt-4 md:table-cell md:py-3.5">
                <Link href={`/guides/${g.slug}`} onClick={(e) => e.stopPropagation()} className="font-medium group-hover:underline">
                  {g.name}
                </Link>
                <p className="text-sm text-muted">
                  {g.category}
                  <span className={`ml-2 ${STATUS[g.status].cls}`}>{STATUS[g.status].label}</span>
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
          ))}
        </tbody>
      </table>
    </div>
  );
}
