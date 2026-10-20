"use client";

import Link from "next/link";
import { useState } from "react";
import { Typewriter } from "./typewriter";

// Three ways to use the guides, each with a tiny animated demo. Switching tabs replays the demo.
const TABS = [
  {
    id: "web",
    label: "On the web",
    steps: ["Search any app", "Read the verdict and the steps", "Let the AI draft the paperwork"],
    link: { href: "/use#web", text: "How the website works" },
  },
  {
    id: "ai",
    label: "In AI assistants",
    steps: ["Add one URL to your AI assistant", "Ask while you build", "Answers come from the guides, with sources"],
    link: { href: "/use#claude", text: "Connect your assistant" },
  },
  {
    id: "slack",
    label: "In Slack",
    steps: ["Install the app from a manifest", "Type /oauth-guide and an app", "Or @mention it with a question"],
    link: { href: "/use#slack", text: "Set up Slack" },
  },
] as const;

type TabId = (typeof TABS)[number]["id"];

const reveal = "animate-[fadein_400ms_ease-out_2s_both]";

function Demo({ id }: { id: TabId }) {
  if (id === "web") {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2.5 text-sm">
          <span aria-hidden className="text-muted">⌕</span>
          <Typewriter text="Gmail" speed={110} startDelay={300} />
        </div>
        <div className={`rounded-lg border border-line bg-surface px-3 py-3 text-sm ${reveal}`}>
          <div className="flex items-center justify-between gap-2">
            <span className="font-medium">Google (Gmail, Calendar, Drive)</span>
            <span className="rounded bg-hard-bg px-1.5 py-0.5 text-xs font-medium text-hard">Hard</span>
          </div>
          <div className="mt-1 text-muted">
            Dev <span className="text-ink">30–90 min</span> · Any user <span className="font-medium text-ink">6–10 weeks</span>
          </div>
        </div>
      </div>
    );
  }
  if (id === "ai") {
    return (
      <div className="space-y-3 text-sm">
        <div className="ml-6 rounded-lg bg-ink px-3 py-2.5 text-surface">
          <Typewriter text="How long until users can connect Gmail?" speed={35} startDelay={300} />
        </div>
        <div className={`flex w-fit items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 py-1 text-xs text-muted ${reveal}`}>
          <span aria-hidden>⚙</span> OAuth Guide · get_guide
        </div>
        <div className={`rounded-lg border border-line bg-surface px-3 py-2.5 [animation-delay:2.4s] ${reveal}`}>
          About <span className="font-medium">6–10 weeks</span>. Reading email needs restricted scopes: Google verification plus a security assessment.{" "}
          <span className="text-cobalt">[1]</span>
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-3 text-sm">
      <div className="rounded-lg border border-line bg-surface px-3 py-2.5 font-mono text-[13px]">
        <Typewriter text="/oauth-guide gmail" speed={80} startDelay={300} />
      </div>
      <div className={`rounded-lg border-l-4 border-hard bg-surface px-3 py-3 shadow-sm ${reveal}`}>
        <div className="font-medium">Google (Gmail, Calendar, Drive)</div>
        <div className="mt-1 grid grid-cols-2 gap-2 text-xs">
          <div>
            <div className="text-muted">Working in dev</div>30–90 min
          </div>
          <div>
            <div className="text-muted">Any user can connect</div>6–10 weeks
          </div>
        </div>
        <span className="mt-2 inline-block rounded bg-trivial px-2 py-1 text-xs font-medium text-surface">Open the full guide</span>
      </div>
    </div>
  );
}

export function HowItWorks() {
  const [tab, setTab] = useState<TabId>("web");
  const current = TABS.find((t) => t.id === tab)!;
  return (
    <section aria-labelledby="how-it-works" className="mt-16">
      <h2 id="how-it-works" className="font-display text-2xl font-semibold tracking-tight">
        Use it where you work
      </h2>
      <div role="tablist" aria-label="Ways to use OAuth Guide" className="mt-4 inline-flex rounded-lg border border-line bg-surface p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            aria-controls="how-panel"
            onClick={() => setTab(t.id)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors sm:px-4 ${tab === t.id ? "bg-ink text-surface" : "text-muted hover:text-ink"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div id="how-panel" role="tabpanel" key={tab} className="mt-5 grid animate-[fadein_300ms_ease-out] items-center gap-6 rounded-xl border border-line bg-paper p-5 sm:p-6 md:grid-cols-2">
        <div>
          <ol className="space-y-3">
            {current.steps.map((s, i) => (
              <li key={s} className="flex items-center gap-3">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-ink text-sm font-semibold text-surface">{i + 1}</span>
                <span>{s}</span>
              </li>
            ))}
          </ol>
          <Link href={current.link.href} className="mt-5 inline-block text-sm font-medium underline underline-offset-4 hover:text-cobalt">
            {current.link.text} →
          </Link>
        </div>
        <div aria-hidden className="min-h-44">
          <Demo id={tab} />
        </div>
      </div>
    </section>
  );
}
