// Every number that bounds cost lives here, so the guardrails can be reviewed in one place.
// Prices: https://developers.openai.com/api/docs/pricing (checked 2026-10-19), USD per 1M tokens.

export const MODELS = {
  research: "gpt-5-mini", // writing the guide, and answering questions about one
  fast: "gpt-5-nano", // input screening and the evidence audit
} as const;

const PRICES: Record<string, { input: number; cachedInput: number; output: number }> = {
  "gpt-5-mini": { input: 0.25, cachedInput: 0.025, output: 2.0 },
  "gpt-5-nano": { input: 0.05, cachedInput: 0.005, output: 0.4 },
};

export const WEB_SEARCH_USD_PER_CALL = 0.01;

export const LIMITS = {
  totalBudgetUsd: 1.8, // hard stop, $0.20 under the $2 ceiling
  reservePerRunUsd: 0.2, // worst case for one run, held until the run settles
  maxSearchesPerRun: 6,
  maxOutputTokens: { screen: 2_000, research: 24_000, audit: 16_000 },
  runsPerIpPerHour: 3,
  runsPerDay: 25,
  runTimeoutMs: 240_000,
  inputMaxLength: 80,
  chat: {
    reservePerMessageUsd: 0.01,
    perIpPerHour: 20,
    perDay: 300,
    maxTurns: 8, // messages in one conversation, both sides
    maxQuestionLength: 500,
    maxOutputTokens: 1_200,
  },
  firecrawl: {
    totalCredits: 400, // hard cap across all runs; free tier is enough for dev + demo
    reservePerRun: 20,
    resultsPerQuery: 4,
    maxPages: 8,
    maxCharsPerPage: 12_000,
  },
} as const;

export type Usage = {
  input_tokens: number;
  output_tokens: number;
  input_tokens_details?: { cached_tokens?: number } | null;
};

export function costOf(model: string, usage: Usage | undefined | null, searches = 0): number {
  const price = PRICES[model];
  if (!price) throw new Error(`No price configured for ${model}`);
  const cached = usage?.input_tokens_details?.cached_tokens ?? 0;
  const uncached = (usage?.input_tokens ?? 0) - cached;
  return (
    (uncached * price.input + cached * price.cachedInput + (usage?.output_tokens ?? 0) * price.output) / 1_000_000 +
    searches * WEB_SEARCH_USD_PER_CALL
  );
}

export function generationEnabled(): boolean {
  return process.env.GENERATION_ENABLED !== "false" && Boolean(process.env.OPENAI_API_KEY) && Boolean(process.env.DATABASE_URL);
}
