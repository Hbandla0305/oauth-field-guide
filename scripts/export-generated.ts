// Saves a generated guide to a file, e.g. before regenerating it. Usage: npm run export-generated -- <slug> <file>
import { neon } from "@neondatabase/serverless";
import { writeFileSync } from "node:fs";
async function main() {
  const [slug, file] = process.argv.slice(2);
  const rows = await neon(process.env.DATABASE_URL!)`select guide from guides where slug = ${slug}`;
  if (!rows.length) throw new Error(`No generated guide ${slug}`);
  writeFileSync(file, JSON.stringify(rows[0].guide, null, 2) + "\n");
  console.log(`Saved ${slug} to ${file}`);
}
main();
