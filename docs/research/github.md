# GitHub: research notes (2026-10-19, agent-generated)

## Key sources
- Differences between GitHub Apps and OAuth apps: https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/differences-between-github-apps-and-oauth-apps
- Deciding when to build a GitHub App: https://docs.github.com/en/apps/creating-github-apps/about-creating-github-apps/deciding-when-to-build-a-github-app
- Registering a GitHub App: https://docs.github.com/en/apps/creating-github-apps/registering-a-github-app/registering-a-github-app
- Creating an OAuth app: https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/creating-an-oauth-app
- Authorizing OAuth apps (endpoints, PKCE, token limits, redirect rules): https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps
- Generating / refreshing GitHub App user tokens: https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/generating-a-user-access-token-for-a-github-app , https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/refreshing-user-access-tokens
- OAuth app access restrictions (about / enabling): https://docs.github.com/en/organizations/managing-oauth-access-to-your-organizations-data/about-oauth-app-access-restrictions
- Requesting a GitHub App from org owner: https://docs.github.com/en/apps/using-github-apps/requesting-a-github-app-from-your-organization-owner
- Marketplace overview: https://docs.github.com/en/apps/github-marketplace/github-marketplace-overview/about-github-marketplace-for-apps
- REST rate limits: https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api
- Third-party (blocker symptoms only): Atlassian KB on DVCS only listing public org repos; GitHub 2015 integrator guide to org application policies.

## Live checks (no login)
- `/login/oauth/authorize`, `/settings/apps/new`, `/settings/applications/new` all 302 to login with `return_to`: they exist.
- `/login/oauth/access_token` and `/login/device/code` with a bad client_id return `{"error":"Not Found"}`.
- No `/.well-known/openid-configuration` or `/.well-known/oauth-authorization-server` on github.com (404).
- `api.github.com/user` unauthenticated returns 401 and exposes `X-OAuth-Scopes`, `X-Accepted-OAuth-Scopes`, `X-GitHub-SSO`.

## Conflicts / surprises that should change guidance
- **OAuth App tokens may no longer be "never expire" by default.** The current "Creating an OAuth app" page lists an "Expire user access tokens" checkbox *enabled by default*, and the differences page says OAuth tokens can be set to expire after 8h. Much older guidance (and common lore) says OAuth App tokens are long-lived. I found no changelog entry dating the change. Guidance: assume refresh-token handling for both app types.
- **Wildcard redirect matching:** docs say apps with a single callback URL created before Aug 3, 2026 have wildcard matching on by default. That's a recent change and a security footgun worth flagging.
- **The real gate is the customer org, not GitHub.** No GitHub review exists. OAuth App access restrictions are on by default for new orgs, and turning them on revokes org access for every OAuth App already authorized. GitHub Apps are not subject to this policy, but org owners still have to install them (and approve organization permissions). Either way, "time to any user" depends on each customer org's owner.
- **GitHub App user tokens are the intersection** of user access and app installation. An agent that only does the OAuth step without installing the app gets near-empty repo lists. Use "Request user authorization during installation" plus `GET /user/installations`.
- Users can trim OAuth scopes during consent, per the scopes page. Many guides say otherwise.

## Could not verify
- Exact current 403 / UI wording when OAuth app restrictions block access (only third-party reports).
- Marketplace / publisher verification review times.
- Whether GitHub proactively reviews or throttles large public apps beyond the documented `application_suspended` for abuse.
- Explicit doc statement on GitHub App user-token behavior for orgs where the app isn't installed (we infer it from the intersection rule).
