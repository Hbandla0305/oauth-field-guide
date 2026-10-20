"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { AgentEvent, StageId } from "@/lib/agent/pipeline";
import { DotLoader } from "@/components/dot-loader";
import { TIPS } from "@/lib/tips";
import { hasStart, clearStart, saveRun, loadRun, clearRun, type SavedRun } from "@/lib/start-intent";

const STAGES: { id: StageId; label: string }[] = [
  { id: "screen", label: "Identify the app" },
  { id: "probe", label: "Probe live OAuth endpoints" },
  { id: "research", label: "Find and read official docs" },
  { id: "attempt", label: "Try the first setup steps, logged out" },
  { id: "gaps", label: "Look into what's still unclear" },
  { id: "links", label: "Check every cited link" },
  { id: "audit", label: "Audit claims against sources" },
  { id: "save", label: "Save a shareable guide" },
];

type StageState = { status: "pending" | "active" | "done"; detail?: string };

export function GenerateRun() {
  const app = useSearchParams().get("app")?.trim() ?? "";
  const router = useRouter();
  const started = useRef(false);
  // Stops polling when the visitor leaves the page (survives React's dev-mode remount).
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const [stages, setStages] = useState<Record<string, StageState>>({});
  const [searches, setSearches] = useState<string[]>([]);
  const [reads, setReads] = useState<{ title: string; url: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [finished, setFinished] = useState(false);
  const [cachedHit, setCachedHit] = useState(false);

  // Only start automatically when the visit came from our own pages. A link from another site
  // asks for a click first, so other sites can't trigger paid research on visitors' behalf.
  const [confirmed, setConfirmed] = useState(false);
  const [sameSite, setSameSite] = useState<boolean | null>(null);
  // A run this tab already started (the page was reloaded mid-run): follow it, don't start another.
  const [saved, setSaved] = useState<SavedRun | null | undefined>(undefined);
  useEffect(() => {
    setSameSite(hasStart(app));
    setSaved(loadRun(app));
  }, [app]);

  useEffect(() => {
    if (!app || started.current || sameSite === null || saved === undefined || (!saved && !sameSite && !confirmed)) return;
    started.current = true;
    clearStart();
    const t0 = saved?.t0 ?? Date.now();
    const timer = setInterval(() => setElapsed(Math.round((Date.now() - t0) / 1000)), 1000);
    let runId = saved?.runId ?? null;
    let settled = false;

    const handle = (e: AgentEvent) => {
      if (e.type === "run") {
        runId = e.runId;
        saveRun(app, e.runId, t0);
      }
      if (e.type === "stage") setStages((s) => ({ ...s, [e.stage]: { status: e.status, detail: e.detail } }));
      if (e.type === "search") setSearches((s) => [...s, e.query]);
      if (e.type === "read") setReads((r) => [...r, { title: e.title, url: e.url }]);
      if (e.type === "error") {
        settled = true;
        clearRun();
        setError(e.message);
      }
      if (e.type === "done") {
        settled = true;
        clearRun();
        setFinished(true);
        router.replace(`/guides/${e.slug}`);
      }
    };

    // Follows a run from the database: after a reload, or if the live stream drops.
    const follow = async (id: string) => {
      while (alive.current) {
        const res = await fetch(`/api/generate?run=${id}`, { cache: "no-store" }).catch(() => null);
        if (res && res.status !== 200 && res.status < 500) {
          clearRun();
          return setError("This run can't be found any more. If it finished, the guide is under Recently generated on the home page.");
        }
        const run = res?.ok ? ((await res.json()) as { status: string; slug: string | null; progress: Record<string, unknown> }) : null;
        if (run) {
          const { error: failure, ...progress } = run.progress;
          setStages(progress as Record<string, StageState>);
          if ((run.status === "done" || run.status === "cached") && run.slug) return handle({ type: "done", slug: run.slug, cached: run.status === "cached" });
          if (run.status === "failed" || run.status === "rejected") {
            return handle({ type: "error", message: typeof failure === "string" ? failure : "The investigation failed before finishing. Try again in a minute." });
          }
        }
        await new Promise((r) => setTimeout(r, 2500));
      }
    };

    (async () => {
      if (runId) {
        await follow(runId);
        return clearInterval(timer);
      }
      try {
        const res = await fetch("/api/generate", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ app }),
        });
        if (!res.headers.get("content-type")?.includes("text/event-stream")) {
          const body = await res.json().catch(() => ({}));
          if (body.slug) {
            setCachedHit(true);
            return handle({ type: "done", slug: body.slug, cached: true });
          }
          return setError(body.error ?? "Something went wrong. Try again.");
        }
        const reader = res.body!.pipeThrough(new TextDecoderStream()).getReader();
        let buffer = "";
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += value;
          const events = buffer.split("\n\n");
          buffer = events.pop() ?? "";
          for (const chunk of events) {
            if (chunk.startsWith("data: ")) handle(JSON.parse(chunk.slice(6)));
          }
        }
        // The stream closed without a result (a proxy cut it): the run is still going on the server.
        if (!settled && runId && alive.current) await follow(runId);
      } catch {
        // The stream dropped, but the run keeps going on the server: follow it from there.
        if (runId && alive.current) await follow(runId);
        else setError("The connection dropped. If the agent finished, the guide will appear in Recently generated on the home page.");
      } finally {
        clearInterval(timer);
      }
    })();
    return () => clearInterval(timer);
  }, [app, router, sameSite, saved, confirmed]);

  // Searches and reads show under whichever reading step is current.
  const stageForReading: StageId = stages.gaps ? "gaps" : "research";
  // The live run has started only once the server streams its first stage.
  const researching = Object.keys(stages).length > 0;

  if (app && sameSite === false && saved === null && !confirmed) {
    return (
      <div>
        <h1 className="mt-6 font-display text-4xl font-semibold tracking-tight">Research {app}?</h1>
        <p className="mt-3 text-muted">An agent will read {app}&rsquo;s developer docs, try the first setup steps logged out, and write a guide. It takes about two minutes.</p>
        <button type="button" onClick={() => setConfirmed(true)} className="mt-6 rounded-lg bg-ink px-5 py-3 font-medium text-surface hover:bg-ink/90">
          Start research
        </button>
      </div>
    );
  }

  if (!app) {
    return (
      <p>
        Enter an app on the <Link href="/" className="underline">home page</Link> to generate a guide.
      </p>
    );
  }

  return (
    <div>
      <Link href="/" className="text-sm text-muted hover:text-ink">
        ← All guides
      </Link>
      {cachedHit ? (
        <>
          <h1 className="mt-6 font-display text-4xl font-semibold tracking-tight">{app} is already in the library</h1>
          <p className="mt-3 text-muted">Opening the saved guide. Nothing new needs to be researched.</p>
        </>
      ) : error ? (
        <>
          <h1 className="mt-6 font-display text-4xl font-semibold tracking-tight">No guide for {app}</h1>
          <div role="alert" className="mt-6 rounded-lg border border-hard/30 bg-hard-bg p-4">
            <p className="font-medium text-hard">{error}</p>
            <Link href="/" className="mt-2 inline-block text-sm underline">
              Back to all guides
            </Link>
          </div>
        </>
      ) : (
        <>
          <div className="mt-6 flex items-center gap-4">
            <DotLoader />
            <h1 className="font-display text-4xl font-semibold tracking-tight">{researching ? `Researching ${app}` : `Looking up ${app}`}</h1>
          </div>
          <p className="mt-3 text-muted">
            {researching
              ? `An agent is investigating how to get an OAuth app approved for ${app}. This usually takes one to three minutes. The guide opens here when it's ready.`
              : "Checking the library first."}
          </p>

          <ol className={`mt-10 space-y-1 ${researching ? "" : "hidden"}`} aria-live="polite">
            {STAGES.map((s) => {
              const st = stages[s.id]?.status ?? "pending";
              return (
                <li key={s.id} className="grid grid-cols-[1.5rem_1fr] gap-3 py-2">
                  <StatusIcon status={st} />
                  <div>
                    <p className={st === "pending" ? "text-muted" : "font-medium"}>{s.label}</p>
                    {stages[s.id]?.detail && <p className="text-sm text-muted">{stages[s.id]?.detail}</p>}
                    {s.id === stageForReading && (searches.length > 0 || reads.length > 0) && (
                      <ul className="mt-2 space-y-1 text-sm text-muted">
                        {searches.map((q, i) => (
                          <li key={i} className="truncate">
                            Searched “{q}”
                          </li>
                        ))}
                        {reads.map((r) => (
                          <li key={r.url} className="truncate">
                            Read <span className="text-ink">{r.title}</span> <span className="text-muted/80">{new URL(r.url).hostname}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
          {researching && <p className="mt-8 text-sm text-muted">{finished ? "Opening the guide…" : `${elapsed}s elapsed`}</p>}
          {researching && !finished && <TipCarousel />}
        </>
      )}
    </div>
  );
}

// Rotates through Composio facts and OAuth tips while the agent works.
function TipCarousel() {
  const [i, setI] = useState(() => Math.floor(Math.random() * TIPS.length));
  useEffect(() => {
    const id = setInterval(() => setI((n) => (n + 1) % TIPS.length), 7000);
    return () => clearInterval(id);
  }, []);
  const tip = TIPS[i];
  return (
    <aside aria-live="polite" className="mt-10 rounded-xl border border-line bg-surface p-5">
      <p className="text-sm font-medium text-muted">{tip.kind === "composio" ? "Did you know? About Composio" : "OAuth tip"}</p>
      <p key={i} className="mt-2 animate-[fadein_400ms_ease-out] leading-relaxed">
        {tip.text}
      </p>
      <div className="mt-3 flex items-center justify-between text-sm">
        {tip.href ? (
          <a href={tip.href} target="_blank" rel="noreferrer" className="text-cobalt underline underline-offset-2">
            Source: composio.dev
          </a>
        ) : (
          <span className="text-muted">From the guides in this library</span>
        )}
        <button type="button" onClick={() => setI((n) => (n + 1) % TIPS.length)} className="font-medium underline underline-offset-2">
          Next tip
        </button>
      </div>
    </aside>
  );
}

function StatusIcon({ status }: { status: StageState["status"] }) {
  if (status === "done")
    return (
      <svg viewBox="0 0 20 20" className="mt-0.5 size-5 text-trivial" aria-label="Done">
        <circle cx="10" cy="10" r="9" fill="currentColor" />
        <path d="M6 10.5l2.5 2.5L14 7.5" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  if (status === "active")
    return <span className="mt-0.5 block size-5 animate-spin rounded-full border-2 border-line border-t-ink" aria-label="In progress" />;
  return <span className="mt-1.5 ml-1.5 block size-2 rounded-full bg-line" aria-label="Not started" />;
}
