# Notion: research notes (2026-10-19)

## Key sources
- Authorization guide: https://developers.notion.com/guides/get-started/authorization (OAuth flow, refresh, page picker, templates)
- Public connections: https://developers.notion.com/guides/get-started/public-connections (Developer portal steps, installation scope)
- Capabilities: https://developers.notion.com/reference/capabilities
- Request limits: https://developers.notion.com/reference/request-limits (180/min, or 600/min on Business/Enterprise, plus a per-workspace limit)
- Marketplace listing: https://developers.notion.com/guides/get-started/marketplace-listing (optional, 5-10 business day review)
- Changelog: https://developers.notion.com/page/changelog (Developer portal May 2026; unique tokens per auth June 2026; MCP 8h tokens July 2026; rate-limit rework Sept 2026)
- Build MCP client: https://developers.notion.com/guides/mcp/build-mcp-client (DCR/CIMD, PKCE, 8h access token, 180d/30d-idle refresh cap, rotation)
- Help Center: https://www.notion.com/help/add-and-manage-connections-with-the-api (Enterprise allowlists)
- Docs index: https://developers.notion.com/llms.txt (the raw `.md` versions of pages are curl-able, which is useful for grepping)

## Conflicts between sources
- **Token expiry.** Older third-party guides (e.g. a Nango setup doc, now 404) say Notion OAuth tokens never expire and there's no refresh token. Current official docs return a `refresh_token` and document rotation. But the token response schema has no `expires_in`, introspect returns no `exp`, and no REST lifetime is stated anywhere. Only MCP tokens have documented lifetimes (about 8h access, 180d / 30d-idle refresh). Guidance: implement rotating refresh and refresh on 401, and don't hardcode a TTL.
- **Required "public" fields.** The task brief and the pre-2026 UI (Make guide) list company name, website, tagline, privacy policy, terms, support email and redirect URIs under a "Distribution" tab. The current Developer portal docs list only name, dev workspace, redirect URIs, installation scope and capabilities, and say listing details live under "Listings". I couldn't confirm which fields are required now, so they're marked unverified.
- **Marketplace review.** The getting-started page says public connections "must pass a Notion security review" before listing. The listing guide only says "the Notion team reviews every listing submission" (brand, quality, baseline criteria). Either way it is optional and doesn't gate installs.

## Could not verify
- REST access/refresh token lifetimes.
- Whether you must be a workspace owner to create a *public* connection (documented only for internal connections).
- Whether capability changes propagate to existing tokens without re-auth.
- The current exact form fields in the Developer portal (requires login).

## Surprises that should change our guidance
1. **"Integrations" are now "connections"**, and there's a new **Developer portal** (app.notion.com/developers/connections). notion.so/profile/integrations now redirects to app.notion.com. Old tutorials are stale.
2. **Installation scope is permanent.** "Selected workspaces only" can never be listed on the Marketplace, so you'd have to recreate the connection and get new credentials.
3. **Refresh tokens now exist and rotate.** Older "Notion tokens never expire" advice is outdated.
4. **Tokens are unique per authorization** for connections created after June 8, 2026, so key storage per authorization.
5. **Rate limits are plan-based** (3 req/s average on Free/Plus, 10 req/s on Business/Enterprise), and since June 2026 there's an additional per-workspace limit shared with other connections.
6. **Hosted Notion MCP is a real alternative for agents.** It needs no portal app (DCR/CIMD plus PKCE), but tokens are short-lived, and Enterprise owners can restrict MCP clients.
7. **Public connections act as the authorizing user.** Only that user can share pages with the connection, so every teammate has to authorize separately.
