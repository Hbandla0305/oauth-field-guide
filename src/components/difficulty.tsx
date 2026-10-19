import type { Difficulty } from "@/lib/guide-schema";

export const DIFFICULTY: Record<Difficulty, { label: string; meaning: string; badge: string; bar: string }> = {
  trivial: {
    label: "Trivial",
    meaning: "Self-serve, no review",
    badge: "bg-trivial-bg text-trivial",
    bar: "bg-trivial",
  },
  moderate: {
    label: "Moderate",
    meaning: "Self-serve, with limits or optional review",
    badge: "bg-moderate-bg text-moderate",
    bar: "bg-moderate",
  },
  hard: {
    label: "Hard",
    meaning: "Mandatory review before most users can connect",
    badge: "bg-hard-bg text-hard",
    bar: "bg-hard",
  },
  gated: {
    label: "Gated",
    meaning: "Useful APIs need partner approval",
    badge: "bg-gated-bg text-gated",
    bar: "bg-gated",
  },
};

export function DifficultyBadge({ difficulty }: { difficulty: Difficulty }) {
  const d = DIFFICULTY[difficulty];
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-sm font-medium ${d.badge}`} title={d.meaning}>
      {d.label}
    </span>
  );
}
