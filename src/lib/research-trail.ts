// The "How this guide was made" timeline. Live-agent guides carry the log recorded during their
// run; library guides get a trail built from what we know about how they were made.
import type { Guide, ResearchLog } from "./guide-schema";

// Guides checked by the independent fact-check agent (docs/verification-desk.md), with what it changed.
const FACT_CHECKED: Record<string, string[]> = {
  google: ["Softened “CASA is needed only if data touches your servers” to “applies when”, matching Google's wording"],
  slack: ["Existing installs exempt from the new rate limits: unverified → sourced (official changelog found)"],
  github: ["Expiring OAuth App tokens by default: added the 2026-08-14 GitHub changelog as the source"],
  linkedin: ["“Every app must be associated with a Page” → “required for certain products”", "“Approval is unlikely” relabelled inferred: it's a judgement, not a documented fact"],
  hubspot: ["“Only through the CLI” → “legacy UI creation disabled; the CLI is the documented path”", "Difficulty hard → moderate in editorial review: 25 accounts can connect on day one"],
  notion: ["No changes needed: no review for public connections, 5–10 business day listing review and rotating refresh tokens all confirmed"],
};

const host = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
};

export function researchTrail(g: Guide): ResearchLog {
  if (g.researchLog?.length) return g.researchLog;

  const hosts = [...new Set(g.sources.map((s) => host(s.url)))];
  const trail: ResearchLog = [
    {
      step: "read",
      title: "Researched by an AI research agent",
      details: [
        "Followed the shared research brief: official docs first, every claim labelled tested, sourced, inferred or unverified, no absolutes the sources don't use.",
        `Read and cited ${g.sources.length} sources across ${hosts.length} site${hosts.length === 1 ? "" : "s"}: ${hosts.slice(0, 6).join(", ")}${hosts.length > 6 ? "…" : ""}`,
      ],
    },
  ];
  if (g.verification.tested.length) {
    trail.push({ step: "attempt", title: "Ran live checks, logged out", details: g.verification.tested });
  }
  const fixes = FACT_CHECKED[g.app.slug];
  if (fixes) {
    trail.push({
      step: "audit",
      title: "Fact-checked by a second AI agent",
      details: ["Told to assume the researcher was wrong and re-check high-stakes claims against primary sources fetched fresh.", ...fixes],
    });
  }
  if (g.verification.openQuestions.length) {
    trail.push({
      step: "dig",
      title: `Left ${g.verification.openQuestions.length} question${g.verification.openQuestions.length === 1 ? "" : "s"} open`,
      details: ["Things the sources didn't settle. They're listed under “Still uncertain” below rather than guessed."],
    });
  }
  return trail;
}
