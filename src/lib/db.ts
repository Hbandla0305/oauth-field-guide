import { neon } from "@neondatabase/serverless";
import { createHash } from "node:crypto";
import { Guide } from "./guide-schema";
import { LIMITS } from "./agent/config";

function sql() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set");
  return neon(process.env.DATABASE_URL);
}

export const SCHEMA = [
  `create table if not exists guides (
     slug text primary key,
     guide jsonb not null,
     input text not null,
     cost_usd numeric(10,6) not null default 0,
     created_at timestamptz not null default now()
   )`,
  // One row per live run. Spend is the sum of actual cost for settled runs
  // plus the reservation for runs still in flight (or that crashed).
  `create table if not exists runs (
     id uuid primary key default gen_random_uuid(),
     ip_hash text not null,
     input text not null,
     slug text,
     status text not null default 'running',
     reserved_usd numeric(10,6) not null,
     actual_usd numeric(10,6),
     error text,
     created_at timestamptz not null default now()
   )`,
  `create index if not exists runs_ip_time on runs (ip_hash, created_at)`,
];

export function hashIp(ip: string): string {
  return createHash("sha256").update(`${process.env.IP_HASH_SALT ?? "dev"}:${ip}`).digest("hex").slice(0, 32);
}

export async function getGeneratedGuide(slug: string): Promise<Guide | null> {
  if (!process.env.DATABASE_URL) return null;
  const rows = await sql()`select guide from guides where slug = ${slug}`;
  if (!rows.length) return null;
  const parsed = Guide.safeParse(rows[0].guide);
  return parsed.success ? parsed.data : null;
}

export async function listGeneratedGuides(limit = 12): Promise<Guide[]> {
  if (!process.env.DATABASE_URL) return [];
  const rows = await sql()`select guide from guides order by created_at desc limit ${limit}`;
  return rows.flatMap((r) => {
    const parsed = Guide.safeParse(r.guide);
    return parsed.success ? [parsed.data] : [];
  });
}

export async function saveGuide(guide: Guide, input: string, costUsd: number) {
  await sql()`
    insert into guides (slug, guide, input, cost_usd) values (${guide.app.slug}, ${JSON.stringify(guide)}, ${input}, ${costUsd})
    on conflict (slug) do update set guide = excluded.guide, input = excluded.input, cost_usd = excluded.cost_usd, created_at = now()`;
}

export type Reservation =
  | { ok: true; runId: string }
  | { ok: false; reason: "budget" | "ip_rate" | "daily_rate" };

// Reserves worst-case spend for one run. The advisory lock serialises concurrent
// reservations so two requests can't both squeeze under the cap.
export async function reserveRun(ipHash: string, input: string): Promise<Reservation> {
  const db = sql();
  const [, result] = await db.transaction([
    db`select pg_advisory_xact_lock(7203)`,
    db`
      with spend as (
        select coalesce(sum(coalesce(actual_usd, reserved_usd)), 0) as total from runs
      ), ip as (
        select count(*) as n from runs where ip_hash = ${ipHash} and created_at > now() - interval '1 hour'
      ), day as (
        select count(*) as n from runs where created_at > now() - interval '1 day'
      ), ins as (
        insert into runs (ip_hash, input, reserved_usd)
        select ${ipHash}, ${input}, ${LIMITS.reservePerRunUsd}
        from spend, ip, day
        where spend.total + ${LIMITS.reservePerRunUsd} <= ${LIMITS.totalBudgetUsd}
          and ip.n < ${LIMITS.runsPerIpPerHour}
          and day.n < ${LIMITS.runsPerDay}
        returning id
      )
      select (select id from ins) as id, spend.total, ip.n as ip_n, day.n as day_n from spend, ip, day`,
  ]);
  const row = result[0];
  if (row.id) return { ok: true, runId: row.id };
  if (Number(row.total) + LIMITS.reservePerRunUsd > LIMITS.totalBudgetUsd) return { ok: false, reason: "budget" };
  if (Number(row.ip_n) >= LIMITS.runsPerIpPerHour) return { ok: false, reason: "ip_rate" };
  return { ok: false, reason: "daily_rate" };
}

export async function settleRun(runId: string, actualUsd: number, status: "done" | "failed" | "rejected" | "cached", slug: string | null, error?: string) {
  await sql()`
    update runs set actual_usd = ${actualUsd}, status = ${status}, slug = ${slug}, error = ${error ?? null}
    where id = ${runId}`;
}

export async function totalSpend(): Promise<number> {
  const rows = await sql()`select coalesce(sum(coalesce(actual_usd, reserved_usd)), 0) as total from runs`;
  return Number(rows[0].total);
}
