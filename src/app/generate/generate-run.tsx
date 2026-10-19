"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { AgentEvent, StageId } from "@/lib/agent/pipeline";

const STAGES: { id: StageId; label: string }[] = [
  { id: "screen", label: "Identify the app" },
  { id: "probe", label: "Probe live OAuth endpoints" },
  { id: "research", label: "Research official docs" },
  { id: "links", label: "Check every cited link" },
  { id: "audit", label: "Audit claims against sources" },
  { id: "save", label: "Save a shareable guide" },
];

type StageState = { status: "pending" | "active" | "done"; detail?: string };

export function GenerateRun() {
  const app = useSearchParams().get("app")?.trim() ?? "";
  const router = useRouter();
  const started = useRef(false);
  const [stages, setStages] = useState<Record<string, StageState>>({});
  const [searches, setSearches] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    if (!app || started.current) return;
    started.current = true;
    const t0 = Date.now();
    const timer = setInterval(() => setElapsed(Math.round((Date.now() - t0) / 1000)), 1000);

    const handle = (e: AgentEvent) => {
      if (e.type === "stage") setStages((s) => ({ ...s, [e.stage]: { status: e.status, detail: e.detail } }));
      if (e.type === "search") setSearches((s) => [...s, e.query]);
      if (e.type === "error") setError(e.message);
      if (e.type === "done") {
        setFinished(true);
        router.replace(`/guides/${e.slug}`);
      }
    };

    (async () => {
      try {
        const res = await fetch("/api/generate", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ app }),
        });
        if (!res.headers.get("content-type")?.includes("text/event-stream")) {
          const body = await res.json().catch(() => ({}));
          if (body.slug) return handle({ type: "done", slug: body.slug, cached: true });
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
      } catch {
        setError("The connection dropped. If the agent finished, the guide will appear in Recently generated on the home page.");
      } finally {
        clearInterval(timer);
      }
    })();
    return () => clearInterval(timer);
  }, [app, router]);

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
      <h1 className="mt-6 font-display text-4xl font-semibold tracking-tight">Researching {app}</h1>
      <p className="mt-3 text-muted">
        An agent is investigating how to get an OAuth app approved for {app}. This usually takes one to three minutes. The guide opens here when it&rsquo;s ready.
      </p>

      <ol className="mt-10 space-y-1" aria-live="polite">
        {STAGES.map((s) => {
          const st = stages[s.id]?.status ?? "pending";
          return (
            <li key={s.id} className="grid grid-cols-[1.5rem_1fr] gap-3 py-2">
              <StatusIcon status={error && st === "active" ? "failed" : st} />
              <div>
                <p className={st === "pending" ? "text-muted" : "font-medium"}>{s.label}</p>
                {stages[s.id]?.detail && <p className="text-sm text-muted">{stages[s.id]?.detail}</p>}
                {s.id === "research" && searches.length > 0 && (
                  <ul className="mt-2 space-y-1 text-sm text-muted">
                    {searches.map((q, i) => (
                      <li key={i} className="truncate">
                        Searched “{q}”
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      {error ? (
        <div role="alert" className="mt-8 rounded-lg border border-hard/30 bg-hard-bg p-4">
          <p className="font-medium text-hard">{error}</p>
          <Link href="/" className="mt-2 inline-block text-sm underline">
            Back to all guides
          </Link>
        </div>
      ) : (
        <p className="mt-8 text-sm text-muted">{finished ? "Opening the guide…" : `${elapsed}s elapsed`}</p>
      )}
    </div>
  );
}

function StatusIcon({ status }: { status: StageState["status"] | "failed" }) {
  if (status === "done")
    return (
      <svg viewBox="0 0 20 20" className="mt-0.5 size-5 text-trivial" aria-label="Done">
        <circle cx="10" cy="10" r="9" fill="currentColor" />
        <path d="M6 10.5l2.5 2.5L14 7.5" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  if (status === "active")
    return <span className="mt-0.5 block size-5 animate-spin rounded-full border-2 border-line border-t-ink" aria-label="In progress" />;
  if (status === "failed") return <span className="mt-0.5 block size-5 rounded-full bg-hard" aria-label="Failed" />;
  return <span className="mt-1.5 ml-1.5 block size-2 rounded-full bg-line" aria-label="Not started" />;
}
