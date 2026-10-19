import Link from "next/link";
import type { Guide } from "@/lib/guide-schema";
import { CURATED, recentGenerated } from "@/lib/guides";
import { DifficultyBadge, DIFFICULTY } from "@/components/difficulty";
import { EvidenceLegend } from "@/components/evidence";
import { TimelineCompact } from "@/components/timeline";
import { GenerateForm } from "@/components/generate-form";

export const revalidate = 60;

export default async function Home() {
  const generated = await recentGenerated();
  return (
    <main className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
      <section className="max-w-3xl pt-14 pb-10 sm:pt-20">
        <h1 className="font-display text-4xl leading-[1.05] font-semibold tracking-tight text-balance sm:text-6xl">
          How long until your users can connect?
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted">
          Before your agent can act in someone&rsquo;s Gmail, Slack or CRM, you need your own OAuth app with that provider, and some won&rsquo;t let real users in until
          they&rsquo;ve reviewed it. Look up an app to see the steps, the waits and the blockers, with the evidence behind each claim.
        </p>
        <div className="mt-8">
          <GenerateForm />
        </div>
      </section>

      <section aria-labelledby="library">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 id="library" className="font-display text-2xl font-semibold tracking-tight">
              Checked guides
            </h2>
            <p className="mt-1 text-muted">Researched by agents, then checked and corrected by a person.</p>
          </div>
          <TimelineKey />
        </div>
        <GuideTable guides={CURATED} />
      </section>

      {generated.length > 0 && (
        <section aria-labelledby="generated" className="mt-14">
          <h2 id="generated" className="font-display text-2xl font-semibold tracking-tight">
            Recently generated
          </h2>
          <p className="mt-1 text-muted">Written live by the agent. Not reviewed by a person yet.</p>
          <GuideTable guides={generated} />
        </section>
      )}

      <section id="how" aria-labelledby="how-title" className="mt-20 grid scroll-mt-6 gap-10 border-t border-line pt-12 lg:grid-cols-[1fr_1.4fr]">
        <div>
          <h2 id="how-title" className="font-display text-2xl font-semibold tracking-tight">
            How guides are made
          </h2>
          <p className="mt-3 leading-relaxed text-muted">
            Provider rules change often and a wrong guide can cost weeks, so every claim says how we know it.
          </p>
        </div>
        <div className="space-y-8">
          <ol className="space-y-4">
            {[
              ["Identify", "Confirm the app exists and offers OAuth to third-party developers."],
              ["Probe", "Fetch the provider's live OAuth metadata. This is the only thing a generated guide can call tested."],
              ["Research", "Search official developer docs and policy pages, keeping every source."],
              ["Audit", "Check that every cited link resolves, then downgrade claims the sources don't support."],
            ].map(([title, text], i) => (
              <li key={title} className="grid grid-cols-[1.75rem_1fr] gap-3">
                <span className="font-display text-lg font-semibold text-muted">{i + 1}</span>
                <p>
                  <span className="font-medium">{title}.</span> <span className="text-muted">{text}</span>
                </p>
              </li>
            ))}
          </ol>
          <EvidenceLegend />
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            {Object.values(DIFFICULTY).map((d) => (
              <div key={d.label} className="flex items-start gap-2">
                <dt className={`rounded px-1.5 py-0.5 font-medium ${d.badge}`}>{d.label}</dt>
                <dd className="pt-0.5 text-muted">{d.meaning}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>
    </main>
  );
}

function TimelineKey() {
  return (
    <div className="flex items-center gap-4 text-sm text-muted" aria-hidden>
      <span className="flex items-center gap-1.5">
        <span className="h-2 w-5 rounded-full bg-ink" /> Working in dev
      </span>
      <span className="flex items-center gap-1.5">
        <span className="flex h-2 w-5 overflow-hidden rounded-full">
          <span className="flex-1 bg-trivial" />
          <span className="flex-1 bg-moderate" />
          <span className="flex-1 bg-hard" />
          <span className="flex-1 bg-gated" />
        </span>
        Any user can connect, coloured by difficulty
      </span>
    </div>
  );
}

function GuideTable({ guides }: { guides: Guide[] }) {
  return (
    <div className="mt-5 overflow-hidden rounded-xl border border-line bg-surface">
      <table className="w-full text-left">
        <thead className="hidden border-b border-line text-sm text-muted md:table-header-group">
          <tr>
            <th className="px-5 py-3 font-medium">App</th>
            <th className="px-5 py-3 font-medium">Difficulty</th>
            <th className="px-5 py-3 font-medium">Working in dev</th>
            <th className="px-5 py-3 font-medium">Any user can connect</th>
            <th className="w-[22%] px-5 py-3 font-medium">
              <span className="sr-only">Timeline</span>
              <span aria-hidden className="flex justify-between text-xs font-normal">
                <span>5 min</span>
                <span>6 months</span>
              </span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {guides.map((g) => (
            <tr key={g.app.slug} className="group relative block hover:bg-paper md:table-row">
              <td className="block px-5 pt-4 md:table-cell md:py-4">
                <Link href={`/guides/${g.app.slug}`} className="font-medium after:absolute after:inset-0 group-hover:underline">
                  {g.app.name}
                </Link>
                <p className="text-sm text-muted">{g.app.category}</p>
              </td>
              <td className="block px-5 pt-2 md:table-cell md:py-4">
                <DifficultyBadge difficulty={g.verdict.difficulty} />
              </td>
              <td className="inline-block px-5 pt-2 text-sm md:table-cell md:py-4 md:text-base">
                <span className="text-muted md:hidden">Dev </span>
                {g.verdict.timeToDev.range}
              </td>
              <td className="inline-block pt-2 text-sm md:table-cell md:px-5 md:py-4 md:text-base">
                <span className="text-muted md:hidden">Production </span>
                <span className="font-medium">{g.verdict.timeToProd.range}</span>
              </td>
              <td className="block px-5 pt-3 pb-4 md:table-cell md:py-4">
                <TimelineCompact guide={g} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
