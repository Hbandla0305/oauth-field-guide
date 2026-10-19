# HubSpot research notes (2026-10-19)

## Key sources
- Install limits: https://developers.hubspot.com/docs/apps/developer-platform/build-apps/manage-apps-in-hubspot and changelog https://developers.hubspot.com/changelog/new-marketplace-distribution-app-install-limits
- Listing requirements (3 active installs, review times): https://developers.hubspot.com/docs/apps/developer-platform/list-apps/listing-your-app/app-marketplace-listing-requirements
- App config (`app-hsmeta.json`): https://developers.hubspot.com/docs/apps/developer-platform/build-apps/app-configuration
- Account types (developer accounts merged into standard accounts on Mar 9, 2026): https://developers.hubspot.com/docs/getting-started/account-types
- Legacy sunset: https://developers.hubspot.com/changelog/legacy-public-app-creation-sunset and https://developers.hubspot.com/changelog/legacy-apis-and-legacy-apps-whats-going-unsupported-and-when
- 2026.09 / Fall Spotlight: https://developers.hubspot.com/changelog/fall-2026-spotlight
- OAuth: working-with-oauth, oauth-quickstart-guide, and api/oauth/tokens (all on developers.hubspot.com)

## Surprises that should change our guidance
- **Legacy public apps can no longer be created.** Creation was disabled on May 26, 2026 for new accounts and June 23, 2026 for existing ones. CLI projects are the only path, and most older tutorials are wrong.
- **There is no separate developer account any more.** Developer tooling lives in any standard account, including free ones. The old developer signup URL now redirects to the CRM signup with intent=developer (observed live).
- **Unlisted marketplace apps are capped at 25 installs.** Unlimited installs need a Marketplace listing, and the listing needs 3 active unaffiliated installs first. This chicken-and-egg step is the real time cost.
- **Legacy apps and v1-v3 APIs become unsupported in September 2027.** Projects 2025.2 apps must move to 2026.09 by March 2027. OAuth v1 token endpoints are deprecated on Feb 16, 2027, so use `/oauth/v3/token`.
- **Two new 2026.09 features matter for agent builders:**
  - User-level apps (`isUserLevel: true`)
  - Service Keys, which replace legacy private apps for single-account and agent use

  MCP server components need extra HubSpot review.

## Conflicts between sources
- **Who can install.** working-with-oauth says a Super Admin or a user with "HubSpot Marketplace Access" permission. The quickstart says Super Admin only.
- **Private distribution cap for Solutions Partners.** The 2025 changelog says 100 accounts. The current manage-apps doc only mentions 10 allowlisted accounts.
- **Which apps the 25-install cap covers.** The changelog names 2025.2. The manage-apps doc states the cap for marketplace OAuth apps in general.
- **Token docs.** The tokens doc still documents v1 endpoints. The quickstart uses v3. Both endpoints answered live.

## Could not verify
- Refresh token lifetime or rotation. Only community staff say tokens are valid until uninstall.
- Real-world review durations.
- Whether sensitive scopes get extra review.
- The 110 requests per 10 seconds rate limit. Seen only in a search snippet.
- Community thread https://community.hubspot.com/t/app-installs-limit/152805 returned 403.

## Difficulty rationale
I rated it "hard" because a mandatory manual review stands between you and unlimited users, and you first need 3 real customers. In practice it feels moderate for early stage: you can serve 25 accounts on day 1 with no review and no security assessment.
