import type { Evidence, Guide } from "./guide-schema";
import { cleanCost } from "./cost";

const OWNER = { agent: "AI can help", human: "You (Developer)", wait: "Provider review" } as const;

// Plain-Markdown export so a guide can be pasted into a ticket, doc or Slack thread.
export function guideToMarkdown(g: Guide, url: string): string {
  const idx = new Map(g.sources.map((s, i) => [s.id, i + 1]));
  const ev = (e: Evidence) => {
    const cites = e.sourceIds.filter((id) => idx.has(id)).map((id) => `[${idx.get(id)}]`).join("");
    return ` _(${e.label}${cites ? ` ${cites}` : ""})_`;
  };
  const v = g.verdict;
  const lines = [
    `# ${g.app.name}: OAuth app setup guide`,
    "",
    `**Difficulty:** ${v.difficulty} · **Working in dev:** ${v.timeToDev.range} · **Any user can connect:** ${v.timeToProd.range} (${v.timeToProd.assumes} Waiting on: ${v.timeToProd.waitingOn})${cleanCost(v.cost) ? ` · **Cost:** ${cleanCost(v.cost)}` : ""}`,
    "",
    v.summary,
    "",
    `> ${g.verification.status === "human-verified" ? "Human-verified" : "Agent-generated, not human-reviewed"} · last checked ${g.verification.lastChecked} · ${url}`,
    "",
    "## Official docs",
    ...g.officialDocs.filter((d) => /^https:\/\//.test(d.url)).map((d) => `- [${d.label.replace(/[[\]()]/g, "")}](${d.url})`),
    "",
    "## What you need first",
    ...g.prerequisites.map((p) => `- **${p.item}**: ${p.why}${ev(p.evidence)}`),
    "",
    "## Permission tiers",
    ...g.scopeTiers.map((t) => `- **${t.tier}**${t.reviewRequired ? " (review required)" : ""}, ${t.time}: ${t.impact} Examples: ${t.examples.map((x) => `\`${x}\``).join(", ")}${ev(t.evidence)}`),
    "",
    "## Steps",
    ...g.steps.map((s, i) => `${i + 1}. **${s.title}** [${OWNER[s.owner]}${s.duration ? `, ${s.duration}` : ""}]: ${s.detail}${s.url ? ` (${s.url})` : ""}${ev(s.evidence)}`),
    "",
    "## Who does what",
    "**AI can help:**",
    ...g.agentCanDo.map((x) => `- ${x}`),
    "",
    "**You (Developer) must:**",
    ...g.humanMustDo.map((x) => `- ${x}`),
    "",
    "## If you get stuck",
    ...g.blockers.map((b) => `- **${b.symptom}**: ${b.cause} Fix: ${b.fix}${ev(b.evidence)}`),
    "",
    "## Good to know",
    ...g.nuances.map((n) => `- ${n.text}${ev(n.evidence)}`),
    "",
    "## Still uncertain",
    ...(g.verification.openQuestions.length ? g.verification.openQuestions.map((q) => `- ${q}`) : ["- Nothing outstanding."]),
    "",
    "## Sources",
    ...g.sources.map((s, i) => (/^https:\/\//.test(s.url) ? `${i + 1}. [${s.title.replace(/[[\]()]/g, "")}](${s.url})` : `${i + 1}. ${s.title.replace(/[[\]()]/g, "")}`)),
  ];
  return lines.join("\n");
}
