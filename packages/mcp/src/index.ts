import {
  getAlertDigest,
  getLaunchDetail,
  getLatestAgentMemo,
  getRecommendationScorecard,
  getWorkerHealth,
  listLaunchBoard,
  searchLaunches,
} from "@jaguar/db";
import type { Persona } from "@jaguar/domain";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const server = new McpServer({
  name: "jaguar",
  version: "0.1.0",
});

server.tool(
  "get_top_launches",
  "Get the top conviction Solana launches currently scored by Jaguar, ranked by score. Use this to find what's worth watching or entering right now.",
  {
    persona: z
      .enum(["degen", "momentum", "risk-first"])
      .default("momentum")
      .describe(
        "Trader persona. degen = aggressive/early bias (+5), momentum = balanced (0), risk-first = conservative (-8)",
      ),
    verdict_filter: z
      .enum(["enter", "watch", "all"])
      .default("all")
      .describe("Filter by verdict. enter = high conviction only, watch = building signal, all = everything"),
    limit: z.number().int().min(1).max(50).default(10).describe("Number of launches to return"),
  },
  async ({ persona, verdict_filter, limit }) => {
    const board = await listLaunchBoard(limit * 2, persona as Persona);
    const filtered =
      verdict_filter === "all"
        ? board
        : board.filter((l) => l.personaVerdicts[persona as Persona] === verdict_filter);
    const results = filtered.slice(0, limit);

    if (results.length === 0) {
      return { content: [{ type: "text" as const, text: "No launches match the current filters." }] };
    }

    const lines = results.map((l, i) =>
      [
        `${i + 1}. ${l.tokenName || l.tokenSymbol} ($${l.tokenSymbol})`,
        `   Score: ${l.score}/100 | Verdict: ${l.personaVerdicts[persona as Persona].toUpperCase()} | Age: ${l.ageMinutes}m`,
        `   Liquidity: $${l.liquidityUsd.toLocaleString("en-US", { maximumFractionDigits: 0 })} | Vol 5m: $${l.volume5mUsd.toLocaleString("en-US", { maximumFractionDigits: 0 })} | Vol 1h: $${l.volume1hUsd.toLocaleString("en-US", { maximumFractionDigits: 0 })}`,
        `   Delta: 1m=${l.delta1m >= 0 ? "+" : ""}${l.delta1m} 5m=${l.delta5m >= 0 ? "+" : ""}${l.delta5m} 15m=${l.delta15m >= 0 ? "+" : ""}${l.delta15m} 1h=${l.delta1h >= 0 ? "+" : ""}${l.delta1h}`,
        `   Reasons: ${l.reasons.length > 0 ? l.reasons.join(", ") : "none"}`,
        `   Pair: ${l.pairAddress}`,
      ].join("\n"),
    );

    return {
      content: [
        {
          type: "text" as const,
          text: `Top ${results.length} launches (${persona} persona, ${verdict_filter} filter):\n\n${lines.join("\n\n")}`,
        },
      ],
    };
  },
);

server.tool(
  "get_launch",
  "Get full conviction detail for a specific Solana launch — score, verdict, reason codes, liquidity, volume, price action, AI analyst memo, and recent timeline. Search by token symbol or pair address.",
  {
    query: z.string().min(1).describe("Token symbol (e.g. 'SAMANTHA') or pair address"),
  },
  async ({ query }) => {
    const found = await searchLaunches(query, 1);
    const first = found[0];

    if (!first) {
      return { content: [{ type: "text" as const, text: `No launch found matching "${query}".` }] };
    }

    const [detail, memo] = await Promise.all([
      getLaunchDetail(first.id),
      getLatestAgentMemo(first.id),
    ]);

    if (!detail) {
      return { content: [{ type: "text" as const, text: `Launch detail not found for "${query}".` }] };
    }

    const { launch, timeline } = detail;

    const sections: string[] = [
      `${launch.tokenName || launch.tokenSymbol} ($${launch.tokenSymbol})`,
      `Pair: ${launch.pairAddress} | Protocol: ${launch.protocol} | Age: ${launch.ageMinutes}m`,
      "",
      "CONVICTION",
      `  Score: ${launch.score}/100`,
      `  Verdict: ${launch.verdict.toUpperCase()}`,
      `  Persona verdicts: degen=${launch.personaVerdicts.degen.toUpperCase()}, momentum=${launch.personaVerdicts.momentum.toUpperCase()}, risk-first=${launch.personaVerdicts["risk-first"].toUpperCase()}`,
      `  Delta: 1m=${launch.delta1m >= 0 ? "+" : ""}${launch.delta1m}, 5m=${launch.delta5m >= 0 ? "+" : ""}${launch.delta5m}, 15m=${launch.delta15m >= 0 ? "+" : ""}${launch.delta15m}, 1h=${launch.delta1h >= 0 ? "+" : ""}${launch.delta1h}`,
      `  Reasons: ${launch.reasons.length > 0 ? launch.reasons.join(", ") : "none"}`,
      "",
      "MARKET DATA",
      `  Liquidity: $${launch.liquidityUsd.toLocaleString("en-US", { maximumFractionDigits: 0 })}`,
      `  Market cap: $${launch.marketCapUsd.toLocaleString("en-US", { maximumFractionDigits: 0 })}`,
      `  Volume — 1m: $${launch.volume1mUsd.toLocaleString("en-US", { maximumFractionDigits: 0 })} | 5m: $${launch.volume5mUsd.toLocaleString("en-US", { maximumFractionDigits: 0 })} | 15m: $${launch.volume15mUsd.toLocaleString("en-US", { maximumFractionDigits: 0 })} | 1h: $${launch.volume1hUsd.toLocaleString("en-US", { maximumFractionDigits: 0 })}`,
      `  Price change — 1m: ${launch.priceChange1mPct.toFixed(2)}% | 5m: ${launch.priceChange5mPct.toFixed(2)}% | 15m: ${launch.priceChange15mPct.toFixed(2)}% | 1h: ${launch.priceChange1hPct.toFixed(2)}%`,
      `  Swaps — 5m: ${launch.swapCount5m} | 1h: ${launch.swapCount1h}`,
    ];

    if (memo) {
      sections.push(
        "",
        `ANALYST MEMO (${memo.modelUsed} · confidence ${memo.confidence}/100 · ${memo.generatedAt})`,
        `  "${memo.headline}"`,
        `  Why: ${memo.bull}`,
        `  Risk: ${memo.bear}`,
        `  Next move: ${memo.verdict}`,
      );
    } else {
      sections.push("", "ANALYST MEMO: None generated yet.");
    }

    if (timeline.length > 0) {
      sections.push("", `TIMELINE (${timeline.length} events, newest first)`);
      for (const entry of timeline.slice(0, 8)) {
        sections.push(`  [${entry.severity.toUpperCase()}] ${entry.title} — ${entry.summary}`);
      }
    }

    return { content: [{ type: "text" as const, text: sections.join("\n") }] };
  },
);

server.tool(
  "get_scorecard",
  "Get Jaguar's paper trade win rate and recent recommendation outcomes. Shows how accurate Jaguar's enter/watch calls have been over time.",
  {
    persona: z
      .enum(["degen", "momentum", "risk-first", "all"])
      .default("all")
      .describe("Persona to filter by, or 'all' for combined scorecard"),
  },
  async ({ persona }) => {
    const scorecard = await getRecommendationScorecard(
      6,
      persona === "all" ? undefined : (persona as Persona),
    );

    const lines = [
      `JAGUAR SCORECARD${persona !== "all" ? ` (${persona})` : ""}`,
      "",
      `Total calls issued:  ${scorecard.totalIssued}`,
      `Open:                ${scorecard.openCount}`,
      `Settled:             ${scorecard.settledCount}`,
      `  Validated (won):   ${scorecard.validatedCount}`,
      `  Failed (lost):     ${scorecard.failedCount}`,
      `  Expired:           ${scorecard.expiredCount}`,
      `Win rate:            ${scorecard.winRatePct.toFixed(1)}%`,
    ];

    if (scorecard.recentRecommendations.length > 0) {
      lines.push("", "RECENT CALLS");
      for (const rec of scorecard.recentRecommendations.slice(0, 5)) {
        const outcome = rec.latestOutcome;
        const outcomeStr = outcome
          ? ` → ${outcome.outcomeLabel} (${outcome.priceChangePct >= 0 ? "+" : ""}${outcome.priceChangePct.toFixed(1)}%)`
          : ` → ${rec.evaluationStatus}`;
        lines.push(
          `  ${rec.persona.toUpperCase()} ${rec.verdict.toUpperCase()} · score ${rec.scoreAtEntry}${outcomeStr}`,
        );
      }
    }

    return { content: [{ type: "text" as const, text: lines.join("\n") }] };
  },
);

server.tool(
  "get_alerts",
  "Get recent alerts fired by Jaguar — verdict crossings, paper trade opens/settles, liquidity surges, breakout failures, and setup invalidations.",
  {
    limit: z.number().int().min(1).max(50).default(20).describe("Number of recent alerts to return"),
    severity: z
      .enum(["info", "warn", "critical", "all"])
      .default("all")
      .describe("Filter by severity level"),
  },
  async ({ limit, severity }) => {
    const digest = await getAlertDigest({ recentLimit: limit });

    const alerts =
      severity === "all" ? digest.recent : digest.recent.filter((a) => a.severity === severity);

    if (alerts.length === 0) {
      return { content: [{ type: "text" as const, text: "No alerts found." }] };
    }

    const lines = [
      `JAGUAR ALERTS — ${digest.windowMinutes}m window · ${digest.totalAlerts} total`,
      "",
    ];

    for (const alert of alerts.slice(0, limit)) {
      lines.push(`[${alert.severity.toUpperCase()}] ${alert.tokenSymbol} — ${alert.title}`);
      lines.push(`  ${alert.body}`);
      lines.push(`  Type: ${alert.alertType} · ${alert.createdAt}`);
      lines.push("");
    }

    return { content: [{ type: "text" as const, text: lines.join("\n") }] };
  },
);

server.tool(
  "get_worker_status",
  "Check if the Jaguar ingestion worker is alive and streaming live Solana data. Returns heartbeat age, tracked pair counts, and health status.",
  {},
  async () => {
    const health = await getWorkerHealth();

    if (!health) {
      return {
        content: [
          {
            type: "text" as const,
            text: "WORKER STATUS: NO HEARTBEAT — worker may not be running or has never started.",
          },
        ],
      };
    }

    const heartbeatAgeSeconds = Math.round(
      (Date.now() - new Date(health.heartbeatAt).getTime()) / 1000,
    );
    const isHealthy = heartbeatAgeSeconds < 60;

    const lines = [
      `WORKER STATUS: ${isHealthy ? "HEALTHY ✓" : "STALE — last heartbeat was over 60s ago"}`,
      "",
      `Worker key:              ${health.workerKey}`,
      `Chain:                   ${health.chainName}`,
      `Last heartbeat:          ${health.heartbeatAt} (${heartbeatAgeSeconds}s ago)`,
      `Started at:              ${health.startedAt}`,
      `Tracked pairs:           ${health.trackedPairCount}`,
      `Pair candle candidates:  ${health.pairCandleCandidateCount}`,
      `Token candle candidates: ${health.tokenCandleCandidateCount}`,
    ];

    return { content: [{ type: "text" as const, text: lines.join("\n") }] };
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);
