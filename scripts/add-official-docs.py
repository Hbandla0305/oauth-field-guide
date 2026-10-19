# Adds officialDocs quick links to the six checked guides, chosen from sources they already cite.
import json
DOCS = {
  "github": [("oauth","Authorizing OAuth apps","https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps"),
             ("oauth","GitHub App vs OAuth App","https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/differences-between-github-apps-and-oauth-apps"),
             ("scopes","Scopes for OAuth apps","https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/scopes-for-oauth-apps"),
             ("console","Developer settings","https://github.com/settings/developers"),
             ("api","REST API rate limits","https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api")],
  "google": [("oauth","Using OAuth 2.0 to access Google APIs","https://developers.google.com/identity/protocols/oauth2"),
             ("scopes","Gmail API scopes","https://developers.google.com/workspace/gmail/api/auth/scopes"),
             ("review","OAuth app verification help center","https://support.google.com/cloud/answer/13463073"),
             ("review","Restricted scope verification","https://developers.google.com/identity/protocols/oauth2/production-readiness/restricted-scope-verification"),
             ("console","Google Auth Platform","https://console.cloud.google.com/auth/overview")],
  "slack": [("oauth","Installing with OAuth","https://docs.slack.dev/authentication/installing-with-oauth"),
            ("review","Marketplace review guide","https://docs.slack.dev/slack-marketplace/slack-marketplace-review-guide"),
            ("api","Web API rate limits","https://docs.slack.dev/apis/web-api/rate-limits"),
            ("changelog","Rate limits for non-Marketplace apps","https://docs.slack.dev/changelog/2025/05/29/rate-limit-changes-for-non-marketplace-apps"),
            ("console","Your apps","https://api.slack.com/apps")],
  "notion": [("oauth","Authorization guide","https://developers.notion.com/guides/get-started/authorization"),
             ("scopes","Capabilities","https://developers.notion.com/reference/capabilities"),
             ("review","List on the Marketplace","https://developers.notion.com/guides/get-started/marketplace-listing"),
             ("api","Request limits","https://developers.notion.com/reference/request-limits"),
             ("console","Developer portal","https://app.notion.com/developers/connections")],
  "hubspot": [("oauth","Working with OAuth","https://developers.hubspot.com/docs/apps/developer-platform/build-apps/authentication/oauth/working-with-oauth"),
              ("scopes","Scopes","https://developers.hubspot.com/docs/apps/developer-platform/build-apps/authentication/scopes"),
              ("review","Marketplace listing requirements","https://developers.hubspot.com/docs/apps/developer-platform/list-apps/listing-your-app/app-marketplace-listing-requirements"),
              ("changelog","Install limits for unlisted apps","https://developers.hubspot.com/changelog/new-marketplace-distribution-app-install-limits"),
              ("console","Developer docs","https://developers.hubspot.com")],
  "linkedin": [("oauth","3-legged OAuth flow","https://learn.microsoft.com/en-us/linkedin/shared/authentication/authorization-code-flow"),
               ("scopes","Getting access to LinkedIn APIs","https://learn.microsoft.com/en-us/linkedin/shared/authentication/getting-access"),
               ("review","Community Management app review","https://learn.microsoft.com/en-us/linkedin/marketing/community-management-app-review"),
               ("api","Rate limits","https://learn.microsoft.com/en-us/linkedin/shared/api-guide/concepts/rate-limits"),
               ("console","Developer portal","https://www.linkedin.com/developers/apps")],
}
for slug, docs in DOCS.items():
    p = f"src/data/guides/{slug}.json"
    g = json.load(open(p))
    out = {}
    for k, v in g.items():
        out[k] = v
        if k == "app":
            out["officialDocs"] = [{"kind": a, "label": b, "url": c} for a, b, c in docs]
    json.dump(out, open(p, "w"), indent=2, ensure_ascii=False); open(p, "a").write("\n")
print("ok")
