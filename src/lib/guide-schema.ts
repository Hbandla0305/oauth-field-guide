import { z } from "zod";

// How we know a claim is true. Shown next to every claim in the UI.
//   tested     – we (or the agent) observed it directly: a setup attempt or a live probe
//   sourced    – stated in a cited source (official docs preferred)
//   inferred   – reasoned from sources but not stated outright
//   unverified – reported somewhere (forums, older docs) but not confirmed
export const EvidenceLabel = z.enum(["tested", "sourced", "inferred", "unverified"]);

export const Evidence = z.object({
  label: EvidenceLabel,
  sourceIds: z.array(z.string()),
  note: z.string().nullable(),
});

const Hours = z.object({ min: z.number(), max: z.number() });

export const Difficulty = z.enum(["trivial", "moderate", "hard", "gated"]);
export const StepOwner = z.enum(["agent", "human", "wait"]);

export const Guide = z.object({
  app: z.object({
    name: z.string(),
    slug: z.string(),
    website: z.string(),
    developerPortal: z.string(),
    category: z.string(),
  }),
  // Direct links to the provider's own pages, shown as quick links at the top of a guide.
  officialDocs: z.array(
    z.object({
      kind: z.enum(["oauth", "scopes", "review", "console", "api", "changelog"]),
      label: z.string(),
      url: z.string(),
    }),
  ),
  verdict: z.object({
    difficulty: Difficulty,
    summary: z.string(),
    // range is the short headline ("6–16 weeks"); hours drive the timeline bar.
    timeToDev: z.object({ range: z.string(), hours: Hours, evidence: Evidence }),
    timeToProd: z.object({
      range: z.string(),
      hours: Hours,
      // The path the headline assumes, when time depends on scopes or scale.
      assumes: z.string(),
      waitingOn: z.string(),
      evidence: Evidence,
    }),
    cost: z.string().nullable(),
  }),
  prerequisites: z.array(
    z.object({ item: z.string(), why: z.string(), evidence: Evidence }),
  ),
  scopeTiers: z.array(
    z.object({
      tier: z.string(),
      examples: z.array(z.string()),
      reviewRequired: z.boolean(),
      time: z.string(),
      impact: z.string(),
      evidence: Evidence,
    }),
  ),
  steps: z.array(
    z.object({
      title: z.string(),
      owner: StepOwner,
      detail: z.string(),
      url: z.string().nullable(),
      duration: z.string().nullable(),
      evidence: Evidence,
    }),
  ),
  agentCanDo: z.array(z.string()),
  humanMustDo: z.array(z.string()),
  blockers: z.array(
    z.object({
      symptom: z.string(),
      cause: z.string(),
      fix: z.string(),
      evidence: Evidence,
    }),
  ),
  nuances: z.array(z.object({ text: z.string(), evidence: Evidence })),
  sources: z.array(
    z.object({ id: z.string(), title: z.string(), url: z.string() }),
  ),
  verification: z.object({
    // human-verified: checked by a person. agent-researched: built offline by research
    // agents and link-checked. agent-generated: written live by the in-app agent.
    status: z.enum(["human-verified", "agent-researched", "agent-generated"]),
    lastChecked: z.string(),
    // Set when a person has checked the guide; corrections record what that check changed.
    reviewedOn: z.string().nullable(),
    corrections: z.array(z.object({ claim: z.string(), before: z.string(), after: z.string(), source: z.string() })),
    tested: z.array(z.string()),
    openQuestions: z.array(z.string()),
  }),
});

export type Guide = z.infer<typeof Guide>;
export type Evidence = z.infer<typeof Evidence>;
export type Difficulty = z.infer<typeof Difficulty>;
