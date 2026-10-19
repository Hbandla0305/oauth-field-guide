// Plain-text views of a guide for tools (MCP, Slack): one section at a time keeps answers short.
import type { Evidence, Guide } from "./guide-schema";

export const SECTIONS = ["summary", "steps", "permissions", "good_to_know", "troubleshoot", "resources", "all"] as const;
export type Section = (typeof SECTIONS)[number];

const OWNER = { agent: "AI can help", human: "You (Developer)", wait: "Provider review" } as const;

export function guideSection(g: Guide, section: Section, url: string): string {
  const idx = new Map(g.sources.map((s, i) => [s.id, i + 1]));
  const ev = (e: Evidence) => {
    const cites = e.sourceIds.filter((id) => idx.has(id)).map((id) => `[${idx.get(id)}]`).join("");
    return ` (${e.label}${cites ? ` ${cites}` : ""})`;
  };
  const v = g.verdict;
  const status =
    g.verification.status === "human-verified"
      ? `Checked by a person${g.verification.reviewedOn ? ` on ${g.verification.reviewedOn}` : ""}`
      : g.verification.status === "agent-generated"
        ? "Written live by an agent, not reviewed by a person"
        : "Agent-researched, not yet reviewed by a person";

  const parts: Record<Exclude<Section, "all">, string[]> = {
    summary: [
      `${g.app.name}: ${v.difficulty.toUpperCase()}`,
      v.summary,
      `Working in dev: ${v.timeToDev.range}${ev(v.timeToDev.evidence)}`,
      `Any user can connect: ${v.timeToProd.range}${ev(v.timeToProd.evidence)}. Assumes: ${v.timeToProd.assumes}`,
      `Waiting on: ${v.timeToProd.waitingOn}`,
      `Cost: ${v.cost ?? "None"}`,
      `Who does what: ${g.steps.filter((s) => s.owner === "agent").length} steps AI can help with, ${g.steps.filter((s) => s.owner === "human").length} for you, ${g.steps.filter((s) => s.owner === "wait").length} provider review.`,
      `${status}. Researched ${g.verification.lastChecked}.`,
    ],
    steps: ["Steps:", ...g.steps.map((s, i) => `${i + 1}. ${s.title} [${OWNER[s.owner]}${s.duration ? `, ${s.duration}` : ""}]: ${s.detail}${s.url ? ` ${s.url}` : ""}${ev(s.evidence)}`)],
    permissions: [
      "Permission tiers (ask for the lowest tier you need):",
      ...g.scopeTiers.map((t) => `- ${t.tier}: ${t.reviewRequired ? "review required" : "no review"}, ${t.time}. Scopes: ${t.examples.join(", ")}. ${t.impact}${ev(t.evidence)}`),
    ],
    good_to_know: ["Good to know:", ...g.nuances.map((n) => `- ${n.text}${ev(n.evidence)}`)],
    troubleshoot: ["Known problems:", ...g.blockers.map((b) => `- ${b.symptom}\n  Why: ${b.cause}\n  Fix: ${b.fix}${ev(b.evidence)}`)],
    resources: [
      "Official docs:",
      ...g.officialDocs.map((d) => `- ${d.label}: ${d.url}`),
      `Still uncertain: ${g.verification.openQuestions.join("; ") || "nothing outstanding"}`,
      "Sources:",
      ...g.sources.map((s, i) => `[${i + 1}] ${s.title} ${s.url}`),
    ],
  };

  const body = section === "all" ? Object.values(parts).map((p) => p.join("\n")).join("\n\n") : parts[section].join("\n");
  return `${body}\n\nFull guide: ${url}`;
}
