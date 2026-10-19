// Live checks the agent runs itself. These are the only things a generated guide may
// label "tested". The model never chooses what to fetch; our code does, and only GETs
// public HTTPS URLs.
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

const TIMEOUT_MS = 6_000;
const MAX_BYTES = 200_000;
const MAX_REDIRECTS = 3;

function isPrivateAddress(ip: string): boolean {
  if (ip.includes(":")) {
    const v6 = ip.toLowerCase();
    if (v6.startsWith("::ffff:")) return isPrivateAddress(v6.slice(7));
    return v6 === "::1" || v6 === "::" || v6.startsWith("fc") || v6.startsWith("fd") || v6.startsWith("fe80");
  }
  const [a, b] = ip.split(".").map(Number);
  return (
    a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224
  );
}

async function assertPublicHttps(raw: string): Promise<URL> {
  const url = new URL(raw);
  if (url.protocol !== "https:") throw new Error("only https is allowed");
  if (url.username || url.password) throw new Error("credentials in URL");
  if (isIP(url.hostname)) throw new Error("IP literals are not allowed");
  const addrs = await lookup(url.hostname, { all: true });
  if (!addrs.length || addrs.some((a) => isPrivateAddress(a.address))) throw new Error("host resolves to a private address");
  return url;
}

export type FetchResult = { url: string; status: number; body: string; contentType: string };

export async function safeGet(raw: string): Promise<FetchResult> {
  let current = raw;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const url = await assertPublicHttps(current);
    const res = await fetch(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { "user-agent": "OAuthFieldGuide/1.0 (+link check)", accept: "application/json,text/html;q=0.9,*/*;q=0.5" },
    });
    const location = res.headers.get("location");
    if (res.status >= 300 && res.status < 400 && location) {
      current = new URL(location, url).toString();
      continue;
    }
    const reader = res.body?.getReader();
    let body = "";
    if (reader) {
      const decoder = new TextDecoder();
      let bytes = 0;
      while (bytes < MAX_BYTES) {
        const { done, value } = await reader.read();
        if (done) break;
        bytes += value.byteLength;
        body += decoder.decode(value, { stream: true });
      }
      await reader.cancel().catch(() => {});
    }
    return { url: url.toString(), status: res.status, body, contentType: res.headers.get("content-type") ?? "" };
  }
  throw new Error("too many redirects");
}

export type DiscoveryProbe = {
  checkedUrls: string[];
  found: null | {
    url: string;
    issuer?: string;
    authorization_endpoint?: string;
    token_endpoint?: string;
    scopes_supported?: string[];
    grant_types_supported?: string[];
    code_challenge_methods_supported?: string[];
  };
};

// Looks for OIDC / OAuth 2.0 authorization server metadata (RFC 8414) on the
// provider's apex and common auth subdomains.
export async function probeDiscovery(website: string): Promise<DiscoveryProbe> {
  const host = new URL(website).hostname.replace(/^www\./, "");
  const hosts = [host, `accounts.${host}`, `auth.${host}`, `login.${host}`, `api.${host}`];
  const paths = ["/.well-known/openid-configuration", "/.well-known/oauth-authorization-server"];
  const candidates = hosts.flatMap((h) => paths.map((p) => `https://${h}${p}`));
  const checkedUrls: string[] = [];

  const results = await Promise.allSettled(
    candidates.map(async (url) => {
      checkedUrls.push(url);
      const res = await safeGet(url);
      if (res.status !== 200) throw new Error(String(res.status));
      const json = JSON.parse(res.body);
      if (!json.authorization_endpoint && !json.token_endpoint) throw new Error("not metadata");
      return { url, json };
    }),
  );
  const hit = results.find((r) => r.status === "fulfilled");
  if (!hit || hit.status !== "fulfilled") return { checkedUrls, found: null };
  const { url, json } = hit.value;
  const list = (v: unknown) => (Array.isArray(v) ? v.slice(0, 40).map(String) : undefined);
  return {
    checkedUrls,
    found: {
      url,
      issuer: json.issuer,
      authorization_endpoint: json.authorization_endpoint,
      token_endpoint: json.token_endpoint,
      scopes_supported: list(json.scopes_supported),
      grant_types_supported: list(json.grant_types_supported),
      code_challenge_methods_supported: list(json.code_challenge_methods_supported),
    },
  };
}

export type LinkCheck = { url: string; ok: boolean; status: number | null };

// Confirms each cited source resolves. Bot-protected pages often answer 403/429,
// so those count as "reachable but unconfirmed" rather than dead.
export async function checkLinks(urls: string[]): Promise<LinkCheck[]> {
  return Promise.all(
    urls.slice(0, 20).map(async (url) => {
      try {
        const res = await safeGet(url);
        return { url, ok: res.status < 400 || res.status === 403 || res.status === 429, status: res.status };
      } catch {
        return { url, ok: false, status: null };
      }
    }),
  );
}
