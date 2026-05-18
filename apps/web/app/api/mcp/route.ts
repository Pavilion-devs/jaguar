import {
  getAlertDigest,
  getLaunchDetail,
  getLatestAgentMemo,
  getRecommendationScorecard,
  getWorkerHealth,
  listLaunchBoard,
  searchLaunches,
  validateMcpApiKey,
} from "@jaguar/db";
import type { Persona, Verdict } from "@jaguar/domain";
import { type NextRequest, NextResponse } from "next/server";

const PROTOCOL_VERSION = "2024-11-05";

function ok(id: unknown, result: unknown) {
  return NextResponse.json({ jsonrpc: "2.0", id, result });
}

function rpcErr(id: unknown, code: number, message: string) {
  return NextResponse.json({ jsonrpc: "2.0", id, error: { code, message } });
}

async function handleMethod(method: string, params: Record<string, unknown> | undefined) {
  switch (method) {
    case "initialize":
      return {
        protocolVersion: PROTOCOL_VERSION,
        capabilities: { tools: {} },
        serverInfo: { name: "jaguar", version: "0.1.0" },
      };

    case "tools/list":
      return { tools: TOOL_DEFINITIONS };

    case "tools/call": {
      const name = params?.name as string;
      const args = (params?.arguments ?? {}) as Record<string, unknown>;
      return callTool(name, args);
    }

    case "ping":
      return {};

    default:
      return null;
  }
}

async function callTool(name: string, args: Record<string, unknown>) {
  switch (name) {
    case "get_top_launches": {
      const persona = (args.persona as Persona) ?? "momentum";
      const verdictFilter = (args.verdict_filter as string) ?? "all";
      const limit = Math.min(Number(args.limit ?? 10), 50);
      const board = await listLaunchBoard(limit * 2, persona);
      const filtered =
        verdictFilter === "all"
          ? board
          : board.filter((l) => l.personaVerdicts[persona] === verdictFilter);
      const results = filtered.slice(0, limit);

      if (results.length === 0) {
        return text("No launches match the current filters.");
      }

      const lines = results.map(
        (l, i) =>
          `${i + 1}. ${l.tokenName || l.tokenSymbol} ($${l.tokenSymbol})\n` +
          `   Score: ${l.score}/100 | Verdict: ${l.personaVerdicts[persona].toUpperCase()} | Age: ${l.ageMinutes}m\n` +
          `   Liquidity: $${fmt(l.liquidityUsd)} | Vol 5m: $${fmt(l.volume5mUsd)} | Vol 1h: $${fmt(l.volume1hUsd)}\n` +
          `   Delta: 1m=${signed(l.delta1m)} 5m=${signed(l.delta5m)} 15m=${signed(l.delta15m)} 1h=${signed(l.delta1h)}\n` +
          `   Reasons: ${l.reasons.length > 0 ? l.reasons.join(", ") : "none"}\n` +
          `   Pair: ${l.pairAddress}`,
      );

      return text(`Top ${results.length} launches (${persona}, ${verdictFilter}):\n\n${lines.join("\n\n")}`);
    }

    case "get_launch": {
      const query = args.query as string;
      if (!query) return text("query is required.");

      const found = await searchLaunches(query, 1);
      const first = found[0];
      if (!first) return text(`No launch found matching "${query}".`);

      const [detail, memo] = await Promise.all([
        getLaunchDetail(first.id),
        getLatestAgentMemo(first.id),
      ]);
      if (!detail) return text(`Launch detail not found for "${query}".`);

      const { launch, timeline } = detail;
      const lines = [
        `${launch.tokenName || launch.tokenSymbol} ($${launch.tokenSymbol})`,
        `Pair: ${launch.pairAddress} | Protocol: ${launch.protocol} | Age: ${launch.ageMinutes}m`,
        "",
        "CONVICTION",
        `  Score: ${launch.score}/100 | Verdict: ${launch.verdict.toUpperCase()}`,
        `  Personas: degen=${launch.personaVerdicts.degen.toUpperCase()}, momentum=${launch.personaVerdicts.momentum.toUpperCase()}, risk-first=${launch.personaVerdicts["risk-first"].toUpperCase()}`,
        `  Delta: 1m=${signed(launch.delta1m)}, 5m=${signed(launch.delta5m)}, 15m=${signed(launch.delta15m)}, 1h=${signed(launch.delta1h)}`,
        `  Reasons: ${launch.reasons.length > 0 ? launch.reasons.join(", ") : "none"}`,
        "",
        "MARKET DATA",
        `  Liquidity: $${fmt(launch.liquidityUsd)} | Market cap: $${fmt(launch.marketCapUsd)}`,
        `  Volume — 1m: $${fmt(launch.volume1mUsd)} | 5m: $${fmt(launch.volume5mUsd)} | 15m: $${fmt(launch.volume15mUsd)} | 1h: $${fmt(launch.volume1hUsd)}`,
        `  Price change — 1m: ${launch.priceChange1mPct.toFixed(2)}% | 5m: ${launch.priceChange5mPct.toFixed(2)}% | 15m: ${launch.priceChange15mPct.toFixed(2)}% | 1h: ${launch.priceChange1hPct.toFixed(2)}%`,
        `  Swaps — 5m: ${launch.swapCount5m} | 1h: ${launch.swapCount1h}`,
      ];

      if (memo) {
        lines.push(
          "",
          `ANALYST MEMO (${memo.modelUsed} · confidence ${memo.confidence}/100)`,
          `  "${memo.headline}"`,
          `  Why: ${memo.bull}`,
          `  Risk: ${memo.bear}`,
          `  Next move: ${memo.verdict}`,
        );
      } else {
        lines.push("", "ANALYST MEMO: None generated yet.");
      }

      if (timeline.length > 0) {
        lines.push("", `TIMELINE (${timeline.length} events)`);
        for (const entry of timeline.slice(0, 8)) {
          lines.push(`  [${entry.severity.toUpperCase()}] ${entry.title} — ${entry.summary}`);
        }
      }

      return text(lines.join("\n"));
    }

    case "get_scorecard": {
      const persona = args.persona as string | undefined;
      const verdictArg = args.verdict_filter as string | undefined;
      const scorecard = await getRecommendationScorecard(
        6,
        persona === "all" || !persona ? undefined : (persona as Persona),
        verdictArg === "all" || !verdictArg ? undefined : (verdictArg as Verdict),
      );
      const lines = [
        `JAGUAR SCORECARD${persona && persona !== "all" ? ` (${persona})` : ""}`,
        "",
        `Total calls: ${scorecard.totalIssued} | Open: ${scorecard.openCount} | Settled: ${scorecard.settledCount}`,
        `Validated: ${scorecard.validatedCount} | Failed: ${scorecard.failedCount} | Expired: ${scorecard.expiredCount}`,
        `Win rate: ${scorecard.winRatePct.toFixed(1)}%`,
      ];
      if (scorecard.recentRecommendations.length > 0) {
        lines.push("", "RECENT CALLS");
        for (const rec of scorecard.recentRecommendations.slice(0, 5)) {
          const o = rec.latestOutcome;
          lines.push(
            `  ${rec.persona.toUpperCase()} ${rec.verdict.toUpperCase()} · score ${rec.scoreAtEntry}${o ? ` → ${o.outcomeLabel} (${signed(Math.round(o.priceChangePct))}%)` : ` → ${rec.evaluationStatus}`}`,
          );
        }
      }
      return text(lines.join("\n"));
    }

    case "get_alerts": {
      const limit = Math.min(Number(args.limit ?? 20), 50);
      const severity = args.severity as string | undefined;
      const digest = await getAlertDigest({ recentLimit: limit });
      const alerts =
        !severity || severity === "all"
          ? digest.recent
          : digest.recent.filter((a) => a.severity === severity);
      if (alerts.length === 0) return text("No alerts found.");
      const lines = [`JAGUAR ALERTS — ${digest.windowMinutes}m window · ${digest.totalAlerts} total`, ""];
      for (const a of alerts.slice(0, limit)) {
        lines.push(`[${a.severity.toUpperCase()}] ${a.tokenSymbol} — ${a.title}`);
        lines.push(`  ${a.body}`);
        lines.push(`  Type: ${a.alertType} · ${a.createdAt}`);
        lines.push("");
      }
      return text(lines.join("\n"));
    }

    case "get_worker_status": {
      const health = await getWorkerHealth();
      if (!health) return text("WORKER STATUS: NO HEARTBEAT — worker may not be running.");
      const ageSeconds = Math.round((Date.now() - new Date(health.heartbeatAt).getTime()) / 1000);
      return text(
        [
          `WORKER STATUS: ${ageSeconds < 60 ? "HEALTHY" : "STALE"}`,
          `Chain: ${health.chainName} | Tracked pairs: ${health.trackedPairCount}`,
          `Last heartbeat: ${health.heartbeatAt} (${ageSeconds}s ago)`,
          `Started: ${health.startedAt}`,
        ].join("\n"),
      );
    }

    default:
      return { isError: true, content: [{ type: "text", text: `Unknown tool: ${name}` }] };
  }
}

const text = (t: string) => ({ content: [{ type: "text", text: t }] });
const fmt = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 0 });
const signed = (n: number) => (n >= 0 ? `+${n}` : `${n}`);

const TOOL_DEFINITIONS = [
  {
    name: "get_top_launches",
    description: "Get the top conviction Solana launches scored by Jaguar. Returns live scores, verdicts, liquidity, volume, and reason codes.",
    inputSchema: {
      type: "object",
      properties: {
        persona: { type: "string", enum: ["degen", "momentum", "risk-first"], default: "momentum" },
        verdict_filter: { type: "string", enum: ["enter", "watch", "all"], default: "all" },
        limit: { type: "integer", minimum: 1, maximum: 50, default: 10 },
      },
    },
  },
  {
    name: "get_launch",
    description: "Full conviction detail for a specific launch — score, verdict, AI memo, and timeline. Search by symbol or pair address.",
    inputSchema: {
      type: "object",
      required: ["query"],
      properties: { query: { type: "string" } },
    },
  },
  {
    name: "get_scorecard",
    description: "Jaguar's paper trade win rate and outcomes. Filter by persona and/or verdict — use verdict_filter='enter' to see enter-only win rate.",
    inputSchema: {
      type: "object",
      properties: {
        persona: { type: "string", enum: ["degen", "momentum", "risk-first", "all"], default: "all" },
        verdict_filter: { type: "string", enum: ["enter", "watch", "all"], default: "all", description: "Filter to enter-only or watch-only calls" },
      },
    },
  },
  {
    name: "get_alerts",
    description: "Recent alerts fired by Jaguar — verdict crossings, liquidity surges, failed setups.",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "integer", minimum: 1, maximum: 50, default: 20 },
        severity: { type: "string", enum: ["info", "warn", "critical", "all"], default: "all" },
      },
    },
  },
  {
    name: "get_worker_status",
    description: "Check if the Jaguar ingestion worker is alive and streaming live Solana data.",
    inputSchema: { type: "object", properties: {} },
  },
];

export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const rawKey = auth?.startsWith("Bearer ") ? auth.slice(7) : null;

  if (!rawKey || !(await validateMcpApiKey(rawKey))) {
    return NextResponse.json(
      { jsonrpc: "2.0", id: null, error: { code: -32001, message: "Unauthorized" } },
      { status: 401 },
    );
  }

  let body: { method: string; id?: unknown; params?: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return rpcErr(null, -32700, "Parse error");
  }

  const { method, id, params } = body;

  // Notifications have no id and expect no response
  if (id === undefined) {
    return new Response(null, { status: 204 });
  }

  try {
    const result = await handleMethod(method, params);
    if (result === null) return rpcErr(id, -32601, "Method not found");
    return ok(id, result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal error";
    return rpcErr(id, -32603, message);
  }
}

export async function GET() {
  return NextResponse.json({ name: "jaguar-mcp", version: "0.1.0", status: "ok" });
}
