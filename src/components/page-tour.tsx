"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// First-visit guide for a page: a frosted-glass card over a blurred page. Shown once per page
// type (remembered in this browser), replayable from "Show tips" in the footer.
export type TourStep = { icon: string; title: string; body: string };

const SHOW_EVENT = "oauth-guide:show-tips";

export function PageTour({ id, steps }: { id: string; steps: TourStep[] }) {
  const [open, setOpen] = useState(false);
  const [i, setI] = useState(0);
  const card = useRef<HTMLDivElement>(null);
  const key = `oauth-guide:tour:${id}`;

  useEffect(() => {
    try {
      if (!localStorage.getItem(key)) setOpen(true);
    } catch {
      // storage blocked: don't nag on every visit
    }
    const show = () => {
      setI(0);
      setOpen(true);
    };
    window.addEventListener(SHOW_EVENT, show);
    return () => window.removeEventListener(SHOW_EVENT, show);
  }, [key]);

  const close = useCallback(() => {
    setOpen(false);
    try {
      localStorage.setItem(key, "seen");
    } catch {}
  }, [key]);

  useEffect(() => {
    if (!open) return;
    card.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") setI((n) => Math.min(n + 1, steps.length - 1));
      if (e.key === "ArrowLeft") setI((n) => Math.max(n - 1, 0));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close, steps.length]);

  if (!open) return null;
  const step = steps[i];
  const last = i === steps.length - 1;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center p-4 sm:items-center">
      <button type="button" aria-label="Close tips" onClick={close} className="absolute inset-0 bg-ink/25 backdrop-blur-[3px]" />
      <div
        ref={card}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-title"
        className="relative w-full max-w-md animate-[fadein_300ms_ease-out] rounded-2xl border border-white/60 bg-white/55 p-6 shadow-[0_10px_50px_rgba(20,32,51,0.28)] ring-1 ring-white/40 backdrop-blur-2xl backdrop-saturate-150 focus:outline-none [&:focus-visible]:outline-none"
      >
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-muted">
            What you can do here · {i + 1} of {steps.length}
          </p>
          <button type="button" onClick={close} className="text-sm text-muted hover:text-ink">
            Skip
          </button>
        </div>
        <div key={i} className="mt-4">
          <span aria-hidden className="flex size-10 items-center justify-center rounded-xl border border-white/70 bg-white/60 text-xl shadow-sm">
            {step.icon}
          </span>
          <h2 id="tour-title" className="mt-3 font-display text-xl font-semibold tracking-tight">
            {step.title}
          </h2>
          <p className="mt-1.5 leading-relaxed text-ink/80">{step.body}</p>
        </div>
        <div className="mt-6 flex items-center justify-between">
          <div className="flex gap-1.5" aria-hidden>
            {steps.map((_, n) => (
              <span key={n} className={`h-1.5 rounded-full transition-all ${n === i ? "w-5 bg-ink" : "w-1.5 bg-ink/25"}`} />
            ))}
          </div>
          <div className="flex gap-2">
            {i > 0 && (
              <button type="button" onClick={() => setI(i - 1)} className="rounded-lg border border-white/70 bg-white/50 px-3 py-1.5 text-sm font-medium hover:bg-white/80">
                Back
              </button>
            )}
            <button type="button" onClick={() => (last ? close() : setI(i + 1))} className="rounded-lg bg-ink px-4 py-1.5 text-sm font-medium text-surface hover:bg-ink/90">
              {last ? "Got it" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ShowTipsButton() {
  return (
    <button type="button" onClick={() => window.dispatchEvent(new Event(SHOW_EVENT))} className="hover:text-ink">
      Show tips
    </button>
  );
}
