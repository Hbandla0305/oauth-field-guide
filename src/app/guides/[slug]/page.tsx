import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { findGuide, CURATED } from "@/lib/guides";
import { guideToMarkdown } from "@/lib/markdown";
import { DifficultyBadge } from "@/components/difficulty";
import { EvidenceTag } from "@/components/evidence";
import { TimelineLarge } from "@/components/timeline";
import { ShareBar } from "@/components/share-bar";

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = true;
export const revalidate = 3600;

export function generateStaticParams() {
  return CURATED.map((g) => ({ slug: g.app.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const guide = await findGuide((await params).slug);
  if (!guide) return { title: "Guide not found" };
  return {
    title: `${guide.app.name} OAuth setup`,
    description: `${guide.verdict.summary} Working in dev: ${guide.verdict.timeToDev.range}. Any user can connect: ${guide.verdict.timeToProd.range}.`,
  };
}

const SECTIONS = [
  ["before", "What you need first"],
  ["permissions", "Permission tiers"],
  ["steps", "Steps"],
  ["who", "Who does what"],
  ["stuck", "If you get stuck"],
  ["know", "Good to know"],
  ["evidence", "Evidence and sources"],
] as const;

const OWNER = {
  agent: { label: "Agent can do", cls: "bg-faint text-ink" },
  human: { label: "You", cls: "bg-ink text-surface" },
  wait: { label: "Waiting on provider", cls: "border border-dashed border-muted text-muted" },
} as const;

export default async function GuidePage({ params }: Props) {
  const guide = await findGuide((await params).slug);
  if (!guide) notFound();

  const host = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  const url = `${host ? `https://${host}` : ""}/guides/${guide.app.slug}`;
  const idx = new Map(guide.sources.map((s, i) => [s.id, i + 1]));
  const v = guide.verdict;
  const verified = guide.verification.status === "human-verified";

  return (
    <main className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
      <div className="py-6">
        <Link href="/" className="text-sm text-muted hover:text-ink">
          ← All guides
        </Link>
      </div>

      <header className="max-w-3xl">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">{guide.app.name}</h1>
          <DifficultyBadge difficulty={v.difficulty} />
        </div>
        <p className="mt-4 text-lg leading-relaxed text-ink/90">{v.summary}</p>
        <p className={`mt-4 rounded-md px-3 py-2 text-sm ${verified ? "bg-trivial-bg text-trivial" : "bg-moderate-bg text-moderate"}`}>
          {verified
            ? `Researched by agents and checked by a person on ${guide.verification.lastChecked}.`
            : `Generated live by an agent on ${guide.verification.lastChecked} and not reviewed by a person. Check the evidence labels before relying on it.`}
        </p>
      </header>

      <section className="mt-8" aria-label="How long it takes">
        <TimelineLarge guide={guide} />
        <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted">Waiting on</dt>
            <dd className="mt-0.5">{v.timeToProd.waitingOn}</dd>
          </div>
          <div>
            <dt className="text-muted">Cost</dt>
            <dd className="mt-0.5">{v.cost ?? "None"}</dd>
          </div>
        </dl>
        <details className="group mt-4 text-sm">
          <summary className="cursor-pointer text-muted hover:text-ink">How we estimated these times</summary>
          <div className="mt-3 space-y-3 border-l-2 border-line pl-4">
            <div>
              <p className="font-medium">Working in dev</p>
              <EvidenceTag evidence={v.timeToDev.evidence} sourceIndex={idx} showNote />
            </div>
            <div>
              <p className="font-medium">Any user can connect</p>
              <EvidenceTag evidence={v.timeToProd.evidence} sourceIndex={idx} showNote />
            </div>
          </div>
        </details>
        <div className="mt-6">
          <ShareBar markdown={guideToMarkdown(guide, url)} filename={`${guide.app.slug}-oauth-guide.md`} />
        </div>
      </section>

      <div className="mt-12 grid gap-12 lg:grid-cols-[1fr_14rem]">
        <article className="min-w-0 max-w-3xl space-y-14">
          <Section id="before" title="What you need first">
            <ul className="divide-y divide-line rounded-xl border border-line bg-surface">
              {guide.prerequisites.map((p) => (
                <li key={p.item} className="p-4">
                  <p className="font-medium">{p.item}</p>
                  <p className="mt-1 text-muted">{p.why}</p>
                  <EvidenceTag evidence={p.evidence} sourceIndex={idx} />
                </li>
              ))}
            </ul>
            <p className="mt-3 text-sm text-muted">
              Register apps at{" "}
              <a href={guide.app.developerPortal} className="text-cobalt underline underline-offset-2" target="_blank" rel="noreferrer">
                {guide.app.developerPortal.replace(/^https:\/\//, "")}
              </a>
            </p>
          </Section>

          <Section id="permissions" title="Permission tiers" intro="Which permissions you ask for decides how much review you face. Ask for the lowest tier your agent needs.">
            <ul className="divide-y divide-line rounded-xl border border-line bg-surface">
              {guide.scopeTiers.map((t) => (
                <li key={t.tier} className="p-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    <p className="font-medium">{t.tier}</p>
                    <p className="text-sm">
                      {t.reviewRequired ? <span className="font-medium text-hard">Review required</span> : <span className="text-trivial">No review</span>}
                      <span className="text-muted">, {t.time}</span>
                    </p>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {t.examples.slice(0, 5).map((x) => (
                      <code key={x} className="rounded bg-faint px-1.5 py-0.5 text-xs" title={x}>
                        {x.replace(/^https:\/\/www\.googleapis\.com\/auth\//, "")}
                      </code>
                    ))}
                  </div>
                  <p className="mt-2 leading-relaxed text-ink/85">{t.impact}</p>
                  <EvidenceTag evidence={t.evidence} sourceIndex={idx} />
                </li>
              ))}
            </ul>
          </Section>

          <Section id="steps" title="Steps">
            <ol className="space-y-3">
              {guide.steps.map((s, i) => (
                <li key={s.title} className="grid grid-cols-[2rem_1fr] gap-3 rounded-xl border border-line bg-surface p-4">
                  <span className="font-display text-xl font-semibold text-muted">{i + 1}</span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-medium">{s.title}</h3>
                      <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${OWNER[s.owner].cls}`}>{OWNER[s.owner].label}</span>
                      {s.duration && <span className="text-xs text-muted">{s.duration}</span>}
                    </div>
                    <p className="mt-1.5 leading-relaxed text-ink/85">{s.detail}</p>
                    {s.url && (
                      <a href={s.url} target="_blank" rel="noreferrer" className="mt-1 block truncate text-sm text-cobalt underline underline-offset-2">
                        {s.url.replace(/^https:\/\//, "")}
                      </a>
                    )}
                    <EvidenceTag evidence={s.evidence} sourceIndex={idx} />
                  </div>
                </li>
              ))}
            </ol>
          </Section>

          <Section id="who" title="Who does what">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-line bg-surface p-5">
                <h3 className="font-medium">An agent can</h3>
                <ul className="mt-3 list-disc space-y-1.5 pl-5 text-ink/85">
                  {guide.agentCanDo.map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                </ul>
              </div>
              <div className="rounded-xl bg-ink p-5 text-surface">
                <h3 className="font-medium">You need to</h3>
                <ul className="mt-3 list-disc space-y-1.5 pl-5 text-surface/85">
                  {guide.humanMustDo.map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                </ul>
              </div>
            </div>
          </Section>

          <Section id="stuck" title="If you get stuck">
            <dl className="space-y-3">
              {guide.blockers.map((b) => (
                <div key={b.symptom} className="rounded-xl border border-line bg-surface p-4">
                  <dt className="font-medium">{b.symptom}</dt>
                  <dd className="mt-1.5 space-y-1.5 text-ink/85">
                    <p>
                      <span className="text-muted">Why: </span>
                      {b.cause}
                    </p>
                    <p>
                      <span className="text-muted">Fix: </span>
                      {b.fix}
                    </p>
                    <EvidenceTag evidence={b.evidence} sourceIndex={idx} />
                  </dd>
                </div>
              ))}
            </dl>
          </Section>

          <Section id="know" title="Good to know">
            <ul className="space-y-3">
              {guide.nuances.map((n) => (
                <li key={n.text} className="border-l-2 border-line pl-4">
                  <p className="leading-relaxed text-ink/85">{n.text}</p>
                  <EvidenceTag evidence={n.evidence} sourceIndex={idx} />
                </li>
              ))}
            </ul>
          </Section>

          <Section id="evidence" title="Evidence and sources">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-line bg-surface p-5">
                <h3 className="font-medium">What we tested</h3>
                <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-ink/85">
                  {guide.verification.tested.map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                </ul>
              </div>
              <div className="rounded-xl border border-moderate/30 bg-moderate-bg/50 p-5">
                <h3 className="font-medium">Still uncertain</h3>
                <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-ink/85">
                  {guide.verification.openQuestions.length ? guide.verification.openQuestions.map((x) => <li key={x}>{x}</li>) : <li>Nothing outstanding.</li>}
                </ul>
              </div>
            </div>
            <ol className="mt-6 space-y-2 text-sm">
              {guide.sources.map((s, i) => (
                <li key={s.id} id={`source-${s.id}`} className="grid scroll-mt-6 grid-cols-[2rem_1fr] target:bg-moderate-bg">
                  <span className="text-muted">[{i + 1}]</span>
                  <a href={s.url} target="_blank" rel="noreferrer" className="break-words text-cobalt underline decoration-cobalt/30 underline-offset-2 hover:decoration-cobalt">
                    {s.title}
                  </a>
                </li>
              ))}
            </ol>
          </Section>
        </article>

        <nav aria-label="On this page" className="hidden lg:block">
          <div className="sticky top-6 space-y-1 border-l border-line pl-4 text-sm">
            {SECTIONS.map(([id, label]) => (
              <a key={id} href={`#${id}`} className="block py-1 text-muted hover:text-ink">
                {label}
              </a>
            ))}
          </div>
        </nav>
      </div>
    </main>
  );
}

function Section({ id, title, intro, children }: { id: string; title: string; intro?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-6">
      <h2 className="font-display text-2xl font-semibold tracking-tight">{title}</h2>
      {intro && <p className="mt-1 text-muted">{intro}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}
