# Verification log

How we checked the guidance, what held up, what we corrected, and what we still couldn't confirm.

Four layers, from cheapest to strongest:

| Layer | Who | What it catches |
|---|---|---|
| 1. Research with citations | 6 research agents, one per app | Every claim carries a label (tested / sourced / inferred / unverified) and source links |
| 2. Independent desk check | A separate verifier agent told to assume the researchers were wrong | Wrong facts, over-claiming, stale info, using primary sources fetched fresh |
| 3. Editorial review | A person | Ratings and framing that don't fit our own definitions; readability |
| 4. Hands-on setup attempts | A person, with free accounts | Whether the console actually matches the docs |

---

## 1. Independent desk check (12 high-stakes claims)

Full table with quotes and URLs: [`verification-desk.md`](verification-desk.md).

**Result: 11 confirmed, 1 corrected. No numbers were wrong.**
Every sampled scope class, token lifetime, user cap, install threshold and review window matched current official sources.

**What we corrected:**

| App | Was | Now | Why |
|---|---|---|---|
| LinkedIn | "Every app must be associated with a Page" | "The create-app form asks for a Page, and LinkedIn requires one for certain products" | LinkedIn Help says "for certain functionality and products" |
| LinkedIn | "Approval is unlikely for general developers", labelled *sourced* | Same text, labelled *inferred* | The docs say "approved users only"; "unlikely" is our judgment |
| Google | CASA needed "only if" data touches your servers | CASA "applies when" data touches your servers | Google's page says "if"; "only if" implied an escape hatch most agents don't have |
| HubSpot | "Only through the CLI" | "Legacy UI creation disabled; the CLI is the documented path" | The sunset covered the UI, not every non-CLI method |
| Slack | Existing installs throttled? *Unverified* | Existing installs exempt, *sourced* | The verifier found the official changelog statement the researcher missed |
| GitHub | Expiring OAuth App tokens: "per current docs", no date | Default since 2026-08-14, cited | The verifier found the GitHub changelog the researcher said didn't exist |

**What this taught us about the research agents:**
- **Absolutes.** They turn conditional official wording into absolutes ("every", "only if", "only via"). The fix is in the prompt and the audit step: watch for absolutes.
- **Opinion labelled as fact.** They sometimes label editorial judgment as *sourced*. The audit step now downgrades this.
- **Labels sometimes too cautious.** They sometimes stop searching before finding a confirming primary source. That's the safe direction to err in, but it makes guides look less certain than they are.
- **Thresholds go stale.** Slack's Marketplace minimum went 10 → 5 → 10 in a year. Every guide shows a last-checked date for this reason.

## 2. Editorial corrections

| App | Change | Reasoning |
|---|---|---|
| HubSpot | Difficulty **hard → moderate** | The agent applied "mandatory review" literally. But 25 accounts can connect on day one with no review, and review only matters at scale. That matches our definition of moderate: self-serve, with limits. |
| All | Headline time ranges shortened, plus an explicit **"assumes"** line | Agents wrote paragraphs ("same day / 1–4 weeks / 6 weeks–4 months"). A developer needs one number and the assumption behind it. The per-tier times moved into the permission table. |
| Slack | Kept **hard**, though setup takes minutes | For an agent that reads messages, unlisted apps are throttled to 1 request/min and blocked from search/MCP. Realistically a Marketplace listing is required. This is the most important "nuance" in the library. |

## 3. Hands-on setup attempts

> Pending: being run with free GitHub and Google accounts. See [`HANDS_ON.md`](HANDS_ON.md) for the checklist.

| App | Claim checked | Result | Evidence |
|---|---|---|---|
| GitHub | "Expire user access tokens" checked by default on new OAuth Apps | | |
| GitHub | Time to working dev app 15–60 min | | |
| Google | Console names: Google Auth Platform → Branding / Audience / Clients / Data Access | | |
| Google | `gmail.readonly` shown as restricted, `gmail.send` as sensitive | | |
| Google | Testing mode: 100 test-user cap | | |
| Google | "Google hasn't verified this app" screen for an unverified client | | |
| Google | Time to working dev app 30–90 min | | |

**Not attempted:**
- **Slack:** no workspace available. Desk-checked only.
- **Notion, HubSpot, LinkedIn:** desk-checked only.
- **Any provider review or approval:** reviews take weeks and need a real product.

## 4. Live agent tests in production

| Test | What happened | What we changed |
|---|---|---|
| First live run (Harvest) | Correct guide, but only 2 of 7 pages it read were useful: the same-named "Greenhouse Harvest" API, YouTube, a competitor review and Capterra | Search the provider's own domain first; drop review, video and social sites; third-party pages only from an allowlist of documentation sites |
| Freshdesk | The live agent wrote a guide about Freshworks Marketplace apps calling *other* services, the wrong direction. Freshdesk's API only takes keys (the research agent had already declined to write one) | Audit now checks direction and refuses to save. **Re-run in production on 2026-10-20: rejected, as intended** ($0.025) |
| "Harvest" rejected as ambiguous | The cheap first check said "could be a generic term" | Ambiguous names resolve to the most likely software product |
| Harvest after the agent upgrade | Sources all official (help.getharvest.com, support.getharvest.com, id.getharvest.com); 9 steps vs 6; the agent decided to look up "app review process timeline" and "rate limits"; 3 logged-out setup checks recorded | Live checks now always appear as Tested notes; before/after files in `docs/evidence/` |

Costs from the ledger: live guides $0.014–0.025; chat answers $0.0003–0.0016.

## 5. Timeline audit (top 25 guides)

A user compared our Google guide with another assistant's answer and found the headline inflated: "6 weeks – 4+ months", with an upper bound taken from forum reports of stalled reviews. The other answer was also wrong in places (it gave sensitive scopes "3–7 days" where Google says 10 business days, and left out CASA).

Rule applied: the headline is the provider's **official or typical** range; worst-case stalls go into the *assumes* text; ranges without a published timeline are labelled inferred. **9 of 25 ranges corrected**, including Google (now 6–10 weeks, from Google's FAQ: restricted verification "6 weeks", "not guaranteed", plus CASA), Slack, HubSpot, Meta, LinkedIn, Zoom, Shopify, YouTube and Fitbit. 17 were confirmed unchanged. Details and quotes: [`timing-audit.md`](timing-audit.md).

## 6. Security review

An independent review of the code, git history, dependencies, prompt-injection paths and the database role found no secrets anywhere, and 2 High and 6 Medium issues, all fixed. One of the fixes changes the evidence model: the model can no longer mark a claim **Tested**; only our own live checks can. See [`SECURITY_REVIEW.md`](SECURITY_REVIEW.md).

## What remains uncertain

Each guide lists its own open questions under "Still uncertain". The biggest across the library:
- **Real review times** (Google, Slack, HubSpot, LinkedIn). Providers publish maximums or targets; real-world times come only from forum anecdotes.
- **CASA cost** (Google). Only third-party pricing exists (roughly $500–$6,000+/yr), and it's labelled unverified.
- **Migrated HubSpot apps:** whether legacy apps migrated to the new platform also get the 25-install cap.
- **Notion REST access-token lifetime:** not documented.
