# LinkedIn research notes (2026-10-19)

## Key sources
- Getting access (open vs gated products): https://learn.microsoft.com/en-us/linkedin/shared/authentication/getting-access
- Auth code flow (60-day tokens, scope-change invalidation, errors): https://learn.microsoft.com/en-us/linkedin/shared/authentication/authorization-code-flow
- Refresh tokens (MDP partners only, 365-day fixed TTL): https://learn.microsoft.com/en-us/linkedin/shared/authentication/programmatic-refresh-tokens
- Marketing tiers and permissions table: https://learn.microsoft.com/en-us/linkedin/marketing/increasing-access
- Community Management app review: https://learn.microsoft.com/en-us/linkedin/marketing/community-management-app-review
- Partner support guide (CM must be the only product, 21-day survey, Ads Standard up to 30 business days): https://learn.microsoft.com/en-us/linkedin/shared/linkedin-api-partner-support-guide
- Posts API (r_member_social restricted; version headers): https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/posts-api
- Developer AI Policy: https://learn.microsoft.com/en-us/linkedin/marketing/developer-ai-policy
- Rate limits: https://learn.microsoft.com/en-us/linkedin/shared/api-guide/concepts/rate-limits
- Versioning: https://learn.microsoft.com/en-us/linkedin/marketing/versioning

## Live checks
- Fetched the discovery doc and JWKS. Got a 401 EMPTY_ACCESS_TOKEN from userinfo, an error from the token endpoint for a bogus code, and confirmed the introspectToken endpoint exists. Portal pages return 200 while logged out.

## Conflicts between sources
- **OIDC issuer:** the live discovery doc says `https://www.linkedin.com/oauth`, but the Sign In doc's sample discovery JSON says `https://www.linkedin.com`. That can break strict ID-token validation. We couldn't confirm which value real tokens carry.
- **Page verification:** the CM docs require it. LinkedIn Help says only "certain products" need a Page. Third-party guides disagree on whether Share/Sign In work before verification. The help article does say a default Page must be selected to create an app at all.
- **Share docs vs Posts API:** the Share on LinkedIn page still documents `/v2/ugcPosts` (doc dated 2021–2023). The Posts API says it replaces ugcPosts and needs `LinkedIn-Version`.
- **Refresh tokens:** the auth-code doc lists `refresh_token` in its response table, but refresh tokens are only issued to "a limited set of partners" (approved MDP partners). Don't let the table mislead you.

## Could not verify
- Real review times for CM Development and Standard tiers (no SLA). Third-party "3–6 months, <10% approval" claims look like marketing copy and were not used.
- Whether self-serve apps have any hidden user cap or quality review.
- Whether the Developer AI Policy applies to consumer (Share) apps or only to Marketing API data.
- The deprecation date of r_liteprofile/r_emailaddress (community threads only).

## Surprises that should shape guidance
1. **The ceiling for agents is low.** Self-serve gives login plus post-as-user (write-only). Reading the user's own posts (`r_member_social`) is restricted. Feed and connections reads have no path for general developers. Reading anything requires the CM API, which is for registered businesses doing page/profile management, not general agents.
2. **The CM API must be the only product on its app.** Plan a separate app from day one.
3. **A rejection burns the app.** You must create a new app to re-apply.
4. **The Developer AI Policy pushes toward human-in-the-loop posting.** It asks you to restrict fully automated posting of AI-generated content and to let users edit first. Generating content from other members' data is not allowed.
5. **There are no refresh tokens for self-serve apps.** Agents need a re-consent UX every ~60 days. It's silent if the user is still logged in and the token is live.
6. **Changing the requested scopes invalidates all of a user's previous tokens.**
