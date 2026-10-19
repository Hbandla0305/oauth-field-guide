# Google (Gmail, Calendar, Drive): research notes

Checked 2026-10-19. Guide: `src/data/guides/google.json`.

## Key sources (official)
- Manage App Audience (Testing/In production, 100 test users, 7-day expiry, lifetime 100-user cap): https://support.google.com/cloud/answer/15549945
- Manage OAuth App Branding (Verify Branding button, 7-day validity, Verification Center): https://support.google.com/cloud/answer/15549049
- OAuth verification FAQ (timeline table, CASA payment): https://support.google.com/cloud/answer/13463817
- Production-readiness pages (brand / sensitive / restricted): https://developers.google.com/identity/protocols/oauth2/production-readiness/
- Security assessment (CASA, AL1/AL2, annual): https://support.google.com/cloud/answer/13465431
- When verification is not needed: https://support.google.com/cloud/answer/13464323
- Gmail scopes table: https://developers.google.com/workspace/gmail/api/auth/scopes. Drive scopes table: https://developers.google.com/workspace/drive/api/guides/api-specific-auth
- Gmail API Policy (updated 2026-09-03): https://developers.google.com/workspace/gmail/api/policy
- Workspace API User Data & Developer Policy (AI/ML training ban): https://developers.google.com/workspace/workspace-api-user-data-developer-policy

## Current naming
The current UI is **Google Auth Platform**, with the pages Overview, **Branding**, **Audience**, **Clients**, **Data Access**, and **Verification Center**. Many older help pages still say "OAuth consent screen" or "APIs & Services". Console routes `console.cloud.google.com/auth/{branding,audience,scopes,clients,verification}` all 302 to login with the path preserved. That means the routes exist, but I couldn't see them render.

## Conflicts between sources
- **Sensitive scope review time:** the dev docs say "typically 3-5 business days" and the support FAQ says "10 Business days". Restricted is "6 weeks" in the FAQ and "several weeks" in the dev docs. Brand review is 2-3 business days if it goes to manual review, otherwise "a few minutes".
- **CASA tiers:** Google now uses AL1/AL2 (the older names were Tier 1/2/3). The FAQ still mentions a "free tier 2 assessment" (scan your own app) versus paying a lab. The ADA tiering page describes both AL1 and AL2 as "Lab Tested - Lab Verified". I treated the free path as unverified.
- **CASA prices** are third-party only, from search summaries. I did not fetch the vendor pages directly. TAC lists Tier 2 at ~$540-$720 and an Enterprise/Tier 3 plan at $3,600. Switchlabs (Nov 2024) gives Tier 3 at ~$4,500. Leviathan charges $3k-$6k for Tier 2. Google says it charges nothing and that the price is set between the developer and the lab.

## Could not verify
- Per-scope Calendar sensitivity. There is no official table. Reading events is cited as a sensitive example, and no Calendar scope appears on a restricted list. A forum post says `calendar.app.created` and `calendar.freebusy` don't appear in the Data Access picker.
- CASA assurance-level thresholds (user counts) and real lab turnaround.
- Whether Workspace "access is blocked by default" for unconfigured third-party apps applies to every tenant.
- Exact error strings. These come from community threads, not Google docs.

## Surprises that should change guidance
1. **`gmail.compose` (drafts) is restricted.** A "draft-only, human sends" agent still needs CASA. `gmail.send` is only sensitive.
2. **The Gmail policy now requires prompt-injection protection** (Model Armor "or other prompt injection protection") for restricted-scope apps, and explicitly allows gen-AI summaries. This is directly relevant to AI agents.
3. **The AI/ML training ban** applies to Workspace data beyond the individual user's personalized model.
4. **The 100-user unverified cap is lifetime per project and can't be reset.** Use a clean prod project.
5. **Brand verification results expire in 7 days** if not published, and published branding is a prerequisite for data-access review.
6. **CASA applies only if restricted data is stored on or passes through your servers** (restricted scope page). Server-side agents can't avoid it.
7. **Escape hatches:** Internal user type (single Workspace org), a customer admin marking your client as Trusted, or a unified-API vendor's pre-verified app (e.g. Nylas).
8. **Real-world reviews can stall for months.** One forum thread shows a sensitive-scope review pending Apr-Aug 2026 with no Trust & Safety email.
