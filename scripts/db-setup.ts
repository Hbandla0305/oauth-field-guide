// Creates the tables used for generated guides and the spend ledger. Usage: npm run db:setup
import { neon } from "@neondatabase/serverless";
import { SCHEMA } from "../src/lib/db";

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("Set DATABASE_URL (e.g. in .env.local) first");
  const sql = neon(process.env.DATABASE_URL);
  for (const statement of SCHEMA) await sql.query(statement);
  const [{ total }] = await sql`select coalesce(sum(coalesce(actual_usd, reserved_usd)), 0) as total from runs`;
  console.log(`Tables ready. Spend so far: $${Number(total).toFixed(4)}`);
}
main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
