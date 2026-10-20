# Research brief for library guides

Every agent-researched guide follows this brief, so guides are comparable across 100+ apps.
Schema: `src/lib/guide-schema.ts`. Reference examples, which are checked guides: `src/data/guides/google.json`, `src/data/guides/slack.json`.

## Reader

A developer building an AI agent who needs **their own production OAuth app** with this provider, so their end users can connect accounts. They want to know:
- how hard it is
- how long until it works in dev, and how long until **any** user can connect (including review waits)
- requirements and nuances
- blockers
- what an AI agent can do for them vs. what they must do themselves

## Method

1. Use WebSearch and WebFetch. **Official docs first** (developer portal, OAuth guide, scopes reference, app review/marketplace policy, changelog). Use community posts only for real-world blockers, and label them `unverified`.
2. Budget about 10–15 tool calls per app. Go deep on the review/approval path and the agent-relevant scopes (reading data, not just sign-in).
3. Safe live checks are allowed: fetch `/.well-known/openid-configuration`, or check that the authorize or console URL resolves. Never log in or create accounts.
4. Watch for **recent changes**: renamed consoles, sunset app types, new rate limits for AI/unlisted apps, marketplace requirement changes. Prefer the newest official source.

## Evidence rules (strict: under-claim rather than over-claim)

- `tested`: only what you observed yourself with a live check. Say what you saw in `note`.
- `sourced`: stated in a source you cite. It must have `sourceIds`.
- `inferred`: your reasoning from sources. Opinions ("unlikely", "easy", "rarely approved") are always `inferred`.
- `unverified`: forums, old docs, or conflicting sources. Say why in `note`.
- **No em dashes** anywhere in guide text.
- **No absolutes the source doesn't use.** Don't write "every", "only if", "always" or "must" unless the source says it that strongly.
- Every source must be a real https URL you opened. Never invent URLs.

## Field rules

- `app.slug`: the given slug. `app.category`: 1–3 words.
- `officialDocs`: 3–6 direct links, each `kind` one of oauth | scopes | review | console | api | changelog. Labels in plain words ("OAuth 2.0 guide", "Scopes reference", "App review policy", "Developer console").
- `verdict.difficulty`:
  - `trivial`: self-serve, no review, any user the same day
  - `moderate`: self-serve, but with install/user caps, required config or optional review
  - `hard`: mandatory review or security assessment before most users can connect
  - `gated`: useful APIs need acceptance into a partner program or a paid tier
- `verdict.summary`: at most 2 sentences. The first sentence states the main gate or limitation that sets the difficulty; what's easy comes second (the first sentence is shown alone as the headline).
- `timeToDev.range` and `timeToProd.range`: SHORT, e.g. "15–60 min", "Same day", "2–6 weeks". `hours.min/max` in hours (day = 24, week = 168, month = 720).
- `timeToProd.assumes`: one sentence naming the path the headline assumes. Pick what a typical AI agent needs (reading or writing user data), and mention the faster path if there is one.
- `timeToProd.waitingOn`: what you wait for, or "No review needed".
- `verdict.cost`: required fees, or null.
- `scopeTiers`: 2–5 tiers grouped by how they change the review path. Give real scope strings in `examples` and a short `time` per tier.
- `steps`: 6–14 concrete steps, from account to production-ready. `owner` is one of:
  - `agent`: research, drafting policy/justification/descriptions, generating config, checking endpoints
  - `human`: login, console clicks, verification, payment, video
  - `wait`: provider review

  Link exact console URLs.
- `blockers`: 3–8 real symptoms (error strings, caps, warning screens), each as symptom → cause → fix.
- `nuances`: 3–8. Token lifetimes and refresh, rate limits, per-workspace or admin installs, data-use policies for AI.
- `agentCanDo`, `humanMustDo`: 3–6 short imperative phrases each.
- `verification`: status `"agent-researched"`, lastChecked `"2026-10-20"`, `tested` = live checks you actually did (can be empty), `openQuestions` = 2–5 things you couldn't confirm.

## Done means

- The file is written to `src/data/guides/<slug>.json`.
- `npm run validate src/data/guides/<slug>.json` passes (run it from the project dir).
- If the app does **not** offer OAuth to third-party developers, don't write a guide. Report it instead.
