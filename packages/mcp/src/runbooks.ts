// Operational runbooks for Jaguar, surfaced to incident agents (Halo) via the
// search_runbooks / get_runbook MCP tools. Authored inline as a typed module so
// they bundle reliably into both the stdio server and the Next.js serverless
// build with zero runtime filesystem dependency.

export type RunbookSeverity = "info" | "warn" | "critical";

export type RunbookDoc = {
  slug: string;
  title: string;
  summary: string;
  tags: string[];
  severity: RunbookSeverity;
  systems: string[];
  body: string;
  updatedAt: string;
};

const RUNBOOKS: RunbookDoc[] = [
  {
    slug: "worker-offline",
    title: "Worker offline / no heartbeat",
    summary:
      "The ingestion worker has stopped heartbeating. Confirm it is actually down, find the likely cause, and restart it safely.",
    tags: ["worker", "heartbeat", "ingestion", "offline"],
    severity: "critical",
    systems: ["worker", "ingestion"],
    updatedAt: "2026-06-03",
    body: `# Worker offline / no heartbeat

## Detect
- \`get_worker_status\` reports Health = OFFLINE, or no heartbeat at all.
- \`get_ingestion_diagnostics\` shows a stale or missing latest heartbeat.
- The worker writes a heartbeat every 20s; an age over 60s means it is down or wedged.

## Diagnose
1. Check recent deploys with \`get_recent_deploys\` — an offline worker right after a deploy points at a bad release.
2. Check \`get_recent_failures\` and \`get_recent_status_events\` for a \`worker_stopped\`, \`heartbeat_stale\`, or \`stream_error\` burst just before it went quiet.
3. On the VPS, inspect the container: \`docker ps\` (is \`jaguar-worker\` running?) and \`docker logs --tail 200 jaguar-worker\`.
4. Common causes: crash on a bad deploy, GoldRush stream auth/connectivity failure, database connectivity loss, OOM.

## Remediate
- If the cause is a bad deploy, prefer **prepare_rollback** to the last-known-good SHA from \`get_recent_deploys\`.
- Otherwise **prepare_worker_restart**. Once an operator approves, the ops-runner executes:
  \`cd /opt/jaguar && docker-compose up -d --no-build jaguar-worker\`
- Do not restart blindly in a loop — if it crashes again immediately, gather logs and roll back instead.

## Verify
- \`get_worker_status\` returns Health = HEALTHY and the heartbeat age drops below 60s.
- \`get_ingestion_diagnostics\` shows stream activity resuming across sources.
- A \`recovery_complete\` operational event is recorded after a verified restart.`,
  },
  {
    slug: "stale-ingestion",
    title: "Stale ingestion / worker alive but no stream updates",
    summary:
      "The worker is heartbeating but stream/candle data has gone stale. Distinguish 'alive but unhealthy' from 'offline' and recover the stream, not the process.",
    tags: ["ingestion", "stream", "goldrush", "stale", "degraded"],
    severity: "warn",
    systems: ["ingestion"],
    updatedAt: "2026-06-03",
    body: `# Stale ingestion (worker alive, streams stale)

## Detect
- \`get_worker_status\` Health = STALE or DEGRADED while the heartbeat is still fresh.
- \`get_ingestion_diagnostics\` shows \`assessment.status\` = stale/degraded, or \`streams[].lastEventAt\` is old for one or more sources (newPairs, updatePairs, ohlcvCandlesForPair, ohlcvCandlesForToken).
- This is the key "alive but unhealthy" case — the process is up but not receiving data.

## Diagnose
1. Identify which source is stale from the per-stream \`lastEventAt\` in \`get_ingestion_diagnostics\`.
2. Check \`get_recent_status_events\` for repeated \`stream_reconnect\` / \`stream_error\` events — the worker auto-reconnects after 10m idle, so frequent reconnects indicate an upstream problem.
3. Likely causes: GoldRush stream degradation or rate limiting, expired/invalid \`GOLDRUSH_API_KEY\`, network egress issues from the VPS, or a single wedged subscription.

## Remediate
- If only the GoldRush upstream is flaky, wait for the worker's built-in reconnect (it re-subscribes after \`STREAM_IDLE_RECONNECT_MS\` = 10m) and monitor.
- If subscriptions are wedged or the API key was rotated, **prepare_worker_restart** to force a clean re-subscribe (approval-gated; ops-runner runs the compose restart).
- A full process restart is preferred over a rollback here, since the code is fine — the stream is the problem.

## Verify
- \`get_ingestion_diagnostics\` \`assessment.status\` returns to healthy and \`streams[].lastEventAt\` advances for the affected source.
- Candle row counts resume growing.`,
  },
  {
    slug: "alert-delivery-failure",
    title: "Alert delivery failure (Telegram)",
    summary:
      "Jaguar is scoring launches but Telegram alerts are not being delivered. Check the bot, the chat connection, and rate limits.",
    tags: ["alerts", "telegram", "delivery", "notifications"],
    severity: "warn",
    systems: ["alerts", "telegram"],
    updatedAt: "2026-06-03",
    body: `# Alert delivery failure (Telegram)

## Detect
- \`get_recent_failures\` / \`get_recent_status_events\` show \`telegram_failure\` events.
- Operators or users report missing enter alerts while \`get_alerts\` shows alerts are still firing internally (so scoring is fine; only delivery is broken).

## Diagnose
1. Look at the \`telegram_failure\` event \`summary\`/\`metadata\` for the upstream error (4xx vs 5xx, "chat not found", "bot was blocked", rate limit).
2. Confirm config on the worker: \`TELEGRAM_BOT_TOKEN\` set and valid; \`TELEGRAM_CHAT_ID\` for operator alerts; personal alerts enabled.
3. For personal alerts, confirm the user's chat is still connected (a user may have blocked the bot or disconnected).
4. Telegram 429s indicate rate limiting — too many sends in a burst.

## Remediate
- Invalid/rotated token: update \`TELEGRAM_BOT_TOKEN\` in the VPS env and **prepare_worker_restart** so the notifier picks it up.
- "chat not found" / blocked: the affected user must reconnect their chat in Settings; no restart needed.
- Rate limiting: usually transient — the drain loop retries on the next poll; no action beyond monitoring.
- This is delivery-only — do **not** roll back code or restart ingestion for a Telegram outage unless config changed.

## Verify
- New \`telegram_failure\` events stop appearing in \`get_recent_status_events\`.
- Use the Settings "send test alert" path to confirm operator delivery, and confirm a user receives a fresh personal alert.`,
  },
];

export const loadRunbooks = (): RunbookDoc[] => RUNBOOKS;

export const getRunbook = (slug: string): RunbookDoc | null =>
  RUNBOOKS.find((r) => r.slug === slug.trim().toLowerCase()) ?? null;

// Case-insensitive ranking-free filter across slug/title/summary/tags/systems/body,
// with optional tag and severity filters.
export const searchRunbooks = (
  query: string,
  filters?: { tags?: string[]; severity?: RunbookSeverity },
): RunbookDoc[] => {
  const q = query.trim().toLowerCase();
  const wantTags = filters?.tags?.map((t) => t.toLowerCase());
  return RUNBOOKS.filter((r) => {
    if (filters?.severity && r.severity !== filters.severity) return false;
    if (wantTags && wantTags.length > 0 && !wantTags.some((t) => r.tags.includes(t))) {
      return false;
    }
    if (!q) return true;
    const haystack =
      `${r.slug} ${r.title} ${r.summary} ${r.tags.join(" ")} ${r.systems.join(" ")} ${r.body}`.toLowerCase();
    return haystack.includes(q);
  });
};
