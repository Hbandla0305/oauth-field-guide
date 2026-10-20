// Read-only security check of the Neon database: who the app connects as, what that role can do,
// TLS, row-level security, schemas, and what personal data is stored. Usage: npm run db-security-check
import { neon } from "@neondatabase/serverless";

async function main() {
  const url = new URL(process.env.DATABASE_URL!);
  const sql = neon(process.env.DATABASE_URL!);
  console.log("Connection: host", url.hostname.replace(/^[^.]+/, "<endpoint>"), "| sslmode", url.searchParams.get("sslmode"), "| pooled", url.hostname.includes("-pooler"));
  const [role] = await sql`select current_user, rolsuper, rolcreaterole, rolcreatedb, rolbypassrls, rolreplication from pg_roles where rolname = current_user`;
  console.log("App role:", role);
  const [ssl] = await sql`select ssl, version as tls from pg_stat_ssl where pid = pg_backend_pid()`;
  console.log("This session over TLS:", ssl);
  console.log("Schemas:", (await sql`select nspname from pg_namespace where nspname not like 'pg_%' and nspname <> 'information_schema' order by 1`).map((r) => r.nspname).join(", "));
  console.log("Tables + RLS:", await sql`select schemaname, tablename, rowsecurity from pg_tables where schemaname not in ('pg_catalog','information_schema') order by 1,2`);
  console.log("Roles that can log in:", (await sql`select rolname from pg_roles where rolcanlogin order by 1`).map((r) => r.rolname).join(", "));
  console.log("Grants on app tables:", await sql`select grantee, table_name, string_agg(privilege_type, ',' order by privilege_type) as privs from information_schema.role_table_grants where table_schema='public' group by 1,2 order by 1,2`);
  console.log("Public schema CREATE for PUBLIC:", (await sql`select has_schema_privilege('public', 'public', 'CREATE') as v`)[0].v);
  const cols = await sql`select table_name, column_name from information_schema.columns where table_schema='public' order by 1, ordinal_position`;
  console.log("Stored columns:", cols.map((c) => `${c.table_name}.${c.column_name}`).join(", "));
  const [counts] = await sql`select (select count(*) from guides) as guides, (select count(*) from runs) as runs, (select count(*) from runs where ip_hash ~ '^[0-9a-f]{32}$') as hashed_ips`;
  console.log("Rows:", counts);
  const [ext] = await sql`select string_agg(extname, ', ') as e from pg_extension`;
  console.log("Extensions:", ext.e);
}
main().catch((e) => console.error("ERR", e.message));
