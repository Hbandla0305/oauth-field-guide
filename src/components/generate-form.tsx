"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const EXAMPLES = ["Asana", "Zoom", "Salesforce", "calendly.com"];

export function GenerateForm() {
  const router = useRouter();
  const [app, setApp] = useState("");

  function go(name: string) {
    const value = name.trim();
    if (value) router.push(`/generate?app=${encodeURIComponent(value)}`);
  }

  return (
    <div>
      <form
        className="flex flex-col gap-2 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault();
          go(app);
        }}
      >
        <label htmlFor="app" className="sr-only">
          App name or website
        </label>
        <input
          id="app"
          value={app}
          onChange={(e) => setApp(e.target.value)}
          maxLength={80}
          required
          placeholder="Any app or website, e.g. Salesforce"
          className="h-12 flex-1 rounded-lg border border-line bg-surface px-4 text-base placeholder:text-muted/70 focus:border-ink focus:outline-none"
        />
        <button type="submit" className="h-12 rounded-lg bg-ink px-5 font-medium text-surface hover:bg-ink/90">
          Get the guide
        </button>
      </form>
      <p className="mt-3 text-sm text-muted">
        Not in the library? An agent researches it live in about two minutes. Try{" "}
        {EXAMPLES.map((x, i) => (
          <span key={x}>
            <button type="button" onClick={() => go(x)} className="text-ink underline decoration-line underline-offset-2 hover:decoration-ink">
              {x}
            </button>
            {i < EXAMPLES.length - 2 ? ", " : i === EXAMPLES.length - 2 ? " or " : "."}
          </span>
        ))}
      </p>
    </div>
  );
}
