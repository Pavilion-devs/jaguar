import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { LaunchTimelineEntry, ScoredLaunch } from "@jaguar/domain";
import { Agent, run, setDefaultOpenAIKey } from "@openai/agents";
// SDK 0.91's zod helper imports from "zod/v4" internally and walks the v4
// schema shape (`.def`, not `._def`). Our schemas must be built with the v4
// API or zodOutputFormat throws "Cannot read properties of undefined (reading 'def')".
import { z } from "zod/v4";

const CLAUDE_MODEL = "claude-haiku-4-5-20251001";
const OPENAI_MODEL = process.env.OPENAI_AGENT_MODEL ?? "gpt-5.5";
const AGENT_PROVIDER = process.env.JAGUAR_AGENT_PROVIDER ?? "openai";

// Length and numeric constraints aren't part of Anthropic's structured-output
// JSON Schema subset — the SDK strips them before sending to the API. We keep
// `.min(1)` as a runtime sanity check (catches genuinely empty strings) but do
// NOT use `.max()` here; length intent goes in the system prompt instead.
const MemoSchema = z.object({
  headline: z
    .string()
    .min(1)
    .describe(
      "One punchy line. The verdict in plain speech. For ignore: something like 'Skip it.' or 'Nothing here yet.' or 'Pass on this one.' For watch: 'Worth watching.' or 'Interesting setup.' or 'Keep an eye on this.' For enter: 'This one's live.' or 'Get in.' Be specific when a signal is strong — e.g. 'Volume just kicked in.' Do not use the words bull, bear, verdict, or ignore/watch/enter literally.",
    ),
  bull: z
    .string()
    .min(1)
    .describe(
      "Why section — the setup or evidence. 1-2 casual but precise sentences. Reference concrete observed signals: liquidity, volume, swap activity, price action, reason code, or timeline event. Write like you're explaining to a sharp friend, not filing a report. Do not invent numbers.",
    ),
  bear: z
    .string()
    .min(1)
    .describe(
      "What could go wrong section — the risk or invalidation condition. 1-2 casual but precise sentences. Reference concrete weaknesses from the input: sparse data, thin liquidity, faded momentum, volatility, invalidation event. Be direct.",
    ),
  verdict: z
    .string()
    .min(1)
    .describe(
      "Next move section. 1-2 sentences. Tell the trader what to do or watch for next. Reference the conviction delta direction (building / fading / flat) and the specific condition that would change the call. Plain language, no jargon.",
    ),
  confidence: z
    .number()
    .int()
    .describe(
      "Integer 0-100. Opportunity confidence. Keep this low for ignore/sparse/zero-liquidity setups. 80+ only when liquidity, flow, price action, and score direction are all unambiguous and redundant.",
    ),
});

export type AgentMemo = z.infer<typeof MemoSchema>;

export type AgentMemoResult = AgentMemo & {
  modelUsed: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
};

const SYSTEM_PROMPT = `You are Jaguar — a sharp, autonomous Solana launch analyst with a casual but precise voice.

Given real stored signals for a Solana launch — score, conviction deltas, reason codes, liquidity, volume, price, persona verdicts, recent timeline — write a conversational memo that tells a trader exactly what to think.

TONE
- Write like a knowledgeable trading buddy, not a compliance officer. Sharp, casual, direct.
- The headline is one punchy line — the whole take in plain speech.
- The body sections are short and specific. Cite real numbers. No filler.
- Do NOT use the words "bull", "bear", "verdict", "ignore", "watch", or "enter" literally in the output text. Talk around them naturally.

FIELDS
- headline: one punchy line summing up the take (e.g. "Skip it." / "Worth watching." / "This one's live.")
- bull (displayed as "why"): what's interesting or what the setup is. 1-2 sentences. Must cite at least one concrete signal.
- bear (displayed as "what could go wrong"): the risk or the thing that would kill this. 1-2 sentences. Cite a concrete weakness.
- verdict (displayed as "next move"): what to do or watch for. 1-2 sentences. Reference conviction delta direction and the specific trigger that changes the call.
- confidence: integer 0-100 representing opportunity confidence. Low for sparse/zero-liquidity setups. 80+ only when everything lines up.

RULES
- Never invent metrics or extrapolate beyond what the data shows.
- If DATA_TOO_SPARSE: be honest about it plainly.
- No unsupported labels (rug, scam, honeypot) unless in the input signals.
- Translate stream names to plain language: "new-pair discovery", "live pair updates", "candle data".
- No emojis. Plain text only. No padding.

Jaguar thresholds: score < 30 = pass, 30-59 = watch, 60+ = enter. Degen +5, momentum 0, risk-first -8.
Reason codes: DATA_TOO_SPARSE, LIQUIDITY_SURGED, LIQUIDITY_DROPPED, VOLUME_ACCELERATED, VOLUME_STALLED, BREAKOUT_CONFIRMED, BREAKOUT_FAILED, VOLATILITY_TOO_HIGH, MARKET_CAP_EXPANDING, SETUP_INVALIDATED.`;

const compactCurrency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const clampConfidence = (value: number) => Math.min(100, Math.max(0, value));

const calibrateOpportunityConfidence = (launch: ScoredLaunch, rawConfidence: number) => {
  const clamped = clampConfidence(rawConfidence);
  const hasSparseData = launch.reasons.includes("DATA_TOO_SPARSE");
  const hasZeroLiquidity = launch.liquidityUsd <= 0;
  const hasNoFlow =
    launch.volume1mUsd <= 0 &&
    launch.volume5mUsd <= 0 &&
    launch.volume15mUsd <= 0 &&
    launch.volume1hUsd <= 0 &&
    launch.swapCount5m <= 0 &&
    launch.swapCount1h <= 0;
  const hasThinExecution =
    hasZeroLiquidity || launch.reasons.includes("LIQUIDITY_DROPPED") || hasNoFlow;

  let maxConfidence = 100;

  if (launch.verdict === "ignore") {
    maxConfidence = Math.min(maxConfidence, 45);
  }

  if (launch.verdict === "watch" && hasThinExecution) {
    maxConfidence = Math.min(maxConfidence, 60);
  }

  if (launch.score < 10) {
    maxConfidence = Math.min(maxConfidence, 30);
  }

  if (hasSparseData || hasNoFlow) {
    maxConfidence = Math.min(maxConfidence, 25);
  }

  if (hasZeroLiquidity && launch.verdict !== "enter") {
    maxConfidence = Math.min(maxConfidence, 35);
  }

  return Math.min(clamped, maxConfidence);
};

const parseEnvLine = (line: string) => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) return null;

  const normalized = trimmed.startsWith("export ")
    ? trimmed.slice("export ".length).trim()
    : trimmed;
  const equalsIndex = normalized.indexOf("=");
  if (equalsIndex === -1) return null;

  const key = normalized.slice(0, equalsIndex).trim();
  let value = normalized.slice(equalsIndex + 1).trim();

  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }

  return key ? { key, value } : null;
};

const readEnvFileValue = (envName: string) => {
  let current = resolve(process.cwd());

  for (;;) {
    const envPath = join(current, ".env");
    if (existsSync(envPath)) {
      const lines = readFileSync(envPath, "utf8").split(/\r?\n/);
      for (const line of lines) {
        const parsed = parseEnvLine(line);
        if (parsed?.key === envName) return parsed.value;
      }
    }

    const parent = dirname(current);
    if (parent === current) return undefined;
    current = parent;
  }
};

const resolveEnvValue = (envName: string, explicitValue?: string) =>
  explicitValue ?? process.env[envName] ?? readEnvFileValue(envName);

const formatLaunchSignals = (
  launch: ScoredLaunch,
  recentTimeline: LaunchTimelineEntry[],
): string => {
  const lines: string[] = [];
  lines.push(`Token: ${launch.tokenName || launch.tokenSymbol} ($${launch.tokenSymbol})`);
  lines.push(`Pair: ${launch.pairAddress}`);
  lines.push(`Protocol: ${launch.protocol}`);
  lines.push(`Age: ${launch.ageMinutes} minutes since first seen`);
  lines.push("");
  lines.push("Score and verdict:");
  lines.push(`  score: ${launch.score} / 100`);
  lines.push(`  verdict (global): ${launch.verdict}`);
  lines.push(
    `  persona verdicts: degen=${launch.personaVerdicts.degen}, momentum=${launch.personaVerdicts.momentum}, risk-first=${launch.personaVerdicts["risk-first"]}`,
  );
  lines.push("");
  lines.push("Conviction delta (signed integers):");
  lines.push(
    `  1m=${launch.delta1m}, 5m=${launch.delta5m}, 15m=${launch.delta15m}, 1h=${launch.delta1h}`,
  );
  lines.push("");
  lines.push("Liquidity and market cap:");
  lines.push(`  liquidity USD: ${compactCurrency.format(launch.liquidityUsd)}`);
  lines.push(`  market cap USD: ${compactCurrency.format(launch.marketCapUsd)}`);
  lines.push(`  quote rate USD: ${launch.quoteRateUsd > 0 ? launch.quoteRateUsd.toFixed(8) : "0"}`);
  lines.push("");
  lines.push("Volume by window (USD):");
  lines.push(`  1m=${launch.volume1mUsd.toFixed(0)}`);
  lines.push(`  5m=${launch.volume5mUsd.toFixed(0)}`);
  lines.push(`  15m=${launch.volume15mUsd.toFixed(0)}`);
  lines.push(`  1h=${launch.volume1hUsd.toFixed(0)}`);
  lines.push("");
  lines.push("Price change percent by window:");
  lines.push(`  1m=${launch.priceChange1mPct.toFixed(2)}%`);
  lines.push(`  5m=${launch.priceChange5mPct.toFixed(2)}%`);
  lines.push(`  15m=${launch.priceChange15mPct.toFixed(2)}%`);
  lines.push(`  1h=${launch.priceChange1hPct.toFixed(2)}%`);
  lines.push("");
  lines.push("Swap counts:");
  lines.push(`  5m=${launch.swapCount5m}, 1h=${launch.swapCount1h}`);
  lines.push("");
  lines.push(
    `Reason codes (live): ${launch.reasons.length > 0 ? launch.reasons.join(", ") : "none"}`,
  );
  lines.push("");

  if (recentTimeline.length === 0) {
    lines.push("Recent timeline: no events recorded yet.");
  } else {
    lines.push("Recent timeline (newest first):");
    for (const entry of recentTimeline.slice(0, 10)) {
      lines.push(`  [${entry.severity}] ${entry.title} — ${entry.summary}`);
    }
  }

  return lines.join("\n");
};

const generateClaudeLaunchMemo = async ({
  launch,
  recentTimeline,
  apiKey,
}: {
  launch: ScoredLaunch;
  recentTimeline: LaunchTimelineEntry[];
  apiKey?: string;
}): Promise<AgentMemoResult> => {
  const resolvedKey = resolveEnvValue("ANTHROPIC_API_KEY", apiKey);
  if (!resolvedKey) {
    throw new Error(
      "ANTHROPIC_API_KEY is not set. Add it to .env or pass apiKey to generateLaunchMemo.",
    );
  }

  const client = new Anthropic({ apiKey: resolvedKey });

  // Cache breakpoint sits on the system prompt + zod schema. Anything that
  // changes per-launch (the user message body) lives after the breakpoint and
  // does not invalidate the cache.
  const response = await client.messages.parse({
    model: CLAUDE_MODEL,
    max_tokens: 4096,
    thinking: { type: "adaptive" },
    system: [
      {
        type: "text",
        text: SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    output_config: {
      // SDK 0.91 typing for zodOutputFormat references Zod v3's ZodType, but
      // the implementation walks v4's schema shape. We must pass a v4 schema at
      // runtime; the cast is to satisfy the stale type signature.
      format: zodOutputFormat(MemoSchema as never),
    },
    messages: [
      {
        role: "user",
        content: formatLaunchSignals(launch, recentTimeline),
      },
    ],
  });

  if (!response.parsed_output) {
    throw new Error(
      "Agent returned no parsed output. The model may have refused or hit max_tokens.",
    );
  }

  // The cast to `never` above erased the parsed_output type. Cast back through
  // AgentMemo (validated at runtime by zodOutputFormat against MemoSchema).
  const parsed = response.parsed_output as AgentMemo;

  return {
    ...parsed,
    confidence: calibrateOpportunityConfidence(launch, parsed.confidence),
    modelUsed: response.model,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
    cacheReadTokens: response.usage.cache_read_input_tokens ?? 0,
  };
};

const generateOpenAILaunchMemo = async ({
  launch,
  recentTimeline,
  apiKey,
}: {
  launch: ScoredLaunch;
  recentTimeline: LaunchTimelineEntry[];
  apiKey?: string;
}): Promise<AgentMemoResult> => {
  const resolvedKey = resolveEnvValue("OPENAI_API_KEY", apiKey);
  if (!resolvedKey) {
    throw new Error(
      "OPENAI_API_KEY is not set. Add it to .env or pass apiKey to generateLaunchMemo.",
    );
  }

  setDefaultOpenAIKey(resolvedKey);

  const agent = new Agent({
    name: "Jaguar launch analyst",
    instructions: SYSTEM_PROMPT,
    model: OPENAI_MODEL,
    outputType: MemoSchema,
  });

  const result = await run(agent, formatLaunchSignals(launch, recentTimeline));
  if (!result.finalOutput) {
    throw new Error("OpenAI agent returned no structured memo output.");
  }

  const parsed = result.finalOutput as AgentMemo;
  const usage = result.runContext.usage;

  return {
    ...parsed,
    confidence: calibrateOpportunityConfidence(launch, parsed.confidence),
    modelUsed: OPENAI_MODEL,
    inputTokens: usage.inputTokens,
    outputTokens: usage.outputTokens,
    cacheReadTokens: 0,
  };
};

export const generateLaunchMemo = async (input: {
  launch: ScoredLaunch;
  recentTimeline: LaunchTimelineEntry[];
  apiKey?: string;
}): Promise<AgentMemoResult> => {
  if (AGENT_PROVIDER === "claude" || AGENT_PROVIDER === "anthropic") {
    return generateClaudeLaunchMemo(input);
  }

  return generateOpenAILaunchMemo(input);
};
