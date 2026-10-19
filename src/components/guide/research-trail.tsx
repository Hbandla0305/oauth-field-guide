import type { Guide } from "@/lib/guide-schema";
import { researchTrail } from "@/lib/research-trail";

const ICON: Record<string, string> = { identify: "◎", probe: "⌁", read: "▤", attempt: "▶", dig: "?", links: "↗", audit: "✓" };

// Vertical timeline of what the agent did. Long steps collapse so the panel stays scannable.
export function ResearchTrail({ guide }: { guide: Guide }) {
  const trail = researchTrail(guide);
  const live = Boolean(guide.researchLog?.length);
  return (
    <div>
      <p className="text-sm text-muted">
        {live
          ? `Recorded during the agent's live run on ${guide.verification.lastChecked}. This is what it actually did, in order.`
          : `How this library guide was put together. Researched ${guide.verification.lastChecked}.`}
      </p>
      <ol className="relative mt-4 space-y-4 border-l border-line pl-6">
        {trail.map((entry, i) => (
          <li key={i} className="relative">
            <span aria-hidden className="absolute top-0 -left-[2.1rem] flex size-6 items-center justify-center rounded-full border border-line bg-surface text-xs text-muted">
              {ICON[entry.step] ?? "•"}
            </span>
            <p className="font-medium">{entry.title}</p>
            {entry.details.length > 0 &&
              (entry.details.length <= 3 ? (
                <ul className="mt-1 space-y-1 text-sm [overflow-wrap:anywhere] text-ink/75">
                  {entry.details.map((d, j) => (
                    <li key={j}>{d}</li>
                  ))}
                </ul>
              ) : (
                <details className="group mt-1 text-sm">
                  <summary className="cursor-pointer text-ink/75 hover:text-ink">
                    {entry.details[0]} <span className="text-muted underline underline-offset-2 group-open:hidden">+{entry.details.length - 1} more</span>
                  </summary>
                  <ul className="mt-1 space-y-1 [overflow-wrap:anywhere] text-ink/75">
                    {entry.details.slice(1).map((d, j) => (
                      <li key={j}>{d}</li>
                    ))}
                  </ul>
                </details>
              ))}
          </li>
        ))}
      </ol>
    </div>
  );
}
