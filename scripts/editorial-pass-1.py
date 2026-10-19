# One-off editorial pass over the agent-researched guides (2026-10-19).
# Shortens headline ranges, states the path each headline assumes, adds numeric hours
# for the timeline and a per-tier time. Rationale is logged in docs/VERIFICATION.md.
import json, sys
H = 1; D = 24; W = 24 * 7; M = 24 * 30
E = {
  "github": dict(dev=("15–60 min", .25, 1), prod=("Same day", .5, 8,
      "Personal accounts. Org data also needs each org owner to install or approve your app."),
      tiers=["Same day", "Same day, once installed", "When an org owner approves", "Same day", "When an org owner approves", "Same day"]),
  "notion": dict(dev=("15–60 min", .25, 1), prod=("Same day", .5, 8,
      "A public connection set to “Any workspace”. Marketplace listing is optional."),
      tiers=["Same day", "Same day", "Same day"]),
  "hubspot": dict(difficulty="moderate", dev=("1–3 hours", 1, 3), prod=("3–10 weeks", 3*W, 10*W,
      "Unlimited installs. Up to 25 accounts can connect on day one with no review."),
      tiers=["Same day (up to 25 installs)", "Same day, on eligible accounts", "Same day, mostly Enterprise accounts", "After HubSpot review"]),
  "slack": dict(dev=("15–60 min", .25, 1), prod=("1–4 months", 1*M, 4*M,
      "A Marketplace listing, which an agent that reads messages needs. Unlisted installs work the same day but are throttled."),
      tiers=["Same day", "Same day, but throttled", "1–4 months (Marketplace)", "1–4 months (Marketplace)", "Unlikely"]),
  "google": dict(dev=("30–90 min", .5, 1.5), prod=("6 weeks – 4+ months", 6*W, 4.5*M,
      "Restricted Gmail scopes (read, modify, drafts), which most email agents need."),
      tiers=["Same day", "Same day", "1–4 weeks", "6 weeks – 4+ months"]),
  "linkedin": dict(dev=("30 min – 2 hours", .5, 2), prod=("Weeks to months", 2*W, 6*M,
      "Partner APIs, needed to read posts or manage pages. Sign-in and posting work the same day. Approval isn't guaranteed."),
      tiers=["Same day", "Same day", "Weeks to months", "Up to 30 business days", "Partners only"]),
}
for slug, e in E.items():
    path = f"src/data/guides/{slug}.json"
    g = json.load(open(path))
    v = g["verdict"]
    if "difficulty" in e:
        v["difficulty"] = e["difficulty"]
    r, lo, hi = e["dev"]
    v["timeToDev"] = {"range": r, "hours": {"min": lo, "max": hi}, "evidence": v["timeToDev"]["evidence"]}
    r, lo, hi, assumes = e["prod"]
    old = v["timeToProd"]
    v["timeToProd"] = {"range": r, "hours": {"min": lo, "max": hi}, "assumes": assumes, "waitingOn": old["waitingOn"], "evidence": old["evidence"]}
    assert len(e["tiers"]) == len(g["scopeTiers"]), slug
    g["scopeTiers"] = [{**{k: t[k] for k in ("tier", "examples", "reviewRequired")}, "time": time, **{k: t[k] for k in ("impact", "evidence")}} for t, time in zip(g["scopeTiers"], e["tiers"])]
    json.dump(g, open(path, "w"), indent=2, ensure_ascii=False)
    open(path, "a").write("\n")
print("ok")
