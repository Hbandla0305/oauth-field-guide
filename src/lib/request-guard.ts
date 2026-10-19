// The paid endpoints (live research, chat) only accept same-site JSON requests from our own
// pages, so another website can't make visitors' browsers spend our budget.
export function crossSiteRefusal(req: Request): Response | null {
  const site = req.headers.get("sec-fetch-site");
  const origin = req.headers.get("origin");
  const host = req.headers.get("host");
  const crossSite = site === "cross-site" || (origin !== null && host !== null && new URL(origin).host !== host);
  if (crossSite) return Response.json({ error: "Requests from other sites aren't allowed." }, { status: 403 });
  if (!(req.headers.get("content-type") ?? "").includes("application/json")) return Response.json({ error: "Expected JSON." }, { status: 415 });
  return null;
}

// Only ever link to https URLs. Guide data is agent-written from web pages.
export function safeHref(url: string | null | undefined): string | undefined {
  return typeof url === "string" && /^https:\/\/[^\s"'<>]+$/.test(url) ? url : undefined;
}
