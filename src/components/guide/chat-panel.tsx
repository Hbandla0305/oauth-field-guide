"use client";

import { useEffect, useRef, useState } from "react";
import type { Guide } from "@/lib/guide-schema";

type Message = { role: "user" | "assistant"; content: string };

const MAX_MESSAGES = 8;

function suggestions(g: Guide): string[] {
  const out = ["What's the fastest way to get any user connected?", "What can an agent do for me, and what do I have to do?"];
  const reviewed = g.scopeTiers.find((t) => t.reviewRequired);
  if (reviewed) out.unshift(`What triggers review, and how do I avoid it?`);
  if (g.blockers[0]) out.push(`How do I fix “${g.blockers[0].symptom.slice(0, 60)}${g.blockers[0].symptom.length > 60 ? "…" : ""}”?`);
  return out.slice(0, 4);
}

export function ChatPanel({ open, onClose, guide }: { open: boolean; onClose: () => void; guide: Guide }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => endRef.current?.scrollIntoView({ block: "end" }), [messages]);

  const full = messages.length >= MAX_MESSAGES;

  async function ask(question: string) {
    const q = question.trim();
    if (!q || busy || full) return;
    setError(null);
    setInput("");
    const history: Message[] = [...messages, { role: "user", content: q }];
    setMessages([...history, { role: "assistant", content: "" }]);
    setBusy(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ slug: guide.app.slug, messages: history }),
      });
      if (!res.ok || !res.body) {
        const body = await res.json().catch(() => ({}));
        setMessages(history.slice(0, -1));
        setInput(q);
        setError(body.error ?? "That question couldn't be answered. Try again.");
        return;
      }
      const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
      let text = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        text += value;
        setMessages([...history, { role: "assistant", content: text }]);
      }
    } catch {
      setError("The connection dropped. Try again.");
    } finally {
      setBusy(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button type="button" aria-label="Close chat" onClick={onClose} className="absolute inset-0 bg-ink/20" />
      <aside role="dialog" aria-modal="true" aria-label={`Ask about ${guide.app.name}`} className="relative flex h-full w-full flex-col bg-surface shadow-2xl sm:w-[28rem]">
        <header className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div>
            <h2 className="font-display text-lg font-semibold">Ask about {guide.app.name}</h2>
            <p className="text-sm text-muted">Answers come only from this guide, with sources.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-md px-2 py-1 text-muted hover:bg-faint hover:text-ink" aria-label="Close">
            ✕
          </button>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5" aria-live="polite">
          {messages.length === 0 && (
            <div className="space-y-2">
              <p className="text-sm text-muted">Try one of these:</p>
              {suggestions(guide).map((s) => (
                <button key={s} type="button" onClick={() => ask(s)} className="block w-full rounded-lg border border-line px-3 py-2 text-left text-sm hover:border-ink">
                  {s}
                </button>
              ))}
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={m.role === "user" ? "ml-8 rounded-lg bg-ink px-3.5 py-2.5 text-sm text-surface" : "text-sm leading-relaxed whitespace-pre-wrap text-ink"}>
              {m.content || (busy && i === messages.length - 1 ? <span className="text-muted">Reading the guide…</span> : null)}
            </div>
          ))}
          {error && (
            <p role="alert" className="rounded-lg bg-hard-bg px-3 py-2 text-sm text-hard">
              {error}
            </p>
          )}
          {full && <p className="text-sm text-muted">This conversation has reached its limit. Close and reopen the panel to start a new one.</p>}
          <div ref={endRef} />
        </div>

        <form
          className="border-t border-line p-4"
          onSubmit={(e) => {
            e.preventDefault();
            ask(input);
          }}
        >
          <label htmlFor="chat-q" className="sr-only">
            Your question
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
                ask(input);
              }
            }}
            placeholder="Ask a question about this guide"
            className="w-full resize-none rounded-lg border border-line px-3 py-2 text-sm focus:border-ink focus:outline-none disabled:bg-faint"
          />
          <div className="mt-2 flex items-center justify-between text-xs text-muted">
            <span>Sources are numbered as on the Sources tab.</span>
            <button type="submit" disabled={busy || full || !input.trim()} className="rounded-md bg-ink px-3 py-1.5 text-sm font-medium text-surface disabled:opacity-40">
              {busy ? "Answering…" : "Ask"}
            </button>
          </div>
        </form>
      </aside>
    </div>
  );
}
