// Prints a generated guide's verdict, sources and evidence mix. Usage: npm run inspect -- <slug>
import { neon } from "@neondatabase/serverless";

async function main() {
  const slug = process.argv[2];
  const sql = neon(process.env.DATABASE_URL!);
  const rows = await sql`select guide, cost_usd from guides where slug = ${slug}`;
  if (!rows.length) return console.log(`No generated guide for "${slug}"`);
  const g = rows[0].guide;
  const labels: Record<string, number> = {};
  (JSON.stringify(g).match(/"label":"(\w+)"/g) ?? []).forEach((l) => (labels[l.slice(9, -1)] = (labels[l.slice(9, -1)] ?? 0) + 1));
  console.log(`${g.app.name}: ${g.verdict.difficulty} | dev ${g.verdict.timeToDev.range} | any user ${g.verdict.timeToProd.range} | cost $${Number(rows[0].cost_usd).toFixed(4)}`);
  console.log(g.verdict.summary);
  console.log(`steps ${g.steps.length}, blockers ${g.blockers.length}, evidence`, labels);
  for (const s of g.sources) console.log(` ${s.id} ${s.url}`);
  console.log("open questions:", g.verification.openQuestions);
}
main();
