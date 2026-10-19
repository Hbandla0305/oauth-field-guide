import type { Evidence } from "@/lib/guide-schema";
import { HoverCard } from "./info-tip";

export const EVIDENCE = {
  tested: { label: "Tested", meaning: "Observed directly in a setup attempt or live check", dot: "bg-tested", text: "text-tested" },
  sourced: { label: "Sourced", meaning: "Stated in a cited source", dot: "bg-sourced", text: "text-sourced" },
  inferred: { label: "Inferred", meaning: "Reasoned from sources, not stated outright", dot: "bg-inferred", text: "text-inferred" },
  unverified: { label: "Unverified", meaning: "Not confirmed; check before relying on it", dot: "bg-unverified", text: "text-unverified" },
} as const;

export type SourceIndex = Map<string, { n: number; title: string; url: string }>;

// A small coloured label; hover shows what it means, any note, and the sources behind it.
export function EvidenceTag({ evidence, sources, align = "start" }: { evidence: Evidence; sources: SourceIndex; align?: "start" | "center" | "end" }) {
  const e = EVIDENCE[evidence.label];
  const cited = evidence.sourceIds.flatMap((id) => (sources.has(id) ? [sources.get(id)!] : []));
  return (
    <HoverCard
      label={`Evidence: ${e.label}. Show details`}
      align={align}
      trigger={
        <span className={`inline-flex items-center gap-1 text-xs font-medium ${e.text}`}>
          <span className={`size-1.5 rounded-full ${e.dot}`} aria-hidden />
          {e.label}
          {cited.length > 0 && <span className="font-normal text-muted">· {cited.length} source{cited.length > 1 ? "s" : ""}</span>}
        </span>
      }
    >
      <span className="block font-medium">{e.label}</span>
      <span className="block text-surface/75">{e.meaning}.</span>
      {evidence.note && <span className="mt-2 block">{evidence.note}</span>}
      {cited.length > 0 && (
        <span className="mt-2 block space-y-1 border-t border-surface/15 pt-2">
          {cited.map((s) => (
            <a key={s.n} href={s.url} target="_blank" rel="noreferrer" className="block truncate underline decoration-surface/30 underline-offset-2 hover:decoration-surface">
              [{s.n}] {s.title}
            </a>
          ))}
        </span>
      )}
    </HoverCard>
  );
}

export function EvidenceLegend() {
  return (
    <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
      {Object.values(EVIDENCE).map((e) => (
        <li key={e.label} className="flex items-center gap-2">
          <span className={`size-2 rounded-full ${e.dot}`} aria-hidden />
          <span className={`font-medium ${e.text}`}>{e.label}</span>
          <span className="text-muted">{e.meaning}</span>
        </li>
      ))}
    </ul>
  );
}
