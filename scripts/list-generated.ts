// Lists generated guides in the database. Usage: npm run generated
import { neon } from "@neondatabase/serverless";
async function main() {
  const sql = neon(process.env.DATABASE_URL!);
  const rows = await sql`select slug, input, cost_usd, created_at, guide->'app'->>'name' as name from guides order by created_at`;
  for (const r of rows) console.log(r.slug.padEnd(28), String(r.name).padEnd(40), `input="${r.input}"`, `$${Number(r.cost_usd).toFixed(4)}`);
}
main();
