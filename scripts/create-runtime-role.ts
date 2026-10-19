// Creates a least-privilege Postgres role for the running app (security review M5). The app then
// connects as this role instead of the database owner: it can read and write the two tables it
// uses, and nothing else (no DDL, no DELETE, no other schemas).
//
// Run once with the OWNER connection: npm run create-runtime-role
// It prints the new connection string to a local file (gitignored) for you to paste into Vercel's
// DATABASE_URL (Production). It never prints the password to the terminal.
import { neon } from "@neondatabase/serverless";
import { randomBytes } from "node:crypto";
import { writeFileSync } from "node:fs";

async function main() {
  const ownerUrl = process.env.DATABASE_URL;
  if (!ownerUrl) throw new Error("Set DATABASE_URL to the owner connection string");
  const sql = neon(ownerUrl);
  const password = randomBytes(24).toString("base64url");
  const exists = await sql`select 1 from pg_roles where rolname = 'app_runtime'`;
  // Identifiers and passwords can't be bind parameters in DDL; the password is generated here, not user input.
  await sql.query(exists.length ? `alter role app_runtime with login password '${password}'` : `create role app_runtime login password '${password}' connection limit 20`);
  for (const stmt of [
    "alter role app_runtime set statement_timeout = '20s'",
    "alter role app_runtime set idle_in_transaction_session_timeout = '10s'",
    "revoke all on schema public from app_runtime",
    "grant usage on schema public to app_runtime",
    "revoke all on all tables in schema public from app_runtime",
    "grant select, insert, update on public.guides, public.runs to app_runtime",
    "revoke create on schema public from public",
  ]) {
    await sql.query(stmt);
  }
  const url = new URL(ownerUrl);
  url.username = "app_runtime";
  url.password = password;
  writeFileSync(".env.runtime-role.local", `DATABASE_URL=${url.toString()}\n`);
  console.log("Created app_runtime. Its connection string is in .env.runtime-role.local (gitignored).");
  console.log("Next: paste it into Vercel → Settings → Environment Variables → DATABASE_URL (Production), then redeploy.");
}
main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
