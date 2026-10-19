// Hover/focus card for supporting detail: how a number was estimated, what an evidence
// label means, which sources back a claim. Pure CSS so it works in server components;
// keyboard users get it on focus, touch users on tap.
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
  return (
    <span className="group/tip relative inline-flex align-middle">
      <button type="button" aria-label={label} className="inline-flex items-center rounded">
        {trigger}
      </button>
      {/* Not rendered until opened, so it never widens the page. pt-2 bridges the gap so the
          pointer can travel into the card. On phones it opens as a card along the bottom edge. */}
      <span
        role="tooltip"
        className={`absolute top-full z-50 hidden pt-2 group-focus-within/tip:block group-hover/tip:block max-sm:fixed max-sm:inset-x-4 max-sm:top-auto max-sm:bottom-4 max-sm:translate-x-0 max-sm:pt-0 ${ALIGN[align]}`}
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
