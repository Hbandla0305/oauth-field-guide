"use client";

import { useState } from "react";
import type { Guide } from "@/lib/guide-schema";

// A ready-to-paste prompt for the user's own AI assistant, for steps marked "AI can help".
export function buildPrompt(guide: Guide, task: string, detail?: string, url?: string | null): string {
  const docs = [url, ...guide.officialDocs.slice(0, 3).map((d) => d.url)].filter((u, i, a): u is string => Boolean(u) && a.indexOf(u) === i);
  return [
    `I'm building an AI agent that connects to my users' ${guide.app.name} accounts with OAuth, and I'm registering our own ${guide.app.name} OAuth app.`,
    `Please do this step for me: ${task}.`,
    detail ? `Details from the setup guide: ${detail}` : null,
    docs.length ? `Official docs to rely on: ${docs.join(" , ")}` : null,
    "About us: [one sentence on what the product does]. Website: [your domain]. Permissions/scopes we plan to request: [list them].",
    `Give me finished output I can paste directly (text, config or code). Flag anything you're unsure about or that I need to check in the ${guide.app.name} console.`,
  ]
    .filter(Boolean)
    .join("\n\n");
}

export function CopyPrompt({ prompt, compact }: { prompt: string; compact?: boolean }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      title="Copy a ready-to-paste prompt for ChatGPT, Claude or another AI assistant"
      onClick={async (e) => {
        e.preventDefault();
        e.stopPropagation();
        await navigator.clipboard.writeText(prompt);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className={`inline-flex shrink-0 items-center gap-1 rounded border border-trivial/40 px-1.5 py-0.5 text-xs font-medium text-trivial hover:bg-trivial-bg ${compact ? "" : "py-1"}`}
    >
      <svg viewBox="0 0 16 16" className="size-3" aria-hidden>
        <rect x="5" y="5" width="8" height="9" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path d="M3 11V3.5A1.5 1.5 0 014.5 2H10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      {copied ? "Copied" : "Copy prompt"}
      <span className="sr-only" aria-live="polite">
        {copied ? "Prompt copied to clipboard" : ""}
      </span>
    </button>
  );
}
