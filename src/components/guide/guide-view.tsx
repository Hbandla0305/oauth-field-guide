"use client";

import { useEffect, useMemo, useState } from "react";
import type { Guide } from "@/lib/guide-schema";
import { DIFFICULTY, DifficultyBadge } from "../difficulty";
import { EvidenceLegend, EvidenceTag, EVIDENCE, type SourceIndex } from "../evidence";
import { InfoTip } from "../info-tip";
import { TimelineBand, TimelineTicks } from "../timeline";
import { ShareBar } from "../share-bar";
import { ChatPanel } from "./chat-panel";
import { CopyPrompt, buildPrompt } from "./copy-prompt";

const TABS = [
  { id: "intro", label: "Intro" },
  { id: "steps", label: "Steps involved" },
  { id: "permissions", label: "Permissions" },
  { id: "know", label: "Good to know" },
  { id: "troubleshoot", label: "Troubleshoot" },
  { id: "resources", label: "Resources" },
] as const;
type TabId = (typeof TABS)[number]["id"];

const BANNER = {
  "human-verified": { cls: "bg-trivial-bg text-trivial", text: "Checked by a person" },
  "agent-researched": { cls: "bg-faint text-ink", text: "Agent-researched, not yet reviewed by a person" },
  "agent-generated": { cls: "bg-moderate-bg text-moderate", text: "Written live by an agent, not reviewed by a person" },
} as const;

// "AI can do" means an AI coding assistant can do the step for you; not the agent you're building.
export const OWNER = {
  agent: {
    label: "AI can do",
    cls: "bg-trivial-bg text-trivial",
    hint: "An AI assistant (ChatGPT, Claude, Copilot) can do this for you: drafting a privacy policy or scope justification, generating config, or checking endpoints. Use Copy prompt to get a ready-made prompt.",
  },
  human: { label: "You", cls: "bg-ink text-surface", hint: "Needs you: signing in, clicking through a console, a decision, verification or payment." },
  wait: { label: "Provider review", cls: "border border-dashed border-muted text-muted", hint: "Nothing to do but wait for the provider." },
} as const;

export function GuideView({ guide, markdown }: { guide: Guide; markdown: string }) {
  const [tab, setTab] = useState<TabId>("intro");
  const [chatOpen, setChatOpen] = useState(false);
  const sources: SourceIndex = useMemo(() => new Map(guide.sources.map((s, i) => [s.id, { n: i + 1, title: s.title, url: s.url }])), [guide]);
  const v = guide.verdict;

  // Sections are linkable (/guides/slack#troubleshoot) so a teammate can be sent straight there.
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

  const counts: Partial<Record<TabId, number>> = {
    steps: guide.steps.length,
    permissions: guide.scopeTiers.length,
    know: guide.nuances.length,
    troubleshoot: guide.blockers.length,
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
              {DIFFICULTY[v.difficulty].meaning}. Every app is rated on the same scale: trivial, moderate, hard or gated.
            </InfoTip>
          </div>
          <Summary text={v.summary} />
          <p className="mt-3 flex flex-wrap items-center gap-2 text-sm">
            <span className={`rounded px-2 py-0.5 ${BANNER[guide.verification.status].cls}`}>{BANNER[guide.verification.status].text}</span>
            <span className="text-muted">Last checked {guide.verification.lastChecked}</span>
            <InfoTip label="How this guide was checked" align="start">
              Every claim carries an evidence label. Hover a label to see what backs it. Open questions are listed under Resources.
            </InfoTip>
          </p>
        </div>
        <button type="button" onClick={() => setChatOpen(true)} className="rounded-lg bg-ink px-4 py-2.5 font-medium text-surface hover:bg-ink/90">
          Chat about this guide
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
            <dd className="mt-0.5">
              {v.timeToProd.waitingOn}
            </dd>
          </div>
          <div>
            <dt className="text-muted">Cost</dt>
            <dd className="mt-0.5">
              {v.cost ?? "None"}
            </dd>
          </div>
          <ShareBar markdown={markdown} filename={`${guide.app.slug}-oauth-guide.md`} />
        </dl>
      </section>

      <div className="mt-8">
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
                {t.label}
                {counts[t.id] !== undefined && <span className="font-normal text-muted"> {counts[t.id]}</span>}
              </button>
            ))}
          </div>
        </div>

        <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} className="max-w-4xl pt-6">
          {tab === "intro" && <IntroPanel guide={guide} sources={sources} />}
          {tab === "steps" && <StepsPanel guide={guide} onStart={() => document.getElementById("checklist")?.scrollIntoView({ behavior: "smooth" })} />}
          {tab === "permissions" && <PermissionsPanel guide={guide} sources={sources} />}
          {tab === "know" && <KnowPanel guide={guide} sources={sources} />}
          {tab === "troubleshoot" && <TroubleshootPanel guide={guide} sources={sources} />}
          {tab === "resources" && <ResourcesPanel guide={guide} />}
        </div>
      </div>

      <Checklist guide={guide} sources={sources} />

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
      <p className="mt-1 text-sm text-muted">
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

function OwnerTag({ owner }: { owner: keyof typeof OWNER }) {
  return (
    <span className={`shrink-0 rounded px-1.5 py-0.5 text-xs font-medium whitespace-nowrap ${OWNER[owner].cls}`} title={OWNER[owner].hint}>
      {OWNER[owner].label}
    </span>
  );
}

function PanelTitle({ children, tip }: { children: React.ReactNode; tip?: React.ReactNode }) {
  return (
    <h2 className="flex items-center font-display text-xl font-semibold tracking-tight">
      {children}
      {tip && (
        <InfoTip label="More about this section" align="start">
          {tip}
        </InfoTip>
      )}
    </h2>
  );
}

function IntroPanel({ guide, sources }: { guide: Guide; sources: SourceIndex }) {
  const waits = guide.steps.filter((s) => s.owner === "wait");
  return (
    <div className="space-y-10">
      <section>
        <PanelTitle tip="Have these ready before you open the provider's console. Missing ones are the usual cause of rejected reviews.">What you need first</PanelTitle>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {guide.prerequisites.map((p) => (
            <li key={p.item} className="rounded-xl border border-line bg-surface p-4">
              <p className="font-medium">{p.item}</p>
              <p className="mt-1 text-sm text-ink/75">{p.why}</p>
              <div className="mt-2">
                <EvidenceTag evidence={p.evidence} sources={sources} />
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <PanelTitle
          tip={
            <>
              <span className="block font-medium">AI can do</span>
              {OWNER.agent.hint}
              <span className="mt-2 block font-medium">You</span>
              {OWNER.human.hint}
              <span className="mt-2 block font-medium">Provider review</span>
              {OWNER.wait.hint}
            </>
          }
        >
          Who does what
        </PanelTitle>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <OwnerColumn owner="agent" items={guide.agentCanDo} guide={guide} />
          <OwnerColumn owner="human" items={guide.humanMustDo} />
          <OwnerColumn owner="wait" items={waits.length ? waits.map((s) => s.title) : ["Nothing. There's no provider review."]} />
        </div>
      </section>
    </div>
  );
}

function OwnerColumn({ owner, items, guide }: { owner: keyof typeof OWNER; items: string[]; guide?: Guide }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-4">
      <OwnerTag owner={owner} />
      <p className="mt-2 text-xs text-muted">{OWNER[owner].hint}</p>
      <ul className="mt-3 space-y-1.5 text-sm">
        {items.map((x) => (
          <li key={x} className="flex gap-2">
            <span className="mt-2 size-1 shrink-0 rounded-full bg-muted" aria-hidden />
            <span className="min-w-0 flex-1">
              {x}
              {owner === "agent" && guide && (
                <span className="ml-2 inline-block align-middle">
                  <CopyPrompt compact prompt={buildPrompt(guide, x)} />
                </span>
              )}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Overview of the path; the interactive walkthrough lives in the checklist below the tabs.
function StepsPanel({ guide, onStart }: { guide: Guide; onStart: () => void }) {
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PanelTitle tip="The whole path at a glance. Use the step-by-step checklist below to work through it and track your progress.">Steps involved</PanelTitle>
        <button type="button" onClick={onStart} className="rounded-lg border border-ink px-3 py-1.5 text-sm font-medium hover:bg-ink hover:text-surface">
          Open the checklist
        </button>
      </div>
      <ol className="relative mt-5 space-y-0 border-l border-line pl-6">
        {guide.steps.map((s, i) => (
          <li key={i} className="relative pb-4 last:pb-0">
            <span
              className={`absolute top-0.5 -left-[2.0625rem] flex size-5 items-center justify-center rounded-full text-[11px] font-semibold ${s.owner === "wait" ? "border border-dashed border-muted bg-paper text-muted" : "bg-ink text-surface"}`}
              aria-hidden
            >
              {i + 1}
            </span>
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="font-medium">{s.title}</span>
              <OwnerTag owner={s.owner} />
              {s.owner === "agent" && <CopyPrompt compact prompt={buildPrompt(guide, s.title, s.detail, s.url)} />}
              {s.duration && <span className="text-sm text-muted">{s.duration}</span>}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

function PermissionsPanel({ guide, sources }: { guide: Guide; sources: SourceIndex }) {
  return (
    <div>
      <PanelTitle tip="Providers review apps based on the permissions (scopes) they request. Asking for less usually means less review.">Permissions</PanelTitle>
      <p className="mt-1 text-muted">Ask for the lowest tier your agent needs. Higher tiers add review time.</p>
      <ul className="mt-4 divide-y divide-line rounded-xl border border-line bg-surface">
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

// Good-to-know items grouped by what they affect, so a developer can jump to the topic they care about.
const TOPICS = [
  { id: "tokens", label: "Tokens & sessions", test: /token|refresh|expir|session|re-?auth|consent/i },
  { id: "limits", label: "Limits & quotas", test: /rate limit|quota|per (minute|second|hour|day)|requests?\/|throttl|\bcap\b|capped|limit/i },
  { id: "policy", label: "Data & AI policy", test: /\bAI\b|LLM|machine learning|\bML\b|train|policy|terms|privacy|store|retention|gdpr|compliance/i },
  { id: "admins", label: "Installs & admins", test: /admin|workspace|tenant|organi[sz]ation|\borg\b|install|team|account owner/i },
  { id: "pricing", label: "Pricing & plans", test: /\$|price|pricing|paid|plan|tier|subscription|fee|premium|enterprise/i },
] as const;

function topicOf(text: string): string {
  return TOPICS.find((t) => t.test.test(text))?.id ?? "other";
}

function KnowPanel({ guide, sources }: { guide: Guide; sources: SourceIndex }) {
  const groups = [...TOPICS, { id: "other", label: "Other" }]
    .map((t) => ({ ...t, items: guide.nuances.filter((n) => topicOf(n.text) === t.id) }))
    .filter((g) => g.items.length);
  return (
    <div>
      <PanelTitle tip="Things that don't block setup but tend to surprise developers later.">Good to know</PanelTitle>
      <div className="mt-4 space-y-6">
        {groups.map((g) => (
          <section key={g.id}>
            <h3 className="text-sm font-medium text-muted">{g.label}</h3>
            <ul className="mt-2 space-y-2">
              {g.items.map((n) => (
                <li key={n.text} className="flex gap-3 rounded-lg bg-surface px-4 py-3 shadow-[inset_3px_0_0_var(--color-line)]">
                  <div className="min-w-0 flex-1">
                    <p className="text-[0.9375rem] leading-relaxed text-ink/85">{n.text}</p>
                  </div>
                  <div className="shrink-0 pt-0.5">
                    <EvidenceTag evidence={n.evidence} sources={sources} align="end" />
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}

function TroubleshootPanel({ guide, sources }: { guide: Guide; sources: SourceIndex }) {
  const [query, setQuery] = useState("");
  const words = query.toLowerCase().split(/\W+/).filter((w) => w.length > 2);
  const matches = guide.blockers.filter((b) => !words.length || words.some((w) => `${b.symptom} ${b.cause} ${b.fix}`.toLowerCase().includes(w)));
  return (
    <div>
      <PanelTitle tip="Known problems developers hit with this provider, each with the cause and the fix.">Troubleshoot</PanelTitle>
      <label htmlFor="blocker-q" className="sr-only">
        Paste an error message or describe the problem
      </label>
      <input
        id="blocker-q"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Paste an error message or describe the problem"
        className="mt-4 h-11 w-full rounded-lg border border-line bg-surface px-4 placeholder:text-muted/70 focus:border-ink focus:outline-none"
      />
      {matches.length === 0 ? (
        <p className="mt-4 text-muted">No known problem matches that. Try “Chat about this guide”, or check the official docs under Resources.</p>
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

function ResourcesPanel({ guide }: { guide: Guide }) {
  return (
    <div className="space-y-10">
      <section>
        <PanelTitle>Official docs</PanelTitle>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {guide.officialDocs.map((d) => (
            <li key={d.url}>
              <a href={d.url} target="_blank" rel="noreferrer" title={d.url} className="flex h-full items-center justify-between gap-3 rounded-lg border border-line bg-surface px-4 py-3 hover:border-ink">
                <span className="font-medium">{d.label}</span>
                <svg viewBox="0 0 16 16" className="size-3.5 shrink-0 text-muted" aria-hidden>
                  <path d="M6 3h7v7M13 3L5 11" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </a>
            </li>
          ))}
        </ul>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
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
      </section>

      <section>
        <PanelTitle tip="Every claim in this guide cites one or more of these. Numbers match the citations in the chat.">Sources</PanelTitle>
        <div className="mt-3">
          <EvidenceLegend />
        </div>
        <ol className="mt-4 space-y-2 text-sm">
          {guide.sources.map((s, i) => (
            <li key={s.id} id={`source-${s.id}`} className="grid grid-cols-[2rem_1fr]">
              <span className="text-muted">[{i + 1}]</span>
              <a href={s.url} target="_blank" rel="noreferrer" className="break-words text-cobalt underline decoration-cobalt/30 underline-offset-2 hover:decoration-cobalt">
                {s.title}
              </a>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

// Interactive walkthrough. Progress is a per-browser convenience, so localStorage is enough.
function Checklist({ guide, sources }: { guide: Guide; sources: SourceIndex }) {
  const key = `checklist:${guide.app.slug}`;
  const [done, setDone] = useState<number[]>([]);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(key) ?? "[]");
      if (Array.isArray(saved)) setDone(saved.filter((n) => Number.isInteger(n)));
    } catch {
      // storage unavailable (private mode): start empty
    }
  }, [key]);

  function toggle(i: number) {
    const next = done.includes(i) ? done.filter((n) => n !== i) : [...done, i];
    setDone(next);
    try {
      localStorage.setItem(key, JSON.stringify(next));
    } catch {
      // ignore
    }
  }

  const total = guide.steps.length;
  const pct = Math.round((done.length / total) * 100);

  return (
    <section id="checklist" className="mt-12 max-w-4xl scroll-mt-16">
      <details className="group rounded-xl border border-line bg-surface">
        <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-4 gap-y-2 px-5 py-4 [&::-webkit-details-marker]:hidden">
          <span className="font-display text-xl font-semibold tracking-tight">Step-by-step checklist</span>
          <span className="text-sm text-muted">
            {done.length} of {total} done
          </span>
          <span className="relative h-1.5 w-32 rounded-full bg-faint" aria-hidden>
            <span className="absolute inset-y-0 left-0 rounded-full bg-trivial" style={{ width: `${pct}%` }} />
          </span>
          <span className="ml-auto flex items-center gap-2 text-sm text-muted">
            <span className="group-open:hidden">Open</span>
            <span className="hidden group-open:inline">Close</span>
            <Chevron />
          </span>
        </summary>
        <ol className="divide-y divide-line border-t border-line">
          {guide.steps.map((s, i) => {
            const checked = done.includes(i);
            return (
              <li key={i} className="flex gap-3 px-5 py-3">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(i)}
                  aria-label={`Mark step ${i + 1} done: ${s.title}`}
                  className="mt-1 size-4 shrink-0 accent-trivial"
                />
                <details className="group/step min-w-0 flex-1">
                  <summary className="flex cursor-pointer list-none items-start gap-3 [&::-webkit-details-marker]:hidden">
                    <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1">
                      <span className={`font-medium ${checked ? "text-muted line-through" : ""}`}>
                        {i + 1}. {s.title}
                      </span>
                      <OwnerTag owner={s.owner} />
                      {s.owner === "agent" && <CopyPrompt compact prompt={buildPrompt(guide, s.title, s.detail, s.url)} />}
                      {s.duration && <span className="text-sm text-muted">{s.duration}</span>}
                    </span>
                    <svg viewBox="0 0 20 20" className="mt-1 size-4 shrink-0 text-muted transition-transform group-open/step:rotate-180" aria-hidden>
                      <path d="M5 7.5l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </summary>
                  <div className="mt-2 space-y-2 pb-1">
                    <p className="leading-relaxed text-ink/85">{s.detail}</p>
                    {s.url && (
                      <a href={s.url} target="_blank" rel="noreferrer" className="block truncate text-sm text-cobalt underline underline-offset-2">
                        {s.url.replace(/^https:\/\//, "")}
                      </a>
                    )}
                    <EvidenceTag evidence={s.evidence} sources={sources} />
                  </div>
                </details>
              </li>
            );
          })}
        </ol>
      </details>
    </section>
  );
}

function Chevron() {
  return (
    <svg viewBox="0 0 20 20" className="size-4 shrink-0 text-muted transition-transform group-open:rotate-180" aria-hidden>
      <path d="M5 7.5l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
