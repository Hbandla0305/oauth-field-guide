# Slack research notes (2026-10-19)

## Key sources
- Rate-limit changelog (2025-05-29): https://docs.slack.dev/changelog/2025/05/29/rate-limit-changes-for-non-marketplace-apps
- Rate limits reference: https://docs.slack.dev/apis/web-api/rate-limits
- Distribution: https://docs.slack.dev/distribution
- Marketplace review guide (timelines): https://docs.slack.dev/slack-marketplace/slack-marketplace-review-guide
- Marketplace guidelines (AI rules, scopes, privacy): https://docs.slack.dev/slack-marketplace/slack-marketplace-app-guidelines-and-requirements
- RTS API eligibility: https://docs.slack.dev/apis/web-api/real-time-search-api
- MCP server eligibility: https://docs.slack.dev/ai/mcp-server
- API ToS (effective 2025-10-10): https://slack.com/terms-of-service/api
- Token rotation: https://docs.slack.dev/authentication/using-token-rotation
- OAuth v2: https://docs.slack.dev/authentication/installing-with-oauth
- Manifests / apps.manifest.create: https://docs.slack.dev/app-manifests/configuring-apps-with-app-manifests
- Admin approval: https://slack.com/help/articles/222386767

## Conflicts
- **Existing installs of unlisted apps.** The current changelog and rate-limits page say the new limits are not applied to existing installations. Search snippets of the earlier changelog version, plus third-party sources (zeroclaw issue, Dust, Glean, allanninal.dev, dev.to), cite 2025-09-02 and then 2026-03-03 as the enforcement date. The old api.slack.com URL now 302s to the current page, so we couldn't read the superseded text. It looks like Slack reversed the existing-install enforcement, but that's unconfirmed. Labelled unverified.
- **Token rotation.** A 2018 changelog line said rotation was "required for all distributed workspace apps". Current docs make it optional and Marketplace guidelines don't require it. We followed the current docs.

## Could not verify
- The exact current "Manage Distribution" checklist wording. The "Remove Hard Coded Information" item only appears in third-party guides (Ping, AWS Glue, dial9).
- Whether http://localhost redirect URLs work.
- Real-world Marketplace review durations (we only found Slack's maximums: 10 business days preliminary, 10 weeks functional).
- How Slack decides an app is "commercially distributed" vs "internal".
- The error string returned for RTS/MCP calls from unlisted apps.

## Surprises that should shape guidance
1. **For AI agents, unlisted distribution is not a production path.** The unlisted limits are 1 rpm and 15 messages for history/replies. RTS (`assistant.search.context`) and the Slack MCP server are Marketplace-or-internal only. The ToS says commercial distribution means the Marketplace. So we rated difficulty **hard**, even though the dev setup is trivial.
2. **Chicken-and-egg:** the Marketplace needs 10+ *active* workspaces before you can submit, so early customers must run the throttled unlisted app first.
3. **Functional review can take up to 10 weeks**, and Slack won't expedite.
4. **AI-specific Marketplace rules:** "DON'T store any Slack data you obtain", no LLM training, and disclosures of model, retention and residency. The ToS also bans persistent indexes of other orgs' data from RTS/Data Access and bans bulk export. RAG-over-Slack designs need rethinking.
5. **Agents can create apps via API.** `apps.manifest.create` works with a human-generated App Configuration Token (12h lifetime), so app creation can be mostly agent-driven.
6. Token rotation is irreversible once enabled.
7. Apps with non-bot scopes are auto-uninstalled if the installing user leaves the workspace.
