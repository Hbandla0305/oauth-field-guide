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

## 4. Live agent vs. checked guides

> Pending: we run the live agent on library apps (bypassing the cache) and compare its output with the checked guides.

## What remains uncertain

Each guide lists its own open questions under "Still uncertain". The biggest across the library:
- **Real review times** (Google, Slack, HubSpot, LinkedIn). Providers publish maximums or targets; real-world times come only from forum anecdotes.
- **CASA cost** (Google). Only third-party pricing exists (roughly $500–$6,000+/yr), and it's labelled unverified.
- **Migrated HubSpot apps:** whether legacy apps migrated to the new platform also get the 25-install cap.
- **Notion REST access-token lifetime:** not documented.
