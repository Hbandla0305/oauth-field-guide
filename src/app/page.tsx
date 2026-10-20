import { LIBRARY, recentGenerated, summarise } from "@/lib/guides";
import { DIFFICULTY } from "@/components/difficulty";
import { EvidenceLegend } from "@/components/evidence";
import { GuideSearch } from "@/components/guide-search";
import { Typewriter } from "@/components/typewriter";
import { HowItWorks } from "@/components/how-it-works";
import { PageTour } from "@/components/page-tour";
import { TOURS } from "@/lib/tours";

export const revalidate = 60;

export default async function Home() {
  const guides = [...LIBRARY, ...(await recentGenerated())].map(summarise);
  const checked = LIBRARY.filter((g) => g.verification.status === "human-verified").length;

  return (
    <main className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
      <PageTour id="home" steps={TOURS.home} />
      <section className="pt-12 pb-8 sm:pt-16">
        <h1 className="max-w-3xl font-display text-4xl leading-[1.05] font-semibold tracking-tight text-balance sm:text-5xl">
          <Typewriter text="How long until your users can connect?" />
        </h1>
        <div className="mt-6 grid max-w-5xl gap-6 text-[1.0625rem] leading-relaxed md:grid-cols-2 md:gap-10">
          <div>
            <h2 className="font-medium">The problem</h2>
            <p className="mt-1 text-muted">
              Before your agent can act in someone&rsquo;s Gmail, Slack or CRM, you need your own OAuth app with that provider. Some take minutes. Others hold real users back
              behind weeks of review, security audits or partner programs, and you usually find out after you&rsquo;ve built the integration.
            </p>
          </div>
          <div>
            <h2 className="font-medium">What this gives you</h2>
            <p className="mt-1 text-muted">
              A guide for each app: how hard it is, how long until it works in dev and until anyone can connect, which permissions trigger review, the steps (and which an
              agent can do for you), what blocks people, and links to the provider&rsquo;s own docs. Every claim shows its evidence.
            </p>
          </div>
        </div>
      </section>

      <section aria-label="Find a guide">
        <GuideSearch guides={guides} />
      </section>

      <HowItWorks />

      <section id="how" aria-labelledby="how-title" className="mt-20 grid scroll-mt-6 gap-10 border-t border-line pt-12 lg:grid-cols-[1fr_1.4fr]">
        <div>
          <h2 id="how-title" className="font-display text-2xl font-semibold tracking-tight">
            How guides are made
          </h2>
          <p className="mt-3 leading-relaxed text-muted">
            Provider rules change often, and a wrong guide can cost weeks. So every guide says who checked it, and every claim says how we know it.
          </p>
          <dl className="mt-6 space-y-3 text-sm">
            {checked > 0 && (
              <div>
              <dt className="font-medium text-trivial">Checked ({checked})</dt>
              <dd className="text-muted">Researched by agents, fact-checked by a second agent, then reviewed and tried by a person.</dd>
            </div>
            )}
            <div>
              <dt className="font-medium">Agent-researched ({LIBRARY.length - checked})</dt>
              <dd className="text-muted">Researched by agents from official docs with cited sources and checked links. Not yet reviewed by a person.</dd>
            </div>
            <div>
              <dt className="font-medium text-moderate">Live agent</dt>
              <dd className="text-muted">Written on request for apps not in the library, in about two minutes.</dd>
            </div>
          </dl>
        </div>
        <div className="space-y-8">
          <ol className="space-y-4">
            {[
              ["Identify", "Confirm the app exists and offers OAuth to third-party developers."],
              ["Probe", "Fetch the provider's live OAuth metadata. Only live probes and attempts can make a claim \"tested\"."],
              ["Read", "Find and read the provider's official developer docs and policy pages, keeping every source."],
              ["Try", "Attempt the first setup steps logged out: the sign-in URL with a test app, the token endpoint, the developer console."],
              ["Dig deeper", "Look at what's still unclear and decide whether a couple more targeted searches would settle it."],
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
