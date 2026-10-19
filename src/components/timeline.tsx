// Log scale from 5 minutes to 6 months, so "15 min" and "6 weeks" both read clearly.
const MIN_H = 5 / 60;
const MAX_H = 24 * 182;
const TICKS = [
  { h: 1, label: "1 hr" },
  { h: 24, label: "1 day" },
  { h: 24 * 7, label: "1 wk" },
  { h: 24 * 30, label: "1 mo" },
  { h: 24 * 182, label: "6 mo" },
];

function pos(hours: number): number {
  const h = Math.min(Math.max(hours, MIN_H), MAX_H);
  // Rounded so server and browser render identical styles (avoids hydration mismatches).
  return Math.round((Math.log(h / MIN_H) / Math.log(MAX_H / MIN_H)) * 1000) / 10;
}

export function TimelineBand({ min, max, className }: { min: number; max: number; className: string }) {
  const left = pos(min);
  const width = Math.max(Math.round((pos(max) - left) * 10) / 10, 1.5);
  return <span className={`absolute top-0 h-full rounded-full ${className}`} style={{ left: `${left}%`, width: `${width}%` }} />;
}

export function TimelineTicks() {
  return (
    <div className="relative mt-1.5 h-4" aria-hidden>
      {TICKS.map((t, i) => (
        <span
          key={t.h}
          className={`absolute top-0 text-[11px] whitespace-nowrap text-muted ${i === TICKS.length - 1 ? "-translate-x-full" : "-translate-x-1/2"}`}
          style={{ left: `${pos(t.h)}%` }}
        >
          {t.label}
        </span>
      ))}
    </div>
  );
}
