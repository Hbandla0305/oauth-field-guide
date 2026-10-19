import type { Evidence } from "@/lib/guide-schema";

export const EVIDENCE = {
  tested: { label: "Tested", meaning: "Observed directly in a setup attempt or live check", dot: "bg-tested", text: "text-tested" },
  sourced: { label: "Sourced", meaning: "Stated in a cited source", dot: "bg-sourced", text: "text-sourced" },
  inferred: { label: "Inferred", meaning: "Reasoned from sources, not stated outright", dot: "bg-inferred", text: "text-inferred" },
  unverified: { label: "Unverified", meaning: "Not confirmed; check before relying on it", dot: "bg-unverified", text: "text-unverified" },
} as const;

// Inline evidence marker: a coloured label plus numbered citations that jump to the source list.
// Notes are shown inline only where they explain uncertainty; otherwise they're a tooltip.
export function EvidenceTag({ evidence, sourceIndex, showNote }: { evidence: Evidence; sourceIndex: Map<string, number>; showNote?: boolean }) {
  const e = EVIDENCE[evidence.label];
  const cites = evidence.sourceIds.filter((id) => sourceIndex.has(id));
  const noteInline = evidence.note && (showNote || evidence.label === "inferred" || evidence.label === "unverified");
  return (
    <span className="inline-flex flex-wrap items-center gap-x-1.5 text-xs leading-5">
      <span className={`inline-flex items-center gap-1 font-medium ${e.text}`} title={evidence.note ?? e.meaning}>
        <span className={`size-1.5 rounded-full ${e.dot}`} aria-hidden />
        {e.label}
      </span>
      {cites.map((id) => (
        <a key={id} href={`#source-${id}`} className="text-muted underline decoration-line underline-offset-2 hover:text-cobalt" aria-label={`Source ${sourceIndex.get(id)}`}>
          [{sourceIndex.get(id)}]
        </a>
      ))}
      {noteInline && <span className="basis-full text-muted">{evidence.note}</span>}
    </span>
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
