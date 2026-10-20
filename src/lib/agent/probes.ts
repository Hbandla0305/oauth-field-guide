// Live checks the agent runs itself. These are the only things a generated guide may
// label "tested". The model never chooses what to fetch; our code does, and only reaches
// public HTTPS hosts on port 443.
import { lookup as dnsLookup } from "node:dns";
import { isIP } from "node:net";
import ipaddr from "ipaddr.js";
import { Agent, fetch as pinnedFetch } from "undici";
import { getDomain, parse } from "tldts";

const TIMEOUT_MS = 6_000;
const MAX_BYTES = 200_000;
const MAX_REDIRECTS = 3;

// Only ordinary public unicast addresses. ipaddr.js classifies every special range (private,
// loopback, link-local, CGNAT, documentation, benchmarking, multicast, NAT64, 6to4…), and
// IPv4-mapped IPv6 is unwrapped first.
export function isPublicAddress(ip: string): boolean {
  try {
    let addr = ipaddr.parse(ip);
    if (addr.kind() === "ipv6" && (addr as ipaddr.IPv6).isIPv4MappedAddress()) addr = (addr as ipaddr.IPv6).toIPv4Address();
    return addr.range() === "unicast";
  } catch {
    return false;
  }
}

// The address is checked inside the connection's own DNS lookup, so the IP we validate is the
// IP we connect to. There's no second lookup for a rebinding domain to exploit.
const dispatcher = new Agent({
  connect: {
    // Node asks for every address (all: true) when it races IPv4/IPv6, and for one otherwise.
    // Either way, refuse if any resolved address isn't public.
    lookup: (hostname, options, callback) => {
      dnsLookup(hostname, { ...options, all: true }, (err, addresses) => {
        if (err) return callback(err, "", 4);
        const list = addresses as unknown as { address: string; family: number }[];
        if (!list.length || list.some((a) => !isPublicAddress(a.address))) {
          return callback(Object.assign(new Error("Refusing to connect to a non-public address"), { code: "ENOTPUBLIC" }), "", 4);
        }
        if ((options as { all?: boolean }).all) return (callback as unknown as (e: null, a: typeof list) => void)(null, list);
        callback(null, list[0].address, list[0].family);
      });
    },
  },
});

function assertPublicHttps(raw: string): URL {
  const url = new URL(raw);
  if (url.protocol !== "https:") throw new Error("only https is allowed");
  if (url.port && url.port !== "443") throw new Error("only port 443 is allowed");
  if (url.username || url.password) throw new Error("credentials in URL");
  if (isIP(url.hostname.replace(/^\[|\]$/g, ""))) throw new Error("IP literals are not allowed");
  return url;
}

export type FetchResult = { url: string; status: number; body: string; contentType: string };

export async function safeGet(raw: string): Promise<FetchResult> {
  return safeRequest(raw);
}

// GET by default; a POST body (form-encoded) is only used for the token-endpoint attempt.
// Redirects are followed manually so every hop passes the same checks.
async function safeRequest(raw: string, post?: Record<string, string>): Promise<FetchResult & { redirects: string[] }> {
  let current = raw;
  const redirects: string[] = [];
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const url = assertPublicHttps(current);
    const res = await pinnedFetch(url, {
      dispatcher,
      method: post && hop === 0 ? "POST" : "GET",
      body: post && hop === 0 ? new URLSearchParams(post).toString() : undefined,
      redirect: "manual",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: {
        "user-agent": "OAuthGuide/1.0 (+setup check)",
        accept: "application/json,text/html;q=0.9,*/*;q=0.5",
        ...(post ? { "content-type": "application/x-www-form-urlencoded" } : {}),
      },
    });
    const location = res.headers.get("location");
    if (res.status >= 300 && res.status < 400 && location) {
      current = new URL(location, url).toString();
      redirects.push(current);
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
    return { url: url.toString(), status: res.status, body, contentType: res.headers.get("content-type") ?? "", redirects };
  }
  throw new Error("too many redirects");
}

export type Attempt = { id: string; title: string; url: string; observed: string };

// What we record from a response: status, where it redirected, and an OAuth error code if the
// body is a standard OAuth error. Never raw response text: these endpoints can be influenced by
// whoever controls the domain, and observations end up on public pages.
function oauthError(body: string): string | null {
  try {
    const j = JSON.parse(body);
    const code = typeof j?.error === "string" ? j.error : typeof j?.error?.code === "string" ? j.error.code : null;
    return code && /^[a-z0-9_.-]{1,40}$/i.test(code) ? code : null;
  } catch {
    return null;
  }
}

function describe(r: { status: number; body: string; redirects: string[] }): string {
  const last = r.redirects.at(-1);
  const where = last ? `, redirected to ${new URL(last).hostname}${/login|signin|sign_in|session|auth/i.test(new URL(last).pathname) ? " (a sign-in page)" : ""}` : "";
  const err = oauthError(r.body);
  return `HTTP ${r.status}${where}${err ? `, OAuth error "${err}"` : ""}.`;
}

// The registrable domain from the public suffix list, so "docs.example.co.uk" -> "example.co.uk"
// and "someone.github.io" stays "someone.github.io" (not "github.io").
export function rootDomain(urlOrHost: string): string {
  const host = (urlOrHost.includes("://") ? new URL(urlOrHost).hostname : urlOrHost).replace(/^www\./, "");
  return getDomain(host, { allowPrivateDomains: true }) ?? host;
}

// Shared hosting (github.io, vercel.app, ...) and bare IPs can be claimed by anyone, so they
// can never count as a provider's official domain.
export function isSharedHost(urlOrHost: string): boolean {
  try {
    const r = parse(urlOrHost.includes("://") ? urlOrHost : `https://${urlOrHost}`, { allowPrivateDomains: true });
    return r.isIp === true || !r.domain || r.isIcann !== true;
  } catch {
    return true;
  }
}

export function onRoot(url: string, root: string): boolean {
  try {
    const host = new URL(url).hostname;
    return host === root || host.endsWith(`.${root}`);
  } catch {
    return false;
  }
}

function onDomain(url: string | undefined, root: string): string | undefined {
  return url && onRoot(url, root) ? url : undefined;
}

const FAKE_CLIENT = "oauth-guide-test-client";

// Safe, logged-out attempts at the first steps of setup. Each tells us something a developer
// would otherwise only learn by trying: does the authorize endpoint exist and how does it treat
// an unknown app, does the token endpoint answer, is the developer console open to sign up?
// Nothing here creates an account or an app, and every URL must be on the provider's own domain.
export async function attemptSetup(opts: { root: string; authorizeUrl?: string; tokenUrl?: string; portalUrl?: string }): Promise<Attempt[]> {
  const authorizeUrl = onDomain(opts.authorizeUrl, opts.root);
  const tokenUrl = onDomain(opts.tokenUrl, opts.root);
  const portalUrl = onDomain(opts.portalUrl, opts.root);
  const tasks: Promise<Attempt | null>[] = [];

  if (authorizeUrl) {
    const u = new URL(authorizeUrl);
    u.searchParams.set("client_id", FAKE_CLIENT);
    u.searchParams.set("response_type", "code");
    u.searchParams.set("redirect_uri", "https://example.com/callback");
    u.searchParams.set("state", "oauth-guide-check");
    tasks.push(
      safeRequest(u.toString())
        .then((r) => ({ id: "attempt1", title: "Live check: authorize URL with an unregistered test app", url: authorizeUrl, observed: describe(r) }))
        .catch(() => null),
    );
  }

  if (tokenUrl) {
    tasks.push(
      safeRequest(tokenUrl, { grant_type: "authorization_code", code: "invalid-test-code", client_id: FAKE_CLIENT, redirect_uri: "https://example.com/callback" })
        .then((r) => ({ id: "attempt2", title: "Live check: token endpoint with an invalid code", url: tokenUrl, observed: describe(r) }))
        .catch(() => null),
    );
  }

  if (portalUrl) {
    tasks.push(
      safeRequest(portalUrl)
        .then((r) => {
          const text = r.body.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").toLowerCase();
          const signals = [
            /sign up|create (an )?account|get started|register/.test(text) && "offers sign-up",
            /log ?in|sign in/.test(text) && "asks you to sign in",
            /\bapply\b|apply (now|for access)|partner program|request access|waitlist/.test(text) && "mentions applying or requesting access",
            /contact sales|talk to sales|book a demo/.test(text) && "points to sales",
          ].filter(Boolean);
          return {
            id: "attempt3",
            title: "Live check: developer console, logged out",
            url: portalUrl,
            observed: `${describe(r).replace(/\.$/, "")}. Page ${signals.length ? signals.join(", ") : "gives no sign-up or apply signals"}.`,
          };
        })
        .catch(() => null),
    );
  }

  return (await Promise.all(tasks)).filter((a): a is Attempt => a !== null);
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
  const list = (v: unknown) => (Array.isArray(v) ? v.slice(0, 40).map((x) => String(x).slice(0, 100)) : undefined);
  const root = rootDomain(host);
  const endpoint = (v: unknown) => (typeof v === "string" && v.startsWith("https://") ? onDomain(v, root) : undefined);
  return {
    checkedUrls,
    found: {
      url,
      issuer: typeof json.issuer === "string" ? json.issuer.slice(0, 200) : undefined,
      authorization_endpoint: endpoint(json.authorization_endpoint),
      token_endpoint: endpoint(json.token_endpoint),
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
