// Validates every curated guide against the schema and checks that each
// evidence.sourceIds entry points at a real source. Usage: npm run validate [file...]
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { StoredGuide } from "../src/lib/guide-schema";

const dir = join(__dirname, "../src/data/guides");
const files = process.argv.slice(2).length
  ? process.argv.slice(2)
  : readdirSync(dir).filter((f) => f.endsWith(".json")).map((f) => join(dir, f));

let failed = false;
for (const file of files) {
  const parsed = StoredGuide.safeParse(JSON.parse(readFileSync(file, "utf8")));
  if (!parsed.success) {
    failed = true;
    console.error(`✗ ${file}\n${parsed.error.issues.map((i) => `  ${i.path.join(".")}: ${i.message}`).join("\n")}`);
    continue;
  }
  const literal = JSON.stringify(parsed.data).match(/":"(null|undefined|NaN)"/g);
  if (literal) {
    failed = true;
    console.error(`✗ ${file}: literal ${[...new Set(literal)].join(", ")} text where a value should be`);
    continue;
  }
  const ids = new Set(parsed.data.sources.map((s) => s.id));
  const dangling = [...JSON.stringify(parsed.data).matchAll(/"sourceIds":\[([^\]]*)\]/g)]
    .flatMap((m) => (m[1] ? JSON.parse(`[${m[1]}]`) : []))
    .filter((id: string) => !ids.has(id));
  if (dangling.length) {
    failed = true;
    console.error(`✗ ${file}: unknown sourceIds ${[...new Set(dangling)].join(", ")}`);
  } else {
    console.log(`✓ ${file}`);
  }
}
process.exit(failed ? 1 : 0);
