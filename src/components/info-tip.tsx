"use client";

import { useEffect, useId, useRef, useState } from "react";

// Card for supporting detail: how a number was estimated, what an evidence label means, which
// sources back a claim. Opens on hover (desktop) and toggles on tap/click (touch, keyboard);
// Escape or a tap elsewhere closes it.
type Align = "start" | "center" | "end";

const ALIGN: Record<Align, string> = {
  start: "left-0",
  center: "left-1/2 -translate-x-1/2",
  end: "right-0",
};

export function HoverCard({
  trigger,
  children,
  align = "start",
  label,
}: {
  trigger: React.ReactNode;
  children: React.ReactNode;
  align?: Align;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  return (
    <span ref={ref} className="group/tip relative inline-flex align-middle">
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-controls={id}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        className="inline-flex items-center rounded"
      >
        {trigger}
      </button>
      {/* Not rendered until opened, so it never widens the page. pt-2 bridges the gap so the
          pointer can travel into the card. On phones it opens as a card along the bottom edge. */}
      <span
        id={id}
        role="tooltip"
        className={`absolute top-full z-50 pt-2 group-hover/tip:block max-sm:fixed max-sm:inset-x-4 max-sm:top-auto max-sm:bottom-4 max-sm:translate-x-0 max-sm:pt-0 ${open ? "block" : "hidden"} ${ALIGN[align]}`}
      >
        <span className="block w-[20rem] rounded-lg bg-ink px-3.5 py-3 text-left text-sm leading-snug font-normal text-surface shadow-lg max-sm:w-full">
          {children}
        </span>
      </span>
    </span>
  );
}

export function InfoTip({ label, children, align = "center" }: { label: string; children: React.ReactNode; align?: Align }) {
  return (
    <HoverCard
      label={label}
      align={align}
      trigger={
        <span className="ml-1.5 inline-flex size-4 items-center justify-center rounded-full border border-muted/50 text-[10px] font-semibold text-muted group-hover/tip:border-ink group-hover/tip:text-ink">
          ?
        </span>
      }
    >
      {children}
    </HoverCard>
  );
}
