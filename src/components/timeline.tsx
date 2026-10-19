import type { Guide } from "@/lib/guide-schema";
import { DIFFICULTY } from "./difficulty";
import type { GuideSummary } from "@/lib/guides";

// Log scale from 5 minutes to 6 months, so "15 min" and "6 weeks" both read clearly.
const MIN_H = 5 / 60;
const MAX_H = 24 * 182;
const TICKS = [
  { h: 1, label: "1 hour" },
  { h: 24, label: "1 day" },
  { h: 24 * 7, label: "1 week" },
  { h: 24 * 30, label: "1 month" },
  { h: 24 * 182, label: "6 months" },
];

function pos(hours: number): number {
  const h = Math.min(Math.max(hours, MIN_H), MAX_H);
  return (Math.log(h / MIN_H) / Math.log(MAX_H / MIN_H)) * 100;
}

function Band({ min, max, className }: { min: number; max: number; className: string }) {
  const left = pos(min);
  const width = Math.max(pos(max) - left, 1.5);
  return <span className={`absolute top-0 h-full rounded-full ${className}`} style={{ left: `${left}%`, width: `${width}%` }} />;
}

type CompactProps = Pick<GuideSummary, "difficulty" | "dev" | "prod" | "devHours" | "prodHours">;

export function TimelineCompact({ difficulty, dev, prod, devHours, prodHours }: CompactProps) {
  return (
    <div className="relative h-2 w-full min-w-28 rounded-full bg-faint" role="img" aria-label={`Working in dev: ${dev}. Any user can connect: ${prod}.`}>
      <Band min={prodHours.min} max={prodHours.max} className={`${DIFFICULTY[difficulty].bar} opacity-90`} />
      <Band min={devHours.min} max={devHours.max} className="bg-ink" />
    </div>
  );
}

export function TimelineLarge({ guide }: { guide: Guide }) {
  const { timeToDev, timeToProd, difficulty } = guide.verdict;
  const rows = [
    { label: "Working in dev", sub: "You can sign in with your own account", t: timeToDev, cls: "bg-ink" },
    { label: "Any user can connect", sub: timeToProd.assumes, t: timeToProd, cls: DIFFICULTY[difficulty].bar },
  ];
  return (
    <figure className="rounded-xl border border-line bg-surface p-5 sm:p-6">
      <figcaption className="sr-only">Time from starting setup until each milestone, on a log scale</figcaption>
      <div className="space-y-5">
        {rows.map((r) => (
          <div key={r.label} className="grid gap-2 sm:grid-cols-[16rem_1fr] sm:items-center sm:gap-6">
            <div>
              <div className="flex items-baseline justify-between gap-3 sm:block">
                <p className="font-medium">{r.label}</p>
                <p className="font-display text-2xl font-semibold tracking-tight sm:mt-0.5">{r.t.range}</p>
              </div>
              <p className="text-sm text-muted">{r.sub}</p>
            </div>
            <div className="relative h-3 rounded-full bg-faint" aria-hidden>
              <Band min={r.t.hours.min} max={r.t.hours.max} className={r.cls} />
            </div>
          </div>
        ))}
      </div>
      <div className="relative mt-3 h-5 sm:ml-[17.5rem]" aria-hidden>
        {TICKS.map((t, i) => (
          <span
            key={t.h}
            className={`absolute top-0 whitespace-nowrap text-xs text-muted ${i === TICKS.length - 1 ? "-translate-x-full" : "-translate-x-1/2"}`}
            style={{ left: `${pos(t.h)}%` }}
          >
            {t.label}
          </span>
        ))}
      </div>
    </figure>
  );
}
