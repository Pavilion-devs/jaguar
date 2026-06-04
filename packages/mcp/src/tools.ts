// Shared Jaguar MCP tool registry. Every tool is defined exactly once here and
// consumed by BOTH transports: the stdio server (src/index.ts) and the hosted
// HTTP JSON-RPC route (apps/web/app/api/mcp/route.ts). Keep this module free of
// any @modelcontextprotocol/sdk imports so it can be bundled into the Next.js web
// app without dragging the SDK into that build.

import {
  approveActionRequest,
  createActionRequest,
  getActionRequest,
  getAlertDigest,
  getIngestionDiagnostics,
  getLatestAgentMemo,
  getLaunchDetail,
  getRecentDeploys,
  getRecentFailures,
  getRecentOperationalEvents,
  getRecommendationScorecard,
  getWorkerHealth,
  listActionRequests,
  listLaunchBoard,
  rejectActionRequest,
  searchLaunches,
} from "@jaguar/db";
import type { Persona } from "@jaguar/domain";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { assertOperatorSecret } from "./operator-secret.js";
import { getRunbook, searchRunbooks } from "./runbooks.js";

export { assertOperatorSecret } from "./operator-secret.js";

export type ToolContent = {
  content: { type: "text"; text: string }[];
  isError?: boolean;
};

// "read" tools never mutate. "write" tools create draft/proposed action requests.
// "operator" tools approve/reject and require the shared operator secret.
export type ToolCapability = "read" | "write" | "operator";

export type ToolContext = {
  // Operator secret presented by the caller (X-Operator-Secret header or a tool
  // arg). Validated per-tool by the operator-gated handlers; null on stdio.
  operatorSecretProvided?: string | null;
};

type ToolHandler = (args: Record<string, unknown>, ctx: ToolContext) => Promise<ToolContent>;

export type ToolDef = {
  name: string;
  description: string;
  schema: z.ZodObject<z.ZodRawShape>;
  capability: ToolCapability;
  handler: ToolHandler;
};

// Preserves per-tool arg typing inside each handler while still storing every
// tool in one heterogeneous ToolDef[].
const defineTool = <S extends z.ZodObject<z.ZodRawShape>>(def: {
  name: string;
  description: string;
  schema: S;
  capability: ToolCapability;
  handler: (args: z.infer<S>, ctx: ToolContext) => Promise<ToolContent>;
}): ToolDef => def as unknown as ToolDef;

export const text = (t: string): ToolContent => ({ content: [{ type: "text", text: t }] });
export const errText = (t: string): ToolContent => ({
  isError: true,
  content: [{ type: "text", text: t }],
});
export const fmt = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 0 });
export const signed = (n: number) => (n >= 0 ? `+${n}` : `${n}`);

export const TOOLS: ToolDef[] = [
  defineTool({
    name: "get_top_launches",
    description:
      "Get the top conviction Solana launches scored by Jaguar. Returns live scores, verdicts, liquidity, volume, and reason codes.",
    capability: "read",
    schema: z.object({
      persona: z
        .enum(["degen", "momentum", "risk-first"])
        .default("momentum")
        .describe(
          "Trader persona. degen = aggressive/early bias (+5), momentum = balanced (0), risk-first = conservative (-8)",
        ),
      verdict_filter: z
        .enum(["enter", "watch", "all"])
        .default("all")
        .describe(
          "Filter by verdict. enter = high conviction only, watch = building signal, all = everything",
        ),
      limit: z.number().int().min(1).max(50).default(10).describe("Number of launches to return"),
    }),
    handler: async ({ persona, verdict_filter, limit }) => {
      const board = await listLaunchBoard(limit * 2, persona as Persona);
      const filtered =
        verdict_filter === "all"
          ? board
          : board.filter((l) => l.personaVerdicts[persona as Persona] === verdict_filter);
      const results = filtered.slice(0, limit);

      if (results.length === 0) {
        return text("No launches match the current filters.");
      }

      const lines = results.map(
        (l, i) =>
          `${i + 1}. ${l.tokenName || l.tokenSymbol} ($${l.tokenSymbol})\n` +
          `   Score: ${l.score}/100 | Verdict: ${l.personaVerdicts[persona as Persona].toUpperCase()} | Age: ${l.ageMinutes}m\n` +
          `   Liquidity: $${fmt(l.liquidityUsd)} | Vol 5m: $${fmt(l.volume5mUsd)} | Vol 1h: $${fmt(l.volume1hUsd)}\n` +
          `   Delta: 1m=${signed(l.delta1m)} 5m=${signed(l.delta5m)} 15m=${signed(l.delta15m)} 1h=${signed(l.delta1h)}\n` +
          `   Reasons: ${l.reasons.length > 0 ? l.reasons.join(", ") : "none"}\n` +
          `   Pair: ${l.pairAddress}`,
      );

      return text(
        `Top ${results.length} launches (${persona}, ${verdict_filter}):\n\n${lines.join("\n\n")}`,
      );
    },
  }),

  defineTool({
    name: "get_launch",
    description:
      "Full conviction detail for a specific launch — score, verdict, AI memo, and timeline. Search by symbol or pair address.",
    capability: "read",
    schema: z.object({
      query: z.string().min(1).describe("Token symbol (e.g. 'SAMANTHA') or pair address"),
    }),
    handler: async ({ query }) => {
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
    },
  }),

  defineTool({
    name: "get_scorecard",
    description:
      "Jaguar's paper trade win rate and outcomes. Filter by persona and/or verdict — use verdict_filter='enter' to see enter-only win rate.",
    capability: "read",
    schema: z.object({
      persona: z
        .enum(["degen", "momentum", "risk-first", "all"])
        .default("all")
        .describe("Persona to filter by, or 'all' for combined scorecard"),
      verdict_filter: z
        .enum(["enter", "watch", "all"])
        .default("all")
        .describe(
          "Filter to enter-only or watch-only calls. Use 'enter' to see enter-only win rate.",
        ),
    }),
    handler: async ({ persona, verdict_filter }) => {
      const scorecard = await getRecommendationScorecard(
        6,
        persona === "all" ? undefined : (persona as Persona),
        verdict_filter === "all" ? undefined : verdict_filter,
      );
      const lines = [
        `JAGUAR SCORECARD${persona !== "all" ? ` (${persona})` : ""}`,
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
    },
  }),

  defineTool({
    name: "get_alerts",
    description:
      "Recent alerts fired by Jaguar — verdict crossings, liquidity surges, failed setups.",
    capability: "read",
    schema: z.object({
      limit: z
        .number()
        .int()
        .min(1)
        .max(50)
        .default(20)
        .describe("Number of recent alerts to return"),
      severity: z
        .enum(["info", "warn", "critical", "all"])
        .default("all")
        .describe("Filter by severity level"),
    }),
    handler: async ({ limit, severity }) => {
      const digest = await getAlertDigest({ recentLimit: limit });
      const alerts =
        severity === "all" ? digest.recent : digest.recent.filter((a) => a.severity === severity);
      if (alerts.length === 0) return text("No alerts found.");
      const lines = [
        `JAGUAR ALERTS — ${digest.windowMinutes}m window · ${digest.totalAlerts} total`,
        "",
      ];
      for (const a of alerts.slice(0, limit)) {
        lines.push(`[${a.severity.toUpperCase()}] ${a.tokenSymbol} — ${a.title}`);
        lines.push(`  ${a.body}`);
        lines.push(`  Type: ${a.alertType} · ${a.createdAt}`);
        lines.push("");
      }
      return text(lines.join("\n"));
    },
  }),

  defineTool({
    name: "get_worker_status",
    description:
      "Check if the Jaguar ingestion worker is alive and streaming live Solana data. Returns a healthy/degraded/stale/offline classification.",
    capability: "read",
    schema: z.object({}),
    handler: async () => {
      const health = await getWorkerHealth();
      if (!health) return text("WORKER STATUS: NO HEARTBEAT — worker may not be running.");
      const ageSeconds = Math.round((Date.now() - new Date(health.heartbeatAt).getTime()) / 1000);
      return text(
        [
          `WORKER STATUS: ${ageSeconds < 60 ? "HEALTHY" : "STALE"}`,
          `Health: ${health.assessment.status.toUpperCase()} — ${health.assessment.reasons.join("; ")}`,
          `Chain: ${health.chainName} | Tracked protocols: ${health.trackedProtocolCount} | Tracked pairs: ${health.trackedPairCount}`,
          `Stream: ${health.streamUrl}`,
          `Last heartbeat: ${health.heartbeatAt} (${ageSeconds}s ago)`,
          `Started: ${health.startedAt}`,
        ].join("\n"),
      );
    },
  }),

  defineTool({
    name: "get_ingestion_diagnostics",
    description:
      "Detailed ingestion health — per-source stream freshness, candle persistence, candidate counts, and a healthy/degraded/stale/offline assessment. Use this to tell 'alive but unhealthy' apart from 'offline'.",
    capability: "read",
    schema: z.object({}),
    handler: async () => {
      const d = await getIngestionDiagnostics();
      const lines = [
        `INGESTION DIAGNOSTICS — Health: ${d.assessment.status.toUpperCase()}`,
        `  ${d.assessment.reasons.join("; ")}`,
        "",
        `Tracked pairs: ${d.trackedPairCount} | Pair candle candidates: ${d.pairCandleCandidateCount} | Token candle candidates: ${d.tokenCandleCandidateCount}`,
        `Candle rows — pair: ${fmt(d.pairCandleRows)} | token: ${fmt(d.tokenCandleRows)}`,
        `States with pair candle: ${d.statesWithPairCandle} | token candle: ${d.statesWithTokenCandle} | token-only fallback: ${d.statesUsingTokenFallback}`,
        "",
        "WORKER HEARTBEAT",
      ];
      if (d.workerHeartbeat) {
        const hb = d.workerHeartbeat;
        const age = Math.round((Date.now() - new Date(hb.heartbeatAt).getTime()) / 1000);
        lines.push(
          `  Key: ${hb.workerKey} | Chain: ${hb.chainName}`,
          `  Last heartbeat: ${hb.heartbeatAt} (${age}s ago)`,
          `  Stream URL: ${hb.streamUrl}`,
          `  Started: ${hb.startedAt}`,
        );
      } else {
        lines.push("  NO HEARTBEAT");
      }
      lines.push("", "STREAMS");
      for (const s of d.streams) {
        lines.push(
          `  [${s.sourceStream}] events: ${fmt(s.eventCount)} · last: ${s.lastEventAt ?? "never"}`,
        );
      }
      return text(lines.join("\n"));
    },
  }),

  defineTool({
    name: "get_recent_deploys",
    description:
      "Recent Jaguar deploys (worker + web), newest first, with commit SHA, environment, and source. Use to correlate failures with releases.",
    capability: "read",
    schema: z.object({
      limit: z.number().int().min(1).max(50).default(10).describe("Number of deploys to return"),
      service: z
        .string()
        .optional()
        .describe("Filter by service, e.g. 'jaguar-worker' or 'jaguar-web'"),
    }),
    handler: async ({ limit, service }) => {
      const deploys = await getRecentDeploys(limit, service);
      if (deploys.length === 0) return text("No deploys recorded.");
      const lines = [`RECENT DEPLOYS (${deploys.length})`, ""];
      for (const d of deploys) {
        lines.push(
          `[${d.service}] ${d.shortSha}${d.previousSha ? ` (from ${d.previousSha.slice(0, 7)})` : ""}`,
        );
        lines.push(`  ${d.detectedAt} · source: ${d.source}`);
      }
      return text(lines.join("\n"));
    },
  }),

  defineTool({
    name: "get_recent_failures",
    description:
      "Aggregated operational failures over a recent window — counts by failure type plus the latest failure events and critical alert count.",
    capability: "read",
    schema: z.object({
      window_minutes: z
        .number()
        .int()
        .min(1)
        .max(1440)
        .default(60)
        .describe("Look-back window in minutes"),
      limit: z
        .number()
        .int()
        .min(1)
        .max(50)
        .default(20)
        .describe("Number of recent events to list"),
    }),
    handler: async ({ window_minutes, limit }) => {
      const f = await getRecentFailures({ windowMinutes: window_minutes, recentLimit: limit });
      if (f.totalFailures === 0 && f.criticalAlertCount === 0) {
        return text(`No failures in the last ${f.windowMinutes}m.`);
      }
      const lines = [
        `RECENT FAILURES — ${f.windowMinutes}m window · ${f.totalFailures} failure events · ${f.criticalAlertCount} critical alerts`,
        "",
      ];
      if (f.operationalFailures.length > 0) {
        lines.push("BY TYPE");
        for (const g of f.operationalFailures) {
          lines.push(`  ${g.type}: ${g.count}${g.lastAt ? ` · last ${g.lastAt}` : ""}`);
        }
        lines.push("");
      }
      if (f.events.length > 0) {
        lines.push("RECENT");
        for (const e of f.events) {
          lines.push(`  [${e.severity.toUpperCase()}] ${e.subsystem} — ${e.title}`);
          lines.push(`    ${e.summary} · ${e.createdAt}`);
        }
      }
      return text(lines.join("\n"));
    },
  }),

  defineTool({
    name: "get_recent_status_events",
    description:
      "Consolidated operational/status event feed for incident reconstruction — worker start/stop, heartbeat stale, reconnects, deploys, recoveries, memo/telegram failures.",
    capability: "read",
    schema: z.object({
      limit: z.number().int().min(1).max(50).default(20).describe("Number of events to return"),
      subsystem: z
        .string()
        .optional()
        .describe(
          "Filter by subsystem, e.g. 'worker', 'ingestion', 'analyst', 'telegram', 'deploy'",
        ),
    }),
    handler: async ({ limit, subsystem }) => {
      const events = await getRecentOperationalEvents({ limit, subsystem });
      if (events.length === 0) return text("No operational events.");
      const lines = [`OPERATIONAL EVENTS (${events.length})`, ""];
      for (const e of events) {
        lines.push(`[${e.severity.toUpperCase()}] ${e.type} · ${e.subsystem} — ${e.title}`);
        lines.push(`  ${e.summary} · ${e.createdAt}`);
      }
      return text(lines.join("\n"));
    },
  }),

  defineTool({
    name: "search_runbooks",
    description:
      "Search Jaguar operational runbooks by keyword (and optional tag/severity). Returns matching runbook slugs and summaries.",
    capability: "read",
    schema: z.object({
      query: z
        .string()
        .min(1)
        .describe("Keyword(s) to search across runbook titles, tags, and bodies"),
      severity: z.enum(["info", "warn", "critical"]).optional().describe("Filter by severity"),
      tags: z
        .array(z.string())
        .optional()
        .describe("Filter to runbooks carrying any of these tags"),
    }),
    handler: async ({ query, severity, tags }) => {
      const results = searchRunbooks(query, { severity, tags });
      if (results.length === 0) return text(`No runbooks matched "${query}".`);
      const lines = [`RUNBOOKS (${results.length} matched "${query}")`, ""];
      for (const r of results) {
        lines.push(`${r.slug} — ${r.title}`);
        lines.push(`  ${r.summary}`);
        lines.push(
          `  severity: ${r.severity} · systems: ${r.systems.join(", ")} · tags: ${r.tags.join(", ")}`,
        );
      }
      return text(lines.join("\n"));
    },
  }),

  defineTool({
    name: "get_runbook",
    description: "Fetch the full body of a Jaguar runbook by slug.",
    capability: "read",
    schema: z.object({
      slug: z.string().min(1).describe("Runbook slug, e.g. 'worker-offline'"),
    }),
    handler: async ({ slug }) => {
      const r = getRunbook(slug);
      if (!r) return text(`No runbook found for slug "${slug}".`);
      return text(
        [
          `RUNBOOK: ${r.title} (${r.slug})`,
          `severity: ${r.severity} · systems: ${r.systems.join(", ")} · tags: ${r.tags.join(", ")}`,
          `updated: ${r.updatedAt}`,
          "",
          r.body,
        ].join("\n"),
      );
    },
  }),

  defineTool({
    name: "prepare_worker_restart",
    description:
      "Draft an approval-gated worker restart. Creates a proposed action request that an operator must approve before the ops-runner executes it. Does NOT restart anything by itself.",
    capability: "write",
    schema: z.object({
      reason: z.string().min(1).describe("Why a restart is needed (cause + evidence)"),
      worker_key: z.string().optional().describe("Specific worker key, if more than one"),
    }),
    handler: async ({ reason, worker_key }) => {
      const action = await createActionRequest({
        actionType: "worker_restart",
        title: "Restart Jaguar worker",
        reason,
        payload: { workerKey: worker_key ?? null },
      });
      return text(
        [
          `DRAFTED WORKER RESTART (action_request ${action.id}, status: ${action.status}, risk: ${action.riskLevel})`,
          "",
          "Plan:",
          "  1. Operator approves this action request.",
          "  2. ops-runner runs: docker-compose up -d --no-build jaguar-worker",
          "  3. ops-runner polls worker health until HEALTHY, then records recovery_complete.",
          `Reason: ${reason}`,
          "Expected impact: brief ingestion gap (seconds) during container restart.",
          "Verification: get_worker_status returns HEALTHY; ingestion freshness resumes.",
          "→ Awaiting operator approval (medium risk).",
        ].join("\n"),
      );
    },
  }),

  defineTool({
    name: "prepare_rollback",
    description:
      "Draft an approval-gated rollback to a previous commit SHA. Creates a proposed action request; an operator must approve before the ops-runner checks out and rebuilds. Does NOT roll back by itself.",
    capability: "write",
    schema: z.object({
      service: z.string().min(1).default("jaguar-worker").describe("Service to roll back"),
      to_ref: z.string().min(1).describe("Target commit SHA to roll back to"),
      reason: z.string().min(1).describe("Why a rollback is needed"),
    }),
    handler: async ({ service, to_ref, reason }) => {
      const action = await createActionRequest({
        actionType: "rollback",
        title: `Roll back ${service} to ${to_ref}`,
        reason,
        payload: { service, targetSha: to_ref },
      });
      return text(
        [
          `DRAFTED ROLLBACK (action_request ${action.id}, status: ${action.status}, risk: ${action.riskLevel})`,
          "",
          `Candidate: roll ${service} back to ${to_ref}`,
          "Plan:",
          "  1. Operator approves this action request.",
          `  2. ops-runner checks out the target SHA and rebuilds: docker-compose up -d --build ${service}`,
          "  3. A deploy event is recorded for the rollback; worker health is verified.",
          `Reason: ${reason}`,
          "Risks: rebuild is slower than a plain restart; confirm the target SHA is known-good.",
          "→ Awaiting operator approval (HIGH risk).",
        ].join("\n"),
      );
    },
  }),

  defineTool({
    name: "draft_incident_update",
    description:
      "Draft a concise operator/stakeholder incident update (likely cause + next action). Returns text only — it does not create an action request.",
    capability: "write",
    schema: z.object({
      title: z.string().min(1).describe("One-line incident headline"),
      summary: z.string().min(1).describe("What is happening, impact, and current status"),
      severity: z.enum(["info", "warn", "critical"]).default("warn"),
      systems: z.array(z.string()).default([]).describe("Affected systems"),
      likely_cause: z.string().optional(),
      next_action: z.string().optional(),
    }),
    handler: async ({ title, summary, severity, systems, likely_cause, next_action }) => {
      const lines = [
        `DRAFT INCIDENT UPDATE — ${severity.toUpperCase()}`,
        systems.length > 0 ? `Systems: ${systems.join(", ")}` : "Systems: (unspecified)",
        "",
        `${title}`,
        summary,
      ];
      if (likely_cause) lines.push("", `Likely cause: ${likely_cause}`);
      if (next_action) lines.push(`Next action: ${next_action}`);
      lines.push("", "(Draft only — not an action request; copy into your incident channel.)");
      return text(lines.join("\n"));
    },
  }),

  defineTool({
    name: "list_pending_actions",
    description:
      "List action requests by status (default: proposed). Use to see what is awaiting operator approval or in flight.",
    capability: "read",
    schema: z.object({
      status: z
        .enum(["proposed", "approved", "rejected", "executing", "executed", "failed"])
        .default("proposed"),
      limit: z.number().int().min(1).max(50).default(20),
    }),
    handler: async ({ status, limit }) => {
      const actions = await listActionRequests({ status, limit });
      if (actions.length === 0) return text(`No ${status} action requests.`);
      const lines = [`ACTION REQUESTS (${actions.length}, status: ${status})`, ""];
      for (const a of actions) {
        lines.push(`${a.id} [${a.actionType}/${a.riskLevel}] ${a.title}`);
        lines.push(`  ${a.reason} · ${a.createdAt}`);
      }
      return text(lines.join("\n"));
    },
  }),

  defineTool({
    name: "get_action_request",
    description: "Fetch the full detail and lifecycle of a single action request by id.",
    capability: "read",
    schema: z.object({ id: z.string().min(1) }),
    handler: async ({ id }) => {
      const a = await getActionRequest(id);
      if (!a) return text(`No action request ${id}.`);
      const lines = [
        `ACTION REQUEST ${a.id}`,
        `Type: ${a.actionType} | Risk: ${a.riskLevel} | Status: ${a.status}`,
        `Title: ${a.title}`,
        `Reason: ${a.reason}`,
        `Proposed by: ${a.proposedBy} · ${a.createdAt}`,
      ];
      if (a.payload) lines.push(`Payload: ${JSON.stringify(a.payload)}`);
      if (a.resolvedBy) lines.push(`Resolved by: ${a.resolvedBy}`);
      if (a.approvedAt) lines.push(`Approved at: ${a.approvedAt}`);
      if (a.rejectedAt) lines.push(`Rejected at: ${a.rejectedAt}`);
      if (a.startedAt) lines.push(`Started at: ${a.startedAt}`);
      if (a.completedAt) lines.push(`Completed at: ${a.completedAt}`);
      if (a.result) lines.push(`Result: ${JSON.stringify(a.result)}`);
      return text(lines.join("\n"));
    },
  }),

  defineTool({
    name: "approve_action",
    description:
      "Approve a proposed action request so the ops-runner can execute it. Requires the operator secret (X-Operator-Secret header or operator_secret arg).",
    capability: "operator",
    schema: z.object({
      id: z.string().min(1),
      operator_secret: z
        .string()
        .optional()
        .describe("Operator secret if not supplied via the X-Operator-Secret header"),
      note: z.string().optional().describe("Optional operator note recorded with the approval"),
    }),
    handler: async ({ id, operator_secret, note }, ctx) => {
      if (!assertOperatorSecret(ctx.operatorSecretProvided ?? operator_secret)) {
        return errText("Operator secret required or invalid.");
      }
      const approved = await approveActionRequest(
        id,
        note ? `mcp-operator (${note})` : "mcp-operator",
      );
      if (!approved) return text(`Action ${id} could not be approved (not in 'proposed' state).`);
      return text(
        `APPROVED action_request ${id} (${approved.actionType}) — now queued for ops-runner.`,
      );
    },
  }),

  defineTool({
    name: "reject_action",
    description:
      "Reject a proposed action request. Requires the operator secret (X-Operator-Secret header or operator_secret arg).",
    capability: "operator",
    schema: z.object({
      id: z.string().min(1),
      reason: z.string().min(1).describe("Why the action is being rejected"),
      operator_secret: z
        .string()
        .optional()
        .describe("Operator secret if not supplied via the X-Operator-Secret header"),
    }),
    handler: async ({ id, reason, operator_secret }, ctx) => {
      if (!assertOperatorSecret(ctx.operatorSecretProvided ?? operator_secret)) {
        return errText("Operator secret required or invalid.");
      }
      const rejected = await rejectActionRequest(id, "mcp-operator", reason);
      if (!rejected) return text(`Action ${id} could not be rejected (not in 'proposed' state).`);
      return text(`REJECTED action_request ${id}.`);
    },
  }),
];

const toolByName = new Map<string, ToolDef>(TOOLS.map((t) => [t.name, t]));

const toInputSchema = (schema: z.ZodObject<z.ZodRawShape>): Record<string, unknown> => {
  // Drop the JSON-Schema meta keys MCP clients don't need; keep type/properties/required/default.
  const {
    $schema: _schema,
    definitions: _definitions,
    ...json
  } = zodToJsonSchema(schema, {
    $refStrategy: "none",
  }) as Record<string, unknown>;
  return json;
};

// Tool descriptors for an MCP `tools/list` response. Optionally filter by the
// capabilities a caller's key is allowed to see (used for future key scoping).
export const listToolDefinitions = (capabilities?: ToolCapability[]) => {
  const tools = capabilities ? TOOLS.filter((t) => capabilities.includes(t.capability)) : TOOLS;
  return tools.map((t) => ({
    name: t.name,
    description: t.description,
    inputSchema: toInputSchema(t.schema),
  }));
};

// Validate args against the tool's zod schema, then run it. Returns an MCP
// tool-call result (text content blocks; isError on failure).
export const dispatchTool = async (
  name: string,
  rawArgs: unknown,
  ctx: ToolContext = {},
): Promise<ToolContent> => {
  const tool = toolByName.get(name);
  if (!tool) {
    return { isError: true, content: [{ type: "text", text: `Unknown tool: ${name}` }] };
  }
  const parsed = tool.schema.safeParse(rawArgs ?? {});
  if (!parsed.success) {
    return {
      isError: true,
      content: [{ type: "text", text: `Invalid arguments for ${name}: ${parsed.error.message}` }],
    };
  }
  return tool.handler(parsed.data as Record<string, unknown>, ctx);
};
