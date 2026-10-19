"use client";

import { useState } from "react";

export function ShareBar({ markdown, filename }: { markdown: string; filename: string }) {
  const [copied, setCopied] = useState<"link" | "markdown" | null>(null);

  async function copy(kind: "link" | "markdown") {
    await navigator.clipboard.writeText(kind === "link" ? window.location.href : markdown);
    setCopied(kind);
    setTimeout(() => setCopied(null), 2000);
  }

  function download() {
    const url = URL.createObjectURL(new Blob([markdown], { type: "text/markdown" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: filename });
    a.click();
    URL.revokeObjectURL(url);
  }

  const btn = "rounded-md border border-line bg-surface px-3 py-1.5 text-sm font-medium hover:border-ink";
  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" className={btn} onClick={() => copy("link")}>
        {copied === "link" ? "Link copied" : "Copy link"}
      </button>
      <button type="button" className={btn} onClick={() => copy("markdown")}>
        {copied === "markdown" ? "Markdown copied" : "Copy as Markdown"}
      </button>
      <button type="button" className={btn} onClick={download}>
        Download .md
      </button>
      <span className="sr-only" aria-live="polite">
        {copied ? `${copied === "link" ? "Link" : "Markdown"} copied to clipboard` : ""}
      </span>
    </div>
  );
}
