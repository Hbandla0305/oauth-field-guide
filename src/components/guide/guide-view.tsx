"use client";

import { useEffect, useMemo, useState } from "react";
import type { Guide } from "@/lib/guide-schema";
import { DIFFICULTY, DifficultyBadge } from "../difficulty";
import { EvidenceLegend, EvidenceTag, EVIDENCE, type SourceIndex } from "../evidence";
import { InfoTip } from "../info-tip";
import { TimelineBand, TimelineTicks } from "../timeline";
import { ShareBar } from "../share-bar";
import { ChatPanel } from "./chat-panel";

const TABS = [
  { id: "steps", label: "Steps" },
  { id: "permissions", label: "Permissions" },
  { id: "troubleshooting", label: "Troubleshooting" },
  { id: "before", label: "Before you start" },
  { id: "know", label: "Good to know" },
  { id: "sources", label: "Sources" },
] as const;
type TabId = (typeof TABS)[number]["id"];

const BANNER = {
  "human-verified": { cls: "bg-trivial-bg text-trivial", text: "Checked by a person" },
  "agent-researched": { cls: "bg-faint text-ink", text: "Agent-researched, not yet reviewed by a person" },
  "agent-generated": { cls: "bg-moderate-bg text-moderate", text: "Written live by an agent, not reviewed by a person" },
} as const;

const OWNER = {
  agent: { label: "Agent can do", short: "Agent", cls: "bg-faint text-ink" },
  human: { label: "You", short: "You", cls: "bg-ink text-surface" },
  wait: { label: "Waiting on provider", short: "Wait", cls: "border border-dashed border-muted text-muted" },
} as const;

export function GuideView({ guide, markdown }: { guide: Guide; markdown: string }) {
  const [tab, setTab] = useState<TabId>("steps");
  const [chatOpen, setChatOpen] = useState(false);
  const sources: SourceIndex = useMemo(() => new Map(guide.sources.map((s, i) => [s.id, { n: i + 1, title: s.title, url: s.url }])), [guide]);
  const v = guide.verdict;

  // Sections are linkable (/guides/slack#troubleshooting) so a teammate can be sent straight there.
  useEffect(() => {
    const fromHash = () => {
      const h = window.location.hash.slice(1);
      if (TABS.some((t) => t.id === h)) setTab(h as TabId);
    };
    fromHash();
    window.addEventListener("hashchange", fromHash);
    return () => window.removeEventListener("hashchange", fromHash);
  }, []);

  function select(id: TabId) {
    setTab(id);
    history.replaceState(null, "", `#${id}`);
  }

  const counts: Record<TabId, number> = {
    steps: guide.steps.length,
    permissions: guide.scopeTiers.length,
    troubleshooting: guide.blockers.length,
    before: guide.prerequisites.length,
    know: guide.nuances.length,
    sources: guide.sources.length,
  };

  return (
    <>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-3xl">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">{guide.app.name}</h1>
            <DifficultyBadge difficulty={v.difficulty} />
            <InfoTip label="What the difficulty rating means" align="start">
              <span className="block font-medium">{DIFFICULTY[v.difficulty].label}</span>
              {DIFFICULTY[v.difficulty].meaning}. Ratings use the same rubric for every app: trivial, moderate, hard or gated.
            </InfoTip>
          </div>
          <Summary text={v.summary} />
          <p className="mt-3 flex flex-wrap items-center gap-2 text-sm">
            <span className={`rounded px-2 py-0.5 ${BANNER[guide.verification.status].cls}`}>{BANNER[guide.verification.status].text}</span>
            <span className="text-muted">Last checked {guide.verification.lastChecked}</span>
            <InfoTip label="How this guide was checked" align="start">
              Every claim carries an evidence label. Hover a label to see what backs it. Open questions are listed under Sources.
            </InfoTip>
          </p>
        </div>
        <button type="button" onClick={() => setChatOpen(true)} className="rounded-lg bg-ink px-4 py-2.5 font-medium text-surface hover:bg-ink/90">
          Ask this guide
        </button>
      </header>

      <section aria-label="How long it takes" className="mt-6 rounded-xl border border-line bg-surface p-5 sm:p-6">
        <div className="grid gap-5 md:grid-cols-2 md:gap-8">
          <Estimate
            label="Working in dev"
            range={v.timeToDev.range}
            sub="Signing in with your own account"
            band={<TimelineBand min={v.timeToDev.hours.min} max={v.timeToDev.hours.max} className="bg-ink" />}
            tip={
              <>
                <span className="block font-medium">How we estimated this</span>
                Time to register an app and complete one sign-in with your own account. It covers console setup, not building your integration.
                <EstimateEvidence evidence={v.timeToDev.evidence} />
              </>
            }
          />
          <Estimate
            label="Any user can connect"
            range={v.timeToProd.range}
            sub={v.timeToProd.assumes}
            band={<TimelineBand min={v.timeToProd.hours.min} max={v.timeToProd.hours.max} className={DIFFICULTY[v.difficulty].bar} />}
            tip={
              <>
                <span className="block font-medium">How we estimated this</span>
                {v.timeToProd.assumes} Includes waiting on: {v.timeToProd.waitingOn}. Provider review times vary, so this is a range, not a promise.
                <EstimateEvidence evidence={v.timeToProd.evidence} />
              </>
            }
          />
        </div>
        <dl className="mt-5 grid gap-4 border-t border-line pt-4 text-sm sm:grid-cols-[1fr_1fr_auto] sm:items-start">
          <div>
            <dt className="text-muted">Waiting on</dt>
            <dd className="mt-0.5 line-clamp-2" title={v.timeToProd.waitingOn}>
              {v.timeToProd.waitingOn}
            </dd>
          </div>
          <div>
            <dt className="text-muted">Cost</dt>
            <dd className="mt-0.5 line-clamp-2" title={v.cost ?? undefined}>
              {v.cost ?? "None"}
            </dd>
          </div>
          <ShareBar markdown={markdown} filename={`${guide.app.slug}-oauth-guide.md`} />
        </dl>
      </section>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_17rem]">
        <div className="min-w-0">
          <div className="sticky top-0 z-30 -mx-4 border-b border-line bg-paper/95 px-4 backdrop-blur sm:mx-0 sm:px-0">
            <div role="tablist" aria-label="Guide sections" className="-mb-px flex gap-1 overflow-x-auto">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  role="tab"
                  id={`tab-${t.id}`}
                  aria-selected={tab === t.id}
                  aria-controls={`panel-${t.id}`}
                  onClick={() => select(t.id)}
                  className={`shrink-0 border-b-2 px-3 py-3 text-sm font-medium whitespace-nowrap ${tab === t.id ? "border-ink text-ink" : "border-transparent text-muted hover:text-ink"}`}
                >
                  {t.label} <span className="font-normal text-muted">{counts[t.id]}</span>
                </button>
              ))}
            </div>
          </div>

          <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} className="pt-6">
            {tab === "steps" && <StepsPanel guide={guide} sources={sources} />}
            {tab === "permissions" && <PermissionsPanel guide={guide} sources={sources} />}
            {tab === "troubleshooting" && <TroubleshootingPanel guide={guide} sources={sources} />}
            {tab === "before" && <BeforePanel guide={guide} sources={sources} />}
            {tab === "know" && <KnowPanel guide={guide} sources={sources} />}
            {tab === "sources" && <SourcesPanel guide={guide} />}
          </div>
        </div>

        <aside className="space-y-6 lg:sticky lg:top-4 lg:self-start">
          <div>
            <h2 className="text-sm font-medium text-muted">Official docs</h2>
            <ul className="mt-2 space-y-1">
              {guide.officialDocs.map((d) => (
                <li key={d.url}>
                  <a href={d.url} target="_blank" rel="noreferrer" title={d.url} className="group -mx-2 flex items-center justify-between gap-2 rounded-md px-2 py-1.5 hover:bg-surface">
                    <span className="font-medium group-hover:underline">{d.label}</span>
                    <svg viewBox="0 0 16 16" className="size-3.5 shrink-0 text-muted" aria-hidden>
                      <path d="M6 3h7v7M13 3L5 11" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <WhoDoesWhat guide={guide} />
        </aside>
      </div>

      <ChatPanel open={chatOpen} onClose={() => setChatOpen(false)} guide={guide} />
    </>
  );
}

function Summary({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const long = text.length > 240;
  return (
    <div className="mt-3">
      <p className={`text-lg leading-relaxed text-ink/85 ${long && !open ? "line-clamp-3" : ""}`}>{text}</p>
      {long && (
        <button type="button" onClick={() => setOpen(!open)} className="mt-1 text-sm font-medium underline underline-offset-2">
          {open ? "Show less" : "Read more"}
        </button>
      )}
    </div>
  );
}

function Estimate({ label, range, sub, band, tip }: { label: string; range: string; sub: string; band: React.ReactNode; tip: React.ReactNode }) {
  return (
    <div>
      <p className="flex items-center text-sm font-medium text-muted">
        {label}
        <InfoTip label={`How "${label}" is estimated`} align="start">
          {tip}
        </InfoTip>
      </p>
      <p className="mt-1 font-display text-3xl font-semibold tracking-tight">{range}</p>
      <p className="mt-1 line-clamp-2 text-sm text-muted" title={sub}>
        {sub}
      </p>
      <div className="relative mt-3 h-2.5 rounded-full bg-faint">{band}</div>
      <TimelineTicks />
    </div>
  );
}

function EstimateEvidence({ evidence }: { evidence: Guide["verdict"]["timeToDev"]["evidence"] }) {
  return (
    <span className="mt-2 block border-t border-surface/15 pt-2">
      Evidence: <span className="font-medium">{EVIDENCE[evidence.label].label}</span>
      {evidence.note && <span className="mt-1 block text-surface/80">{evidence.note}</span>}
    </span>
  );
}

function Chips<T extends string>({ value, options, onChange, label }: { value: T; options: { id: T; label: string; count?: number }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          aria-pressed={value === o.id}
          onClick={() => onChange(o.id)}
          className={`rounded-full border px-3 py-1 text-sm ${value === o.id ? "border-ink bg-ink text-surface" : "border-line bg-surface hover:border-ink"}`}
        >
          {o.label}
          {o.count !== undefined && <span className={value === o.id ? "text-surface/70" : "text-muted"}> {o.count}</span>}
        </button>
      ))}
    </div>
  );
}

function StepsPanel({ guide, sources }: { guide: Guide; sources: SourceIndex }) {
  const [owner, setOwner] = useState<"all" | "human" | "agent" | "wait">("all");
  const count = (o: string) => guide.steps.filter((s) => s.owner === o).length;
  return (
    <div>
      <Chips
        label="Filter steps"
        value={owner}
        onChange={setOwner}
        options={[
          { id: "all", label: "All steps", count: guide.steps.length },
          { id: "human", label: "Your steps", count: count("human") },
          { id: "agent", label: "Agent can do", count: count("agent") },
          { id: "wait", label: "Waits", count: count("wait") },
        ]}
      />
      <ol className="mt-4 divide-y divide-line rounded-xl border border-line bg-surface">
        {guide.steps.map((s, i) =>
          owner !== "all" && s.owner !== owner ? null : (
            <li key={i}>
              <details className="group">
                <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3.5 hover:bg-paper [&::-webkit-details-marker]:hidden">
                  <span className="w-6 shrink-0 font-display text-lg font-semibold text-muted">{i + 1}</span>
                  <span className="min-w-0 flex-1 font-medium">{s.title}</span>
                  {s.duration && <span className="hidden shrink-0 text-sm text-muted sm:inline">{s.duration}</span>}
                  <span className={`shrink-0 rounded px-1.5 py-0.5 text-xs font-medium ${OWNER[s.owner].cls}`}>{OWNER[s.owner].short}</span>
                  <Chevron />
                </summary>
                <div className="space-y-2 px-4 pb-4 pl-13">
                  <p className="leading-relaxed text-ink/85">{s.detail}</p>
                  {s.url && (
                    <a href={s.url} target="_blank" rel="noreferrer" className="block truncate text-sm text-cobalt underline underline-offset-2">
                      {s.url.replace(/^https:\/\//, "")}
                    </a>
                  )}
                  <p className="flex flex-wrap items-center gap-3 text-sm text-muted">
                    <span>{OWNER[s.owner].label}</span>
                    {s.duration && <span className="sm:hidden">{s.duration}</span>}
                    <EvidenceTag evidence={s.evidence} sources={sources} />
                  </p>
                </div>
              </details>
            </li>
          ),
        )}
      </ol>
    </div>
  );
}

function PermissionsPanel({ guide, sources }: { guide: Guide; sources: SourceIndex }) {
  return (
    <div>
      <p className="mb-4 text-muted">Ask for the lowest tier your agent needs. Higher tiers add review time.</p>
      <ul className="divide-y divide-line rounded-xl border border-line bg-surface">
        {guide.scopeTiers.map((t) => (
          <li key={t.tier} className="grid gap-2 p-4 sm:grid-cols-[1fr_auto] sm:gap-6">
            <div className="min-w-0">
              <p className="font-medium">{t.tier}</p>
              <div className="mt-1.5 flex flex-wrap gap-1">
                {t.examples.slice(0, 5).map((x) => (
                  <code key={x} className="rounded bg-faint px-1.5 py-0.5 text-xs" title={x}>
                    {x.replace(/^https:\/\/www\.googleapis\.com\/auth\//, "")}
                  </code>
                ))}
              </div>
              <p className="mt-2 text-sm leading-relaxed text-ink/80">{t.impact}</p>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm sm:flex-col sm:items-end">
              {t.reviewRequired ? <span className="font-medium text-hard">Review required</span> : <span className="font-medium text-trivial">No review</span>}
              <span className="text-muted">{t.time}</span>
              <EvidenceTag evidence={t.evidence} sources={sources} align="end" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function TroubleshootingPanel({ guide, sources }: { guide: Guide; sources: SourceIndex }) {
  const [query, setQuery] = useState("");
  const words = query.toLowerCase().split(/\W+/).filter((w) => w.length > 2);
  const matches = guide.blockers.filter((b) => !words.length || words.some((w) => `${b.symptom} ${b.cause} ${b.fix}`.toLowerCase().includes(w)));
  return (
    <div>
      <label htmlFor="blocker-q" className="sr-only">
        Paste an error message or describe the problem
      </label>
      <input
        id="blocker-q"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Paste an error message or describe the problem"
        className="h-11 w-full rounded-lg border border-line bg-surface px-4 placeholder:text-muted/70 focus:border-ink focus:outline-none"
      />
      {matches.length === 0 ? (
        <p className="mt-4 text-muted">No known blocker matches that. Try “Ask this guide”, or check the official docs.</p>
      ) : (
        <ul className="mt-4 divide-y divide-line rounded-xl border border-line bg-surface">
          {matches.map((b) => (
            <li key={b.symptom}>
              <details className="group" open={words.length > 0 && matches.length <= 2}>
                <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3.5 hover:bg-paper [&::-webkit-details-marker]:hidden">
                  <span className="min-w-0 flex-1 font-medium">{b.symptom}</span>
                  <Chevron />
                </summary>
                <div className="space-y-2 px-4 pb-4">
                  <p className="text-ink/85">
                    <span className="text-muted">Why: </span>
                    {b.cause}
                  </p>
                  <p className="text-ink/85">
                    <span className="font-medium text-trivial">Fix: </span>
                    {b.fix}
                  </p>
                  <EvidenceTag evidence={b.evidence} sources={sources} />
                </div>
              </details>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function BeforePanel({ guide, sources }: { guide: Guide; sources: SourceIndex }) {
  return (
    <ul className="divide-y divide-line rounded-xl border border-line bg-surface">
      {guide.prerequisites.map((p) => (
        <li key={p.item} className="flex gap-3 p-4">
          <span className="mt-1 size-4 shrink-0 rounded border border-muted/60" aria-hidden />
          <div className="min-w-0">
            <p className="font-medium">{p.item}</p>
            <p className="mt-0.5 text-sm text-ink/75">{p.why}</p>
            <div className="mt-1.5">
              <EvidenceTag evidence={p.evidence} sources={sources} />
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

function KnowPanel({ guide, sources }: { guide: Guide; sources: SourceIndex }) {
  const [all, setAll] = useState(false);
  const shown = all ? guide.nuances : guide.nuances.slice(0, 5);
  return (
    <div>
      <ul className="divide-y divide-line rounded-xl border border-line bg-surface">
        {shown.map((n) => (
          <li key={n.text} className="p-4">
            <p className="leading-relaxed text-ink/85">{n.text}</p>
            <div className="mt-1.5">
              <EvidenceTag evidence={n.evidence} sources={sources} />
            </div>
          </li>
        ))}
      </ul>
      {!all && guide.nuances.length > 5 && (
        <button type="button" onClick={() => setAll(true)} className="mt-3 text-sm font-medium underline underline-offset-2">
          Show {guide.nuances.length - 5} more
        </button>
      )}
    </div>
  );
}

function SourcesPanel({ guide }: { guide: Guide }) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-line bg-surface p-5">
          <h3 className="font-medium">What was tested</h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink/85">
            {guide.verification.tested.length ? guide.verification.tested.map((x) => <li key={x}>{x}</li>) : <li>No live checks recorded.</li>}
          </ul>
        </div>
        <div className="rounded-xl border border-moderate/30 bg-moderate-bg/50 p-5">
          <h3 className="font-medium">Still uncertain</h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink/85">
            {guide.verification.openQuestions.length ? guide.verification.openQuestions.map((x) => <li key={x}>{x}</li>) : <li>Nothing outstanding.</li>}
          </ul>
        </div>
      </div>
      <EvidenceLegend />
      <ol className="space-y-2 text-sm">
        {guide.sources.map((s, i) => (
          <li key={s.id} id={`source-${s.id}`} className="grid grid-cols-[2rem_1fr]">
            <span className="text-muted">[{i + 1}]</span>
            <a href={s.url} target="_blank" rel="noreferrer" className="break-words text-cobalt underline decoration-cobalt/30 underline-offset-2 hover:decoration-cobalt">
              {s.title}
            </a>
          </li>
        ))}
      </ol>
    </div>
  );
}

function WhoDoesWhat({ guide }: { guide: Guide }) {
  const n = (o: string) => guide.steps.filter((s) => s.owner === o).length;
  return (
    <div>
      <h2 className="flex items-center text-sm font-medium text-muted">
        Who does what
        <InfoTip label="What an agent can do here" align="end">
          <span className="block font-medium">An agent can</span>
          <span className="mt-1 block space-y-0.5">
            {guide.agentCanDo.map((x) => (
              <span key={x} className="block">
                – {x}
              </span>
            ))}
          </span>
          <span className="mt-2 block font-medium">You need to</span>
          <span className="mt-1 block space-y-0.5">
            {guide.humanMustDo.map((x) => (
              <span key={x} className="block">
                – {x}
              </span>
            ))}
          </span>
        </InfoTip>
      </h2>
      <dl className="mt-2 grid grid-cols-3 gap-2 text-center">
        {(["agent", "human", "wait"] as const).map((o) => (
          <div key={o} className="rounded-lg border border-line bg-surface px-2 py-2.5">
            <dd className="font-display text-xl font-semibold">{n(o)}</dd>
            <dt className="text-xs text-muted">{OWNER[o].label}</dt>
          </div>
        ))}
      </dl>
    </div>
  );
}

function Chevron() {
  return (
    <svg viewBox="0 0 20 20" className="size-4 shrink-0 text-muted transition-transform group-open:rotate-180" aria-hidden>
      <path d="M5 7.5l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
