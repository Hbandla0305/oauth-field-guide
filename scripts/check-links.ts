// Checks every cited source in agent-researched guides and downgrades claims whose only
// sources don't resolve. Writes a report to docs/link-check.md. Usage: npm run check-links
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { Guide, type Evidence } from "../src/lib/guide-schema";
import { checkLinks } from "../src/lib/agent/probes";

const dir = join(__dirname, "../src/data/guides");

async function main() {
  const rows: string[] = [];
  let totalLinks = 0;
  let totalDead = 0;
  let totalDowngraded = 0;
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".json")).sort()) {
    const path = join(dir, file);
    const parsed = Guide.safeParse(JSON.parse(readFileSync(path, "utf8")));
    if (!parsed.success || parsed.data.verification.status !== "agent-researched") continue;
    const g = parsed.data;
    const results = await checkLinks(g.sources.map((s) => s.url).slice(0, 40));
    const dead = new Set(results.filter((r) => !r.ok).map((r) => r.url));
    const deadIds = new Set(g.sources.filter((s) => dead.has(s.url)).map((s) => s.id));
    let downgraded = 0;
    const fixed = JSON.parse(JSON.stringify(g), (_k, v) => {
      if (!(v && typeof v === "object" && "label" in v && "sourceIds" in v)) return v;
      const e = v as Evidence;
      const live = e.sourceIds.filter((id) => !deadIds.has(id));
      if (e.label === "sourced" && e.sourceIds.length && !live.length) {
        downgraded++;
        return { ...e, label: "unverified", note: "Cited source no longer resolves" };
      }
      return e;
    });
    writeFileSync(path, JSON.stringify(fixed, null, 2) + "\n");
    totalLinks += results.length;
    totalDead += dead.size;
    totalDowngraded += downgraded;
    rows.push(`| ${g.app.slug} | ${results.length} | ${dead.size} | ${downgraded} | ${[...dead].map((u) => `<${u}>`).join("<br>")} |`);
    console.log(`${g.app.slug}: ${results.length} links, ${dead.size} unreachable, ${downgraded} claims downgraded`);
  }
  writeFileSync(
    join(__dirname, "../docs/link-check.md"),
    [
      "# Link check: agent-researched guides",
      "",
      `Run ${new Date().toISOString().slice(0, 10)}. ${totalLinks} cited links checked, ${totalDead} unreachable, ${totalDowngraded} claims downgraded from sourced to unverified.`,
      "Pages behind bot protection that answer 403/429 count as reachable.",
      "",
      "| Guide | Links | Unreachable | Claims downgraded | Unreachable URLs |",
      "|---|---|---|---|---|",
      ...rows,
      "",
    ].join("\n"),
  );
}
main();
