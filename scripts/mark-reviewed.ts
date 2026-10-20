// Records a completed human review: reads docs/human-review/<slug>.md, refuses if any row is
// unmarked or the reviewer/date is missing, adds ✏️ rows to the guide's corrections, and marks the
// guide as checked by a person. Usage: npm run mark-reviewed -- <slug>
import { readFileSync, writeFileSync } from "node:fs";

const slug = process.argv[2];
if (!/^[a-z0-9-]+$/.test(slug ?? "")) throw new Error("Usage: npm run mark-reviewed -- <slug> (lowercase letters, digits and dashes)");
const sheet = readFileSync(`docs/human-review/${slug}.md`, "utf8");
const reviewer = sheet.match(/Reviewer:\s*([^·\n]+?)\s*·/)?.[1]?.replace(/_+/g, "").trim();
const date = sheet.match(/Date:\s*(\d{4}-\d{2}-\d{2})/)?.[1];
if (!reviewer || !date) throw new Error("Fill in Reviewer and Date (YYYY-MM-DD) at the top of the sheet first.");

const rows = sheet.split("\n").filter((l) => /^\| \d+ \|/.test(l)).map((l) => l.split(/(?<!\\)\|/).map((c) => c.trim()));
const unmarked = rows.filter((r) => !/[✅✏️❓]/u.test(r[5] ?? ""));
if (unmarked.length) throw new Error(`Rows still unmarked: ${unmarked.map((r) => r[1]).join(", ")}`);

const path = `src/data/guides/${slug}.json`;
const g = JSON.parse(readFileSync(path, "utf8"));
const corrections = rows
  .filter((r) => r[5].includes("✏"))
  .map((r) => ({ claim: r[2], before: r[3], after: r[7] || "(see review sheet)", source: (r[4].match(/\((https:[^)]+)\)/) ?? [])[1] ?? `https://oauth-field-guide.vercel.app/guides/${slug}` }));
const tested = rows.filter((r) => /tested/i.test(r[6])).map((r) => `Checked by ${reviewer} on ${date}: ${r[2]}`);

g.verification.status = "human-verified";
g.verification.reviewedOn = date;
g.verification.corrections = [...(g.verification.corrections ?? []), ...corrections];
g.verification.tested = [...g.verification.tested, ...tested];
writeFileSync(path, JSON.stringify(g, null, 2) + "\n");
const counts = { confirmed: rows.filter((r) => r[5].includes("✅")).length, corrected: corrections.length, unverified: rows.filter((r) => r[5].includes("❓")).length };
console.log(`${slug} marked as checked by a person (${reviewer}, ${date}).`, counts, "Apply each ✏️ correction to the guide text too, then npm run validate.");
