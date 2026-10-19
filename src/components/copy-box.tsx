"use client";

import { useState } from "react";

// A code or prompt block with a copy button.
export function CopyBox({ text, label = "Copy", mono = true }: { text: string; label?: string; mono?: boolean }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="group relative rounded-lg border border-line bg-surface">
      <pre className={`overflow-x-auto px-4 py-3 pr-20 text-sm leading-relaxed whitespace-pre-wrap [overflow-wrap:anywhere] ${mono ? "font-mono" : "font-sans"}`}>{text}</pre>
      <button
        type="button"
        onClick={async () => {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }}
        className="absolute top-2 right-2 rounded-md border border-line bg-paper px-2 py-1 text-xs font-medium hover:border-ink"
      >
        {copied ? "Copied" : label}
      </button>
    </div>
  );
}
