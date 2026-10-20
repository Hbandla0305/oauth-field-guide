import type { Evidence, Guide } from "./guide-schema";
import { cleanCost } from "./cost";

const OWNER = { agent: "AI can help", human: "You (Developer)", wait: "Provider review" } as const;

// Model-written text can't carry its own links or images into the export: brackets are escaped,
// so only the links we add (official docs, sources) are clickable.
const plain = (t: string) => t.replace(/([[\]!<>])/g, "\\$1");

// Plain-Markdown export so a guide can be pasted into a ticket, doc or Slack thread.
export function guideToMarkdown(g: Guide, url: string): string {
  const t = escapeText(g);
  const idx = new Map(g.sources.map((s, i) => [s.id, i + 1]));
  const ev = (e: Evidence) => {
    const cites = e.sourceIds.filter((id) => idx.has(id)).map((id) => `[${idx.get(id)}]`).join("");
    return ` _(${e.label}${cites ? ` ${cites}` : ""})_`;
  };
  const v = t.verdict;
  const lines = [
    `# ${t.app.name}: OAuth app setup guide`,
    "",
    `**Difficulty:** ${v.difficulty} · **Working in dev:** ${v.timeToDev.range} · **Any user can connect:** ${v.timeToProd.range} (${v.timeToProd.assumes} Waiting on: ${v.timeToProd.waitingOn})${cleanCost(v.cost) ? ` · **Cost:** ${cleanCost(v.cost)}` : ""}`,
    "",
    v.summary,
    "",
    `> ${t.verification.status === "human-verified" ? "Human-verified" : "Agent-generated, not human-reviewed"} · last checked ${t.verification.lastChecked} · ${url}`,
    "",
    "## Official docs",
    ...g.officialDocs.filter((d) => /^https:\/\//.test(d.url)).map((d) => `- [${d.label.replace(/[[\]()]/g, "")}](${d.url})`),
    "",
    "## What you need first",
    ...t.prerequisites.map((p) => `- **${p.item}**: ${p.why}${ev(p.evidence)}`),
    "",
    "## Permission tiers",
    ...t.scopeTiers.map((t) => `- **${t.tier}**${t.reviewRequired ? " (review required)" : ""}, ${t.time}: ${t.impact} Examples: ${t.examples.map((x) => `\`${x}\``).join(", ")}${ev(t.evidence)}`),
    "",
    "## Steps",
    ...t.steps.map((s, i) => `${i + 1}. **${s.title}** [${OWNER[s.owner]}${s.duration ? `, ${s.duration}` : ""}]: ${s.detail}${s.url ? ` (${s.url})` : ""}${ev(s.evidence)}`),
    "",
    "## Who does what",
    "**AI can help:**",
    ...t.agentCanDo.map((x) => `- ${x}`),
    "",
    "**You (Developer) must:**",
    ...t.humanMustDo.map((x) => `- ${x}`),
    "",
    "## If you get stuck",
    ...t.blockers.map((b) => `- **${b.symptom}**: ${b.cause} Fix: ${b.fix}${ev(b.evidence)}`),
    "",
    "## Good to know",
    ...t.nuances.map((n) => `- ${n.text}${ev(n.evidence)}`),
    "",
    "## Still uncertain",
    ...(t.verification.openQuestions.length ? t.verification.openQuestions.map((q) => `- ${q}`) : ["- Nothing outstanding."]),
    "",
    "## Sources",
    ...g.sources.map((s, i) => (/^https:\/\//.test(s.url) ? `${i + 1}. [${s.title.replace(/[[\]()]/g, "")}](${s.url})` : `${i + 1}. ${s.title.replace(/[[\]()]/g, "")}`)),
  ];
  return lines.join("\n");
}

// Every string the model wrote, escaped; URLs and identifiers stay as they are.
function escapeText<T>(x: T, key = ""): T {
  if (typeof x === "string") return (["url", "slug", "label", "status", "owner", "difficulty", "lastChecked"].includes(key) ? x : plain(x)) as T;
  if (Array.isArray(x)) return x.map((v) => escapeText(v, key)) as T;
  if (x && typeof x === "object") return Object.fromEntries(Object.entries(x).map(([k, v]) => [k, k === "sourceIds" ? v : escapeText(v, k)])) as T;
  return x;
}
