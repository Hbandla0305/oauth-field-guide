// Recent live runs with cost and Firecrawl credits. Usage: npm run runs
import { neon } from "@neondatabase/serverless";
async function main() {
  const rows = await neon(process.env.DATABASE_URL!)`select created_at, kind, status, actual_usd, firecrawl_credits, input from runs order by created_at desc limit 15`;
  for (const r of rows) console.log(new Date(r.created_at).toISOString().slice(5, 16), r.kind.padEnd(8), r.status.padEnd(8), `$${Number(r.actual_usd ?? 0).toFixed(4)}`, `${r.firecrawl_credits}cr`, r.input);
}
main();
