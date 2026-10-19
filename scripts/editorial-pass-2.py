# Applies the independent desk-check corrections (docs/verification-desk.md, 2026-10-20).
import json
def load(s): return json.load(open(f"src/data/guides/{s}.json"))
def save(s, g):
    json.dump(g, open(f"src/data/guides/{s}.json", "w"), indent=2, ensure_ascii=False); open(f"src/data/guides/{s}.json", "a").write("\n")
def add_source(g, title, url):
    for s in g["sources"]:
        if s["url"] == url: return s["id"]
    sid = f"s{len(g['sources']) + 1}"
    while any(s["id"] == sid for s in g["sources"]): sid += "b"
    g["sources"].append({"id": sid, "title": title, "url": url}); return sid

# Google: "only if" overstated the restricted-scope page, which says "if".
g = load("google")
g["nuances"][4]["text"] = "CASA applies when restricted data is stored on or transmitted through your servers, per the restricted scope verification page. Agents almost always process data server-side, so plan for it."
save("google", g)

# Slack: the official changelog states existing installs are exempt, so this is sourced, not unverified.
g = load("slack")
g["nuances"][1] = {"text": "Existing installs of unlisted apps keep their old limits; the throttle applies to new apps and new installs. Older third-party posts cited later enforcement dates for existing installs, but the current official changelog says they are exempt.",
  "evidence": {"label": "sourced", "sourceIds": ["s1"], "note": None}}
g["verification"]["openQuestions"] = [q for q in g["verification"]["openQuestions"] if not q.startswith("Are existing installs")]
save("slack", g)

# GitHub: the verifier found the changelog the research agent couldn't.
g = load("github")
sid = add_source(g, "GitHub changelog: Multiple redirect URIs and token refresh for OAuth apps (2026-08-14)", "https://github.blog/changelog/2026-08-14-multiple-redirect-uris-and-token-refresh-for-oauth-apps")
n = g["nuances"][2]
n["text"] = "Expiring user tokens (8h access, 6-month refresh) are on by default for all new GitHub Apps and OAuth Apps since 2026-08-14; you can opt out at registration."
n["evidence"] = {"label": "sourced", "sourceIds": sorted(set(n["evidence"]["sourceIds"] + [sid])), "note": None}
g["verification"]["openQuestions"] = [q for q in g["verification"]["openQuestions"] if "became default-on" not in q]
save("github", g)

# LinkedIn: a Page is required for certain products, not literally every app; "unlikely" is our judgment.
g = load("linkedin")
g["steps"][1]["detail"] = g["steps"][1]["detail"].replace("Every app must be associated with a Page.", "The create-app form asks for a LinkedIn Page, and LinkedIn requires one for certain products.")
g["steps"][1]["evidence"]["note"] = "LinkedIn Help says a Page is needed “for certain functionality and products”; the form requires one in practice."
b = g["blockers"][5]
b["evidence"] = {"label": "inferred", "sourceIds": b["evidence"]["sourceIds"], "note": "The docs say the scope is for approved users only; how unlikely approval is is our judgment."}
save("linkedin", g)
print("ok")
