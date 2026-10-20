import { neon } from "@neondatabase/serverless";
import { createHash } from "node:crypto";
import ipaddr from "ipaddr.js";
import { StoredGuide, type Guide } from "./guide-schema";
import { LIMITS } from "./agent/config";

// The running app connects as app_runtime (APP_DATABASE_URL): read, insert and update on its two
// tables, nothing else. DATABASE_URL (the owner, managed by the Neon integration) is the fallback
// for local scripts and previews.
const dbUrl = () => process.env.APP_DATABASE_URL || process.env.DATABASE_URL;

export function databaseConfigured(): boolean {
  return Boolean(dbUrl());
}

function sql() {
  const url = dbUrl();
  if (!url) throw new Error("DATABASE_URL is not set");
  return neon(url);
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
     firecrawl_credits integer not null default 0,
     error text,
     created_at timestamptz not null default now()
   )`,
  `create index if not exists runs_ip_time on runs (ip_hash, created_at)`,
  // "generate" for live guides, "chat" for questions asked inside a guide. Both share the spend cap.
  `alter table runs add column if not exists kind text not null default 'generate'`,
];

// IPv6 users get a whole /64 from their provider, so limits apply per /64, not per address.
function rateKey(ip: string): string {
  if (!ipaddr.isValid(ip)) return ip;
  const addr = ipaddr.process(ip);
  return addr.kind() === "ipv6" ? `${(addr as ipaddr.IPv6).parts.slice(0, 4).map((p) => p.toString(16)).join(":")}::/64` : addr.toString();
}

export function hashIp(ip: string): string {
  const salt = process.env.IP_HASH_SALT;
  if (!salt && process.env.VERCEL_ENV === "production") throw new Error("IP_HASH_SALT must be set in production");
  return createHash("sha256").update(`${salt ?? "dev"}:${rateKey(ip)}`).digest("hex").slice(0, 32);
}

export async function getGeneratedGuide(slug: string): Promise<Guide | null> {
  if (!databaseConfigured()) return null;
  const rows = await sql()`select guide from guides where slug = ${slug}`;
  if (!rows.length) return null;
  const parsed = StoredGuide.safeParse(rows[0].guide);
  return parsed.success ? parsed.data : null;
}

export async function listGeneratedGuides(limit = 12): Promise<Guide[]> {
  if (!databaseConfigured()) return [];
  const rows = await sql()`select guide from guides order by created_at desc limit ${limit}`;
  return rows.flatMap((r) => {
    const parsed = StoredGuide.safeParse(r.guide);
    return parsed.success ? [parsed.data] : [];
  });
}

// Never overwrites: returns false if a guide with this slug already exists.
export async function saveGuide(guide: Guide, input: string, costUsd: number): Promise<boolean> {
  if (!guide.app.slug) throw new Error("Guide has no slug");
  const rows = await sql()`
    insert into guides (slug, guide, input, cost_usd) values (${guide.app.slug}, ${JSON.stringify(guide)}, ${input}, ${costUsd})
    on conflict (slug) do nothing returning slug`;
  return rows.length > 0;
}

export type Reservation =
  | { ok: true; runId: string }
  | { ok: false; reason: "budget" | "daily_budget" | "ip_rate" | "ip_daily" | "daily_rate" };

type Kind = "generate" | "chat";

const KIND_LIMITS: Record<Kind, { reserve: number; perIpPerHour: number; perIpPerDay: number; perDay: number }> = {
  generate: { reserve: LIMITS.reservePerRunUsd, perIpPerHour: LIMITS.runsPerIpPerHour, perIpPerDay: LIMITS.runsPerIpPerDay, perDay: LIMITS.runsPerDay },
  chat: { reserve: LIMITS.chat.reservePerMessageUsd, perIpPerHour: LIMITS.chat.perIpPerHour, perIpPerDay: LIMITS.chat.perIpPerDay, perDay: LIMITS.chat.perDay },
};

export function reserveRun(ipHash: string, input: string) {
  return reserve("generate", ipHash, input);
}

export function reserveChat(ipHash: string, input: string) {
  return reserve("chat", ipHash, input);
}

// Reserves worst-case spend for one run. The advisory lock serialises concurrent
// reservations so two requests can't both squeeze under the cap. Request counts are per
// kind; the dollar caps (overall, per day, per IP) are shared, with some of each day kept for chat.
async function reserve(kind: Kind, ipHash: string, input: string): Promise<Reservation> {
  const { reserve: amount, perIpPerHour, perIpPerDay, perDay } = KIND_LIMITS[kind];
  const dailyCap = kind === "chat" ? LIMITS.dailyBudgetUsd : LIMITS.dailyBudgetUsd - LIMITS.chatHeadroomUsd;
  const db = sql();
  const [, result] = await db.transaction([
    db`select pg_advisory_xact_lock(7203)`,
    db`
      with spend as (
        select
          coalesce(sum(coalesce(actual_usd, reserved_usd)), 0) as total,
          coalesce(sum(coalesce(actual_usd, reserved_usd)) filter (where created_at > now() - interval '1 day'), 0) as today
        from runs
      ), ip as (
        select
          count(*) filter (where kind = ${kind} and created_at > now() - interval '1 hour') as hour_n,
          count(*) filter (where kind = ${kind}) as day_n,
          coalesce(sum(actual_usd), 0) as usd
        from runs where ip_hash = ${ipHash} and created_at > now() - interval '1 day'
      ), day as (
        select count(*) as n from runs where kind = ${kind} and created_at > now() - interval '1 day'
      ), ins as (
        insert into runs (ip_hash, input, reserved_usd, kind)
        select ${ipHash}, ${input}, ${amount}, ${kind}
        from spend, ip, day
        where spend.total + ${amount} <= ${LIMITS.totalBudgetUsd}
          and spend.today + ${amount} <= ${dailyCap}
          and ip.hour_n < ${perIpPerHour}
          and ip.day_n < ${perIpPerDay}
          and ip.usd < ${LIMITS.perIpUsdPerDay}
          and day.n < ${perDay}
        returning id
      )
      select (select id from ins) as id, spend.total, spend.today, ip.hour_n, ip.day_n as ip_day_n, ip.usd as ip_usd, day.n as day_n from spend, ip, day`,
  ]);
  const row = result[0];
  if (row.id) return { ok: true, runId: row.id };
  if (Number(row.total) + amount > LIMITS.totalBudgetUsd) return { ok: false, reason: "budget" };
  if (Number(row.today) + amount > dailyCap) return { ok: false, reason: "daily_budget" };
  if (Number(row.hour_n) >= perIpPerHour) return { ok: false, reason: "ip_rate" };
  if (Number(row.ip_day_n) >= perIpPerDay || Number(row.ip_usd) >= LIMITS.perIpUsdPerDay) return { ok: false, reason: "ip_daily" };
  return { ok: false, reason: "daily_rate" };
}

export async function settleRun(
  runId: string,
  actualUsd: number,
  status: "done" | "failed" | "rejected" | "cached" | "answered",
  slug: string | null,
  error?: string,
  firecrawlCredits = 0,
) {
  await sql()`
    update runs set actual_usd = ${actualUsd}, status = ${status}, slug = ${slug}, error = ${error ?? null}, firecrawl_credits = ${firecrawlCredits}
    where id = ${runId}`;
}

// Credits already spent, plus a reservation for each run still in flight.
export async function firecrawlCreditsCommitted(): Promise<number> {
  const rows = await sql()`
    select coalesce(sum(case when status = 'running' and kind = 'generate' then ${LIMITS.firecrawl.reservePerRun} else firecrawl_credits end), 0) as total from runs`;
  return Number(rows[0].total);
}

export async function totalSpend(): Promise<number> {
  const rows = await sql()`select coalesce(sum(coalesce(actual_usd, reserved_usd)), 0) as total from runs`;
  return Number(rows[0].total);
}
