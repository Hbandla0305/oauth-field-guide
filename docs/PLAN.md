# OAuth App Setup Guides — Product & Technical Plan

> Status: APPROVED 2026-10-19. Budget: 6–8 hours total. Each phase ends with a checkpoint.
>
> **Decisions made at review:**
> - D9 → show **all** permission tiers on every guide (no up-front scope question; keeps the flow to one input).
> - App set approved as listed.
> - Hands-on attempts: **GitHub and Google** (Slack stays desk-researched and is labelled that way).
> - **Hard spend cap: $2 total of OpenAI usage**, enforced in code (see §6 Guardrails), not just in a dashboard.
> - **Neon Postgres** for generated guides, the spend ledger and rate limits.
> - Keep it simple: one input, one guide page, no accounts.

---

## 1. Problem, in my own words

An **agent builder** wants their end users to connect apps like Gmail, Slack or HubSpot. Three layers are involved:

| Layer | What it is | Who owns it |
|---|---|---|
| **Provider OAuth app** | A registration with the provider: client ID/secret, redirect URIs, allowed scopes, branding, review status | The developer (or a platform's *managed* app) |
| **Integration** | The developer's code that runs the OAuth flow and calls the provider API | The developer |
| **Connection** | One end user's grant (tokens) issued *under* that OAuth app | Each end user |

A **managed OAuth app** (the platform's shared credentials) gets a developer to a working prototype quickly. For production they usually need **their own** app: their brand on the consent screen, their own rate limits, scopes the managed app doesn't hold, and a direct relationship with the provider. Registering one is the painful part.

**Why it's painful (hypotheses to confirm while researching):**
- **Two clocks, not one.** "Works for me in dev mode" can take minutes. "Any user can connect" can take weeks (Google restricted scopes → CASA security assessment; Meta app review + business verification).
- **Scope choice drives difficulty.** The same provider can be trivial or hard depending on which scopes you request (Google: non-sensitive vs sensitive vs restricted).
- **Hidden gates.** Gates you don't find out about until you hit them: user caps in testing mode, partner programs you have to apply to (LinkedIn), paid tiers (X), domain verification, privacy policy and homepage requirements, demo videos.
- **Docs are scattered.** The rules sit across console UIs, policy pages, forum threads and reviewer emails, and they change often.

**The developer's real questions:** *How hard is this? How long will it take, including waiting? What could block me? What can be done for me, and when do I have to take over?*

## 2. Target user & job to be done

- **Primary:** an engineer or technical founder building an agent. They have a list of 3–10 apps their users want to connect and have to decide what to support at launch.
- **Job:** "Before I commit to supporting App X, tell me what it takes to get production-ready OAuth, and walk me through it."
- **Secondary:** their PM or lead, who receives the shared guide link and needs the effort and risk at a glance.

## 3. Key product decisions

| # | Decision | Why | Alternative rejected |
|---|---|---|---|
| D1 | **Lead with a verdict card** (difficulty tier + two timelines) before any steps | The first question is "go / no-go / when", not "how" | Long docs-style page (that's the status quo) |
| D2 | **Split time-to-dev from time-to-production** | That gap is the core insight and where the surprises live | A single "time estimate" number |
| D3 | **Scope-aware guidance:** the guide lists scope tiers and how each changes the path | Difficulty depends on scopes, not just the provider | One path per provider |
| D4 | **Every step tagged 🤖 Agent can do / 👤 You must do / ⏳ Waiting** | The brief asks what an agent can do vs. where a human takes over | Untagged checklist |
| D5 | **Every claim carries an evidence label and source** (✅ Tested · 📄 Sourced · 🤔 Inferred · ❓ Unverified) plus a "last checked" date | Trust is the product. Provider rules change, and a wrong guide costs weeks | Polished guides with no provenance |
| D6 | **Blockers section: symptom → cause → fix** | Developers arrive at a guide mid-failure ("why is my app limited to 100 users?") | FAQ |
| D7 | **Live generation reuses the same schema and labels** and is marked "Agent-generated, not human-reviewed" | Consistent output. Being honest about review status matters more than looking polished | Free-form chat answer |
| D8 | **Shareable permalink per guide** plus copy-as-Markdown | "Use and share" is explicitly in the brief, and guides get pasted into tickets and Slack | Login-gated workspace |
| D9 | **[DECIDE]** Ask the developer up front which scopes or use case they need ("read email", "post messages") so the guide can be personalised | Sharper verdict | Adds friction. Fallback: show all tiers |

**Scope focus (one line for the README):** *We optimise for the go/no-go and planning decision plus a followable path, not for automating the console clicks.*

## 4. Guide format (schema)

Every guide (curated or generated) is one JSON document validated with zod:

```
Guide {
  app: { name, slug, website, category, logoUrl? }
  verdict: {
    difficulty: "trivial" | "moderate" | "hard" | "gated"
    timeToDev:  { range: "15–30 min", evidence }
    timeToProd: { range: "2–6 weeks", includesWaitFor: "Google verification + CASA", evidence }
    summary: 2 sentences
    cost?: "CASA assessment fees may apply" | null
  }
  prerequisites: [ { item: "Verified domain", why, evidence } ]
  scopeTiers: [ { tier: "Basic profile/email", examples: [...], reviewRequired: bool, notes, evidence } ]
  steps: [ { order, title, owner: "agent" | "human" | "wait", detail, url?, duration?, evidence } ]
  agentCanDo: [ "Draft privacy policy", "Draft scope justification text", "Verify redirect URI config" ]
  humanMustDo: [ "Business verification", "Record demo video", "Pay for assessment" ]
  blockers: [ { symptom, cause, fix, evidence } ]
  nuances: [ { text, evidence } ]        // rate limits, token expiry, refresh-token quirks, per-workspace install, etc.
  sources: [ { id, url, title, retrievedAt } ]
  verification: { status: "human-verified" | "agent-generated", lastChecked, testedSteps: [...], openQuestions: [...] }
}
evidence = { label: "tested" | "sourced" | "inferred" | "unverified", sourceIds: [], note? }
```

## 5. Curated library (the demo set)

Chosen to cover the whole difficulty range, not for popularity:

| App | Expected tier | What it demonstrates |
|---|---|---|
| **GitHub** | Trivial | Self-serve, no review. The baseline (OAuth App vs GitHub App choice is the nuance) |
| **Notion** | Trivial → moderate | Public vs internal integration; required URLs for public integrations |
| **Slack** | Moderate | Works immediately in your own workspace. Distribution needs settings, and Marketplace listing is an optional review |
| **HubSpot** | Moderate | Developer account + public app; Marketplace listing is optional with its own requirements |
| **Google (Gmail)** | Hard | Testing-mode user cap, sensitive vs restricted scopes, brand verification, CASA |
| **LinkedIn** | Gated | Basic sign-in is self-serve. Most useful APIs need partner program approval |

**[DECIDE]** Swap in Salesforce, Microsoft (Entra), Zoom or X if you prefer. Keep at least one from each tier.
Each of these facts gets verified in Phase 2 before it appears in a guide.

## 6. The agent (live generation)

**Input:** app name or URL (plus an optional use case, per D9).
**Output:** a Guide JSON, streamed progress, a saved permalink.

Pipeline: each stage is shown live in the UI so the user sees the work happening.

1. **Resolve.** Identify the app, canonical website and developer portal. Fail fast if it doesn't support OAuth, and say so plainly. That's a useful answer, not an error.
2. **Research.** Web search plus fetches of the official docs: app registration, scopes, review/verification policy, rate limits. Prefer official docs, then forums, then blogs, and keep every URL.
3. **Probe (safe, automated attempts):**
   - Fetch `/.well-known/openid-configuration` / OAuth metadata if present → confirms endpoints and supported grants (✅ tested).
   - Request the authorize endpoint with a dummy `client_id` and record the response (confirms the endpoint is live and shows error behaviour).
   - Check that the developer console / app-creation URL resolves and whether it is self-serve or "contact sales / apply".
   - All probes are GETs to public URLs, with an SSRF guard (no private IPs) and timeouts.
4. **Synthesize.** Fill the schema with structured output. Every claim must cite a source ID or probe result, or be labelled inferred/unverified.
5. **Critique.** A second model pass audits the draft: downgrades claims without sources, flags contradictions, fills `openQuestions`.
6. **Publish.** Save to storage, return the permalink.

**Guardrails (hard $2 cap):**
1. **Spend ledger in Neon.** Before a run, *reserve* the worst-case cost of one run atomically. If total spend plus reservations would exceed the cap ($1.80 in code, a $0.20 margin under $2), refuse. After the run, settle to the actual cost from the API's `usage` (tokens × price, plus per-search fees).
2. **Per-run ceilings:** max output tokens per call, a limit on web searches per run, a total time limit, and a single model set in config. The cheaper model handles the critique pass.
3. **Caching:** a repeat request for the same app returns the saved guide with no model call.
4. **Rate limits:** per IP (3 runs/hour), plus a global cap on runs per day.
5. **Input validation:** app name ≤ 80 chars, allowed characters only, and a cheap first check rejects non-apps or prompt-injection attempts before any expensive work.
6. **Prompt injection:** fetched web content is treated as untrusted data. The model can't call arbitrary URLs, only our safe probe tool (public HTTPS, no private IPs, short timeout, small response cap).
7. **Kill switch:** setting the env var `GENERATION_ENABLED=false` disables live runs while the library keeps working.
8. **Belt and braces:** a dedicated OpenAI project with a key restricted to that project and a $2 project budget set in the OpenAI dashboard (you do this).

**What the agent does *not* do:** create accounts, log in or submit reviews. Those are listed as 👤 steps. (The brief says no paid accounts or approvals are needed.)

## 7. Evidence & verification plan ("show us that it works")

**For the curated set:**
- **Desk check:** each claim is traced to an official source and labelled.
- **Hands-on attempts (you, about 45–60 min, free accounts, no secrets committed):**
  - [ ] Create a GitHub OAuth App → time it, screenshot it
  - [ ] Create a Slack app in a free workspace and install it to your own workspace
  - [ ] Create a Google Cloud project + OAuth consent screen in Testing mode, add a sensitive Gmail scope, and note the warnings and the user cap
  - [ ] (Optional) Notion public integration or HubSpot developer account
- **Agent-vs-reality check:** run the live agent on 3 curated apps *before* hand-correcting, then diff its output against the verified guide. This measures agent accuracy and gives the "what I learned / corrected" story.

**Artifact:** `docs/VERIFICATION.md`, a table of claim → method (tested/sourced) → result (confirmed / corrected / could not verify) → note. Corrections are the most valuable rows, so we keep them visible.

## 8. Architecture

- **Next.js (App Router) + TypeScript + Tailwind** on **Vercel**.
- **OpenAI Responses API** with the built-in `web_search` tool, plus our own function tools for probes. Model set via an `OPENAI_MODEL` env var. Structured output validated by the zod schema.
- **Streaming:** a route handler streams Server-Sent Events (stage updates, sources found, final guide). The function's `maxDuration` is set high enough for a run of about 1–3 minutes.
- **Storage:** curated guides are JSON files in the repo (reviewable in PRs). Generated guides go to Vercel Blob (or Upstash Redis via Marketplace) keyed by slug.
- **Pages:** `/` (search + library grid with difficulty badges) · `/guides/[slug]` (guide) · `/generate?app=` (live run view → redirects to the permalink).
- **Secrets:** `OPENAI_API_KEY` only in Vercel env vars and `.env.local` (gitignored), with `.env.example` in the repo.

## 9. Phases & time budget

| Phase | Work | Time | Checkpoint |
|---|---|---|---|
| 0 | Finalise this plan, pick the app set | 0.5h | You approve the plan |
| 1 | Research + write 6 curated guides as JSON (agents research in parallel, I edit) | 2h | You skim 2 guides |
| 2 | Hands-on attempts + verification log | 1h | VERIFICATION.md filled in |
| 3 | App UI: library, guide page, share/copy | 1.5h | Click-through locally |
| 4 | Live agent + streaming + storage | 1.5h | Generate a guide for an unfamiliar app (e.g. Zoom, Calendly, Asana) |
| 5 | Deploy, README, demo rehearsal with 3 surprise apps | 1h | Public URL + repo link |

## 10. Out of scope (stated in the README)

- All 100 guides (the format and pipeline are built to scale to them; see "how we'd get to 100")
- Automating console clicks or account creation (browser agents against provider consoles are brittle and against some ToS)
- Auth/accounts, editing guides in-app, freshness monitoring (described as next steps: a scheduled re-check that diffs sources)

## 11. Risks

- **Agent hallucinating requirements** → mitigated by forced citations, the critique pass and visible labels.
- **Slow or expensive live runs during the demo** → caching, a time cap, and pre-warming 1–2 likely picks.
- **Provider rules have changed since docs were written** → "last checked" dates, labels, and a note on openQuestions.

## 12. Open questions for you

1. D9: ask for scopes/use case up front, or show all tiers? (I lean toward an optional "what do you need to do?" field.)
2. App set OK as-is?
3. Can you set aside about 1h for the hands-on attempts in Phase 2? They're the strongest evidence in the submission.
4. GitHub account/org for the repo, and do you have a Vercel account?
5. Rough OpenAI spend you're comfortable with for dev + demo (estimate: a few dollars)?
