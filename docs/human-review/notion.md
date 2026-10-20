# Human review: Notion

Guide: https://oauth-field-guide.vercel.app/guides/notion · researched 2026-10-20

Open each source, check the claim against it (or against your own setup attempt), and fill in the last two columns.
**Result:** ✅ confirmed · ✏️ corrected (write the correct text in Notes) · ❓ couldn't verify. **How:** `source` (read the docs) or `tested` (saw it yourself in the console).

Reviewer: ___________ · Date: ____-__-__

| # | Claim | What the guide says | Sources | Result | How | Notes |
|---|---|---|---|---|---|---|
| 1 | Time to a working dev app | 15–60 min | [2](https://developers.notion.com/guides/get-started/public-connections) [1](https://developers.notion.com/guides/get-started/authorization) | | | |
| 2 | Time until any user can connect | Same day. A public connection set to “Any workspace”. Marketplace listing is optional. | [2](https://developers.notion.com/guides/get-started/public-connections) [5](https://developers.notion.com/guides/get-started/marketplace-listing) | | | |
| 3 | Permission tier: Content capabilities | No review, Same day. e.g. Read content, Update content, Insert content | [3](https://developers.notion.com/reference/capabilities) [2](https://developers.notion.com/guides/get-started/public-connections) | | | |
| 4 | Permission tier: Comment capabilities | No review, Same day. e.g. Read comments, Insert comments | [3](https://developers.notion.com/reference/capabilities) [14](https://developers.notion.com/reference/status-codes) | | | |
| 5 | Permission tier: User information | No review, Same day. e.g. No user information, User information without email addresses, User information with email addresses | [3](https://developers.notion.com/reference/capabilities) | | | |
| 6 | Requirement: A Notion account and a workspace to develop in | Connections are created in the Developer portal and tied to a development workspace. | [2](https://developers.notion.com/guides/get-started/public-connections) | | | |
| 7 | Requirement: A public HTTPS redirect URI on your backend | Required in the OAuth configuration. Notion redirects here with ?code= or ?error=. | [1](https://developers.notion.com/guides/get-started/authorization) [2](https://developers.notion.com/guides/get-started/public-connections) | | | |
| 8 | Requirement: A server-side secret store and a token database | The code exchange uses HTTP Basic auth with client_id:client_secret. Store the access_token, refresh_token, bot_id, workspace_id and owner from every authorization. | [1](https://developers.notion.com/guides/get-started/authorization) | | | |
| 9 | Blocker: API returns 404 object_not_found ('Make sure the relevant pages and databases are shared with your connection') for a page the user can see | The user didn't select that page (or a parent) in the OAuth page picker. Connections only see shared pages and their children. Fix: Send the user back through the authorize URL to add pages (the picker only lists pages where they have full access). Have them share a top-level parent page. | [14](https://developers.notion.com/reference/status-codes) [1](https://developers.notion.com/guides/get-started/authorization) | | | |
| 10 | Blocker: 403 restricted_resource on a shared page | The connection lacks the needed capability (e.g. Read comments, Insert content), or the workspace hit a block limit. Fix: Enable the capability on the connection's settings and have users re-authorize if needed. | [14](https://developers.notion.com/reference/status-codes) [3](https://developers.notion.com/reference/capabilities) | | | |
| 11 | Blocker: Refresh fails with invalid_grant | Reusing a refresh token that was already rotated (often parallel workers refreshing at once), a disconnected user, or a redirect/client mismatch. Fix: Persist the new refresh token atomically on every refresh, serialize refreshes per connection, and treat invalid_grant as terminal (prompt re-authorization). | [16](https://nango.dev/blog/notion-oauth-refresh-token-invalid-grant) [12](https://developers.notion.com/guides/mcp/build-mcp-client) | | | |
