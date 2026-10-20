"use client";

import { useEffect, useRef, useState } from "react";
import type { Guide } from "@/lib/guide-schema";
import { EMPTY_PROFILE, defaultConfig, setupUrl, supportsSetup, type Profile } from "@/lib/setup-links";

// `label` is what the user sees in their bubble; `content` is what the AI receives.
type Message = { role: "user" | "assistant"; content: string; task?: "draft" | "pack"; label?: string };

// What the panel was opened to do: a question, a draft for one step, the review pack, or app setup.
export type AssistantTask = { kind: "draft"; title: string; detail?: string } | { kind: "pack" } | { kind: "setup" };

const MAX_MESSAGES = 8;
const PROFILE_KEY = "oauth-guide:profile";

function questions(g: Guide): string[] {
  const out = ["What's the fastest way to get any user connected?"];
  if (g.scopeTiers.some((t) => t.reviewRequired)) out.unshift("What triggers review, and how do I avoid it?");
  if (g.blockers[0]) out.push(`How do I fix “${g.blockers[0].symptom.slice(0, 60)}${g.blockers[0].symptom.length > 60 ? "…" : ""}”?`);
  return out.slice(0, 3);
}

function useProfile(): [Profile, (p: Profile) => void] {
  const [profile, setProfile] = useState<Profile>(EMPTY_PROFILE);
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(PROFILE_KEY) ?? "null");
      if (saved && typeof saved === "object") setProfile({ ...EMPTY_PROFILE, ...saved });
    } catch {
      // storage unavailable: keep empty
    }
  }, []);
  return [
    profile,
    (p) => {
      setProfile(p);
      try {
        localStorage.setItem(PROFILE_KEY, JSON.stringify(p));
      } catch {}
    },
  ];
}

export function ChatPanel({ open, onClose, guide, task, onTaskStarted }: { open: boolean; onClose: () => void; guide: Guide; task: AssistantTask | null; onTaskStarted: () => void }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<"main" | "setup">("main");
  const [profile, setProfile] = useProfile();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Block body on purpose: newer browsers return a Promise from scrollIntoView, and an effect
  // that returns anything but a cleanup function crashes React.
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  const full = messages.length >= MAX_MESSAGES;

  async function send(content: string, kind?: "draft" | "pack", label?: string) {
    const text = content.trim();
    if (!text || busy || full) return;
    setError(null);
    setInput("");
    setView("main");
    const history: Message[] = [...messages, { role: "user", content: text, task: kind, label }];
    setMessages([...history, { role: "assistant", content: "", task: kind }]);
    setBusy(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ slug: guide.app.slug, messages: history.map(({ role, content }) => ({ role, content })), task: kind ?? null, profile }),
      });
      if (!res.ok || !res.body) {
        const body = await res.json().catch(() => ({}));
        setMessages(history.slice(0, -1));
        if (!kind) setInput(text);
        setError(body.error ?? "That request couldn't be completed. Try again.");
        return;
      }
      const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
      let out = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        out += value;
        setMessages([...history, { role: "assistant", content: out, task: kind }]);
      }
    } catch {
      setError("The connection dropped. Try again.");
    } finally {
      setBusy(false);
    }
  }

  const draft = (title: string, detail?: string) =>
    send(`Do this for me: ${title}.${detail ? ` Context from the guide: ${detail.slice(0, 300)}` : ""}`.slice(0, 480), "draft", `Do it with AI: ${title}`);
  const pack = () => send(`Build my review pack for ${guide.app.name}.`, "pack", "Build my review pack");

  // Start whatever the panel was opened for (e.g. "Do it with AI" on a step).
  useEffect(() => {
    if (!open || !task) return;
    onTaskStarted();
    if (task.kind === "setup") setView("setup");
    else if (task.kind === "pack") pack();
    else draft(task.title, task.detail);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, task]);

  if (!open) return null;

  const actions = guide.agentCanDo.slice(0, 5);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 bg-ink/20" />
      <aside role="dialog" aria-modal="true" aria-label={`Chat about ${guide.app.name}`} className="relative flex h-full w-full flex-col bg-surface shadow-2xl sm:w-[30rem]">
        <header className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div>
            <h2 className="font-display text-lg font-semibold">Chat about this guide</h2>
            <p className="text-sm text-muted">Ask questions, or have the AI do the work for you.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-md px-2 py-1 text-muted hover:bg-faint hover:text-ink" aria-label="Close">
            ✕
          </button>
        </header>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5" aria-live="polite">
          {view === "setup" && supportsSetup(guide.app.slug) ? (
            <SetupView slug={guide.app.slug} appName={guide.app.name} profile={profile} onBack={() => setView("main")} />
          ) : (
            <>
              <ProfileForm profile={profile} onChange={setProfile} />

              {messages.length === 0 && (
                <>
                  <section>
                    <h3 className="text-sm font-medium">Have the AI do it</h3>
                    <ul className="mt-2 space-y-2">
                      {supportsSetup(guide.app.slug) && (
                        <Action title={`Create the ${guide.app.name} app for me`} hint="Builds the app's configuration and opens the console pre-filled. You review and press Create." onClick={() => setView("setup")} />
                      )}
                      <Action title="Build my review pack" hint="Scope justifications, privacy policy section, demo script and reviewer instructions, ready to download." onClick={pack} />
                      {actions.map((a) => (
                        <Action key={a} title={a} onClick={() => draft(a)} />
                      ))}
                    </ul>
                  </section>
                  <section>
                    <h3 className="text-sm font-medium">Or ask a question</h3>
                    <ul className="mt-2 space-y-2">
                      {questions(guide).map((q) => (
                        <li key={q}>
                          <button type="button" onClick={() => send(q)} className="block w-full rounded-lg border border-line px-3 py-2 text-left text-sm hover:border-ink">
                            {q}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </section>
                </>
              )}

              {messages.map((m, i) =>
                m.role === "user" ? (
                  <div key={i} className="ml-8 rounded-lg bg-ink px-3.5 py-2.5 text-sm text-surface">
                    {m.task && <span className="mr-1.5 text-trivial-bg">▶</span>}
                    {m.label ?? m.content}
                  </div>
                ) : (
                  <div key={i}>
                    <div className="text-sm leading-relaxed whitespace-pre-wrap [overflow-wrap:anywhere] text-ink">
                      {m.content || (busy && i === messages.length - 1 ? <span className="text-muted">{m.task ? "Working on it…" : "Reading the guide…"}</span> : null)}
                    </div>
                    {m.task && m.content && !(busy && i === messages.length - 1) && <ResultActions text={m.content} filename={`${guide.app.slug}-${m.task === "pack" ? "review-pack" : "draft"}.md`} />}
                  </div>
                ),
              )}
              {error && (
                <p role="alert" className="rounded-lg bg-hard-bg px-3 py-2 text-sm text-hard">
                  {error}
                </p>
              )}
              {full && <p className="text-sm text-muted">This conversation has reached its limit. Close and reopen the panel to start a new one.</p>}
              {messages.length > 0 && !busy && !full && (
                <button type="button" onClick={() => setMessages([])} className="text-sm text-muted underline underline-offset-2 hover:text-ink">
                  Start over and see all actions
                </button>
              )}
              <div ref={endRef} />
            </>
          )}
        </div>

        <form
          className="border-t border-line p-4"
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
        >
          <label htmlFor="chat-q" className="sr-only">
            Your question or task
          </label>
          <textarea
            id="chat-q"
            ref={inputRef}
            rows={2}
            maxLength={500}
            value={input}
            disabled={full}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            placeholder="Ask a question, or tell the AI what to draft"
            className="w-full resize-none rounded-lg border border-line px-3 py-2 text-sm focus:border-ink focus:outline-none disabled:bg-faint"
          />
          <div className="mt-2 flex items-center justify-between text-xs text-muted">
            <span>Answers use only this guide. Sources match the Resources tab.</span>
            <button type="submit" disabled={busy || full || !input.trim()} className="rounded-md bg-ink px-3 py-1.5 text-sm font-medium text-surface disabled:opacity-40">
              {busy ? "Working…" : "Send"}
            </button>
          </div>
        </form>
      </aside>
    </div>
  );
}

function Action({ title, hint, onClick }: { title: string; hint?: string; onClick: () => void }) {
  return (
    <li>
      <button type="button" onClick={onClick} className="group flex w-full items-start gap-3 rounded-lg border border-trivial/30 bg-trivial-bg/40 px-3 py-2.5 text-left hover:border-trivial">
        <span aria-hidden className="mt-0.5 text-trivial">
          ▶
        </span>
        <span>
          <span className="block text-sm font-medium">{title}</span>
          {hint && <span className="mt-0.5 block text-xs text-muted">{hint}</span>}
        </span>
      </button>
    </li>
  );
}

function ResultActions({ text, filename }: { text: string; filename: string }) {
  const [copied, setCopied] = useState(false);
  const btn = "rounded-md border border-line px-2 py-1 text-xs font-medium hover:border-ink";
  return (
    <div className="mt-2 flex gap-2">
      <button
        type="button"
        className={btn}
        onClick={async () => {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }}
      >
        {copied ? "Copied" : "Copy"}
      </button>
      <button
        type="button"
        className={btn}
        onClick={() => {
          const url = URL.createObjectURL(new Blob([text], { type: "text/markdown" }));
          Object.assign(document.createElement("a"), { href: url, download: filename }).click();
          URL.revokeObjectURL(url);
        }}
      >
        Download .md
      </button>
    </div>
  );
}

function ProfileForm({ profile, onChange }: { profile: Profile; onChange: (p: Profile) => void }) {
  const filled = Object.values(profile).filter((v) => v.trim()).length;
  const field = (key: keyof Profile, label: string, placeholder: string) => (
    <label className="block text-xs">
      <span className="text-muted">{label}</span>
      <input
        value={profile[key]}
        maxLength={key === "whatItDoes" ? 400 : 200}
        onChange={(e) => onChange({ ...profile, [key]: e.target.value })}
        placeholder={placeholder}
        className="mt-1 w-full rounded-md border border-line bg-surface px-2.5 py-1.5 text-sm focus:border-ink focus:outline-none"
      />
    </label>
  );
  return (
    <details className="rounded-lg border border-line bg-paper" open={filled === 0 ? undefined : false}>
      <summary className="cursor-pointer px-3 py-2 text-sm">
        <span className="font-medium">About your product</span>{" "}
        <span className="text-muted">{filled ? `${filled} of 4 filled, used in every draft` : "optional, makes drafts specific to you"}</span>
      </summary>
      <div className="space-y-2.5 px-3 pb-3">
        {field("productName", "Product name", "Acme Assistant")}
        {field("website", "Website", "https://acme.ai")}
        {field("redirectUrl", "OAuth redirect URL", "https://acme.ai/oauth/callback")}
        {field("whatItDoes", "What your agent does", "Summarises customer emails and drafts replies")}
        <p className="text-xs text-muted">Saved in this browser only.</p>
      </div>
    </details>
  );
}

// Builds the provider's app configuration and opens its console pre-filled. The user reviews
// everything there and presses Create; we never handle their credentials.
function SetupView({ slug, appName, profile, onBack }: { slug: "slack" | "github"; appName: string; profile: Profile; onBack: () => void }) {
  const [config, setConfig] = useState(() => defaultConfig(slug, profile));
  const result = setupUrl(slug, config);
  const steps =
    slug === "slack"
      ? ["Slack opens “Create an app” with this manifest. Pick your workspace.", "Review the scopes and redirect URL, then press Create.", "Under Install App, install it to your workspace to get the bot token."]
      : ["GitHub opens “Register new GitHub App” with these fields filled.", "Review the permissions and callback URL, then press Create GitHub App.", "On the app page, generate a client secret and store it in your backend."];
  return (
    <div className="space-y-4">
      <button type="button" onClick={onBack} className="text-sm text-muted hover:text-ink">
        ← Back
      </button>
      <div>
        <h3 className="font-medium">Create the {appName} app for you</h3>
        <p className="mt-1 text-sm text-muted">
          The agent filled in this configuration from your product details and the guide&rsquo;s advice (least-privilege permissions first). Edit anything, then open {appName}.
        </p>
      </div>
      <label className="block">
        <span className="sr-only">App configuration</span>
        <textarea value={config} onChange={(e) => setConfig(e.target.value)} rows={14} spellCheck={false} className="w-full rounded-lg border border-line bg-paper px-3 py-2 font-mono text-xs focus:border-ink focus:outline-none" />
      </label>
      {"error" in result ? (
        <p className="text-sm text-hard">{result.error}</p>
      ) : (
        <a href={result.url} target="_blank" rel="noreferrer" className="block rounded-lg bg-ink px-4 py-2.5 text-center font-medium text-surface hover:bg-ink/90">
          Open {appName} with this pre-filled
        </a>
      )}
      <div className="flex justify-between text-xs">
        <button type="button" onClick={() => setConfig(defaultConfig(slug, profile))} className="text-muted underline underline-offset-2 hover:text-ink">
          Reset to the suggested configuration
        </button>
      </div>
      <ol className="list-decimal space-y-1 pl-5 text-sm text-ink/80">
        {steps.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ol>
      <p className="rounded-lg bg-faint px-3 py-2 text-xs text-muted">You stay in control: nothing is created until you press Create in {appName}. We never see your login or the app&rsquo;s secrets.</p>
    </div>
  );
}
