// Prints the spend ledger: every live run, what it cost, and the total against the cap.
import { neon } from "@neondatabase/serverless";
import { LIMITS } from "../src/lib/agent/config";

async function main() {
  const sql = neon(process.env.DATABASE_URL!);
  const runs = await sql`select created_at, input, slug, status, reserved_usd, actual_usd from runs order by created_at`;
  for (const r of runs) console.log(new Date(r.created_at).toISOString().slice(0, 16), r.status.padEnd(8), `$${Number(r.actual_usd ?? r.reserved_usd).toFixed(4)}`, r.input);
  const total = runs.reduce((s, r) => s + Number(r.actual_usd ?? r.reserved_usd), 0);
  console.log(`\nTotal $${total.toFixed(4)} of $${LIMITS.totalBudgetUsd} cap (${runs.length} runs)`);
}
main();
