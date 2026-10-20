// Writes a one-page human review checklist for a guide: the claims that matter most, each with
// its sources. A person marks each row, then `npm run mark-reviewed -- <slug>` records the result.
// Usage: npm run review-sheet -- <slug> [more slugs]
import { readFileSync, writeFileSync } from "node:fs";
import { StoredGuide, type Evidence } from "../src/lib/guide-schema";

for (const slug of process.argv.slice(2)) {
  if (!/^[a-z0-9-]+$/.test(slug)) throw new Error(`Not a guide slug: ${slug}`);
  const g = StoredGuide.parse(JSON.parse(readFileSync(`src/data/guides/${slug}.json`, "utf8")));
  const idx = new Map(g.sources.map((s, i) => [s.id, { n: i + 1, url: s.url }]));
  const src = (e: Evidence) =>
    e.sourceIds.flatMap((id) => (idx.has(id) ? [`[${idx.get(id)!.n}](${idx.get(id)!.url})`] : [])).join(" ") || "(no source)";
  const rows: [string, string, Evidence][] = [
    ["Time to a working dev app", g.verdict.timeToDev.range, g.verdict.timeToDev.evidence],
    ["Time until any user can connect", `${g.verdict.timeToProd.range}. ${g.verdict.timeToProd.assumes}`, g.verdict.timeToProd.evidence],
    ...g.scopeTiers.map((t): [string, string, Evidence] => [`Permission tier: ${t.tier}`, `${t.reviewRequired ? "Review required" : "No review"}, ${t.time}. e.g. ${t.examples.slice(0, 3).join(", ")}`, t.evidence]),
    ...g.prerequisites.slice(0, 3).map((p): [string, string, Evidence] => [`Requirement: ${p.item}`, p.why, p.evidence]),
    ...g.blockers.slice(0, 3).map((b): [string, string, Evidence] => [`Blocker: ${b.symptom}`, `${b.cause} Fix: ${b.fix}`, b.evidence]),
  ];
  const clean = (s: string) => s.replace(/\|/g, "\\|").replace(/\n/g, " ");
  const md = [
    `# Human review: ${g.app.name}`,
    "",
    `Guide: https://oauth-field-guide.vercel.app/guides/${slug} · researched ${g.verification.lastChecked}`,
    "",
    "Open each source, check the claim against it (or against your own setup attempt), and fill in the last two columns.",
    "**Result:** ✅ confirmed · ✏️ corrected (write the correct text in Notes) · ❓ couldn't verify. **How:** `source` (read the docs) or `tested` (saw it yourself in the console).",
    "",
    "Reviewer: ___________ · Date: ____-__-__",
    "",
    "| # | Claim | What the guide says | Sources | Result | How | Notes |",
    "|---|---|---|---|---|---|---|",
    ...rows.map(([claim, says, e], i) => `| ${i + 1} | ${clean(claim)} | ${clean(says)} | ${src(e)} | | | |`),
    "",
  ].join("\n");
  writeFileSync(`docs/human-review/${slug}.md`, md);
  console.log(`docs/human-review/${slug}.md (${rows.length} claims)`);
}
