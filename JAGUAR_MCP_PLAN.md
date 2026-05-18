# Jaguar MCP Server — Build Plan

Last updated: 2026-05-18

---

## What This Is

A Model Context Protocol (MCP) server that exposes Jaguar's conviction intelligence layer to any AI agent — Claude Code, Cursor, Claude Desktop, or any MCP-compatible client.

GoldRush already has an MCP for raw blockchain data. Jaguar's MCP sits one layer above: scored, verdicted, AI-analysed Solana launch intelligence that no other MCP provides.

---

## Why It's Unique

The GoldRush MCP gives agents raw chain data — balances, transactions, token metadata.

Jaguar MCP gives agents **processed conviction** — live scores, verdicts, reason codes, AI memos, paper trade outcomes, persona-specific calls. An agent asking "is this token worth entering right now?" gets a real answer backed by live data, not raw numbers to interpret.

---

## Tools To Expose

### 1. `get_top_launches`
Returns the current top conviction launches ranked by score.

**Inputs:**
- `persona` — `degen | momentum | risk-first` (default: `momentum`)
- `verdict_filter` — `enter | watch | all` (default: `all`)
- `limit` — number of results (default: 10, max: 50)

**Returns:** Array of launches with symbol, score, verdict, liquidity, volume, reason codes, age

---

### 2. `get_launch_detail`
Full detail on a single launch by pair address or token symbol.

**Inputs:**
- `pair_address` or `symbol` — one required

**Returns:** Full scored launch — score, verdict, persona verdicts, liquidity, volume windows, price change windows, delta chart values, reason codes, last event time

---

### 3. `get_launch_memo`
The AI analyst memo for a launch.

**Inputs:**
- `pair_address` or `symbol` — one required

**Returns:** Headline, bull case, bear case, next move, confidence score, model used, generated at timestamp

---

### 4. `get_launch_timeline`
Recent timeline events for a launch — verdict changes, alerts, paper trade opens/settles.

**Inputs:**
- `pair_address` or `symbol` — one required
- `limit` — number of events (default: 10)

**Returns:** Array of timeline entries with title, summary, severity, timestamp

---

### 5. `get_scorecard`
Jaguar's paper trade win rate and recent recommendation outcomes.

**Inputs:**
- `persona` — `degen | momentum | risk-first | all` (default: `all`)

**Returns:** Total issued, win rate %, settled count, validated count, failed count, recent recommendations with outcomes

---

### 6. `get_alerts`
Recent alerts fired by the system.

**Inputs:**
- `limit` — number of alerts (default: 20)
- `severity` — `info | warn | critical | all` (default: `all`)

**Returns:** Array of alerts with token, alert type, title, body, severity, timestamp

---

### 7. `get_worker_status`
Check if the Jaguar worker is alive and ingesting.

**Inputs:** None

**Returns:** Worker key, last heartbeat time, tracked pair count, chain name, stream URL — effectively a health check

---

## Architecture

```
AI Agent (Claude / Cursor / etc.)
        ↓  MCP protocol (stdio or HTTP)
Jaguar MCP Server  (new — packages/mcp)
        ↓  imports directly
@jaguar/db  (existing — read-only queries)
        ↓
Supabase Postgres  (existing)
```

The MCP server is read-only. It never writes to the database. The worker continues to own all ingestion and writes.

---

## Monorepo Placement

New package: `packages/mcp`

```
packages/mcp/
  src/
    index.ts        — MCP server entry point
    tools/
      get_top_launches.ts
      get_launch_detail.ts
      get_launch_memo.ts
      get_launch_timeline.ts
      get_scorecard.ts
      get_alerts.ts
      get_worker_status.ts
  package.json
  tsconfig.json
```

---

## Dependencies

```json
{
  "@modelcontextprotocol/sdk": "latest",
  "@jaguar/db": "workspace:*",
  "@jaguar/domain": "workspace:*",
  "zod": "^3"
}
```

---

## Transport

Support both:
- **stdio** — for Claude Code / Claude Desktop / Cursor (local use)
- **HTTP/SSE** — for remote agents or hosted deployments

Start with stdio. Add HTTP after.

---

## package.json (packages/mcp)

```json
{
  "name": "@jaguar/mcp",
  "version": "0.1.0",
  "description": "Jaguar MCP server — Solana launch conviction intelligence for AI agents",
  "type": "module",
  "bin": {
    "jaguar-mcp": "./dist/index.js"
  },
  "scripts": {
    "dev": "tsx src/index.ts",
    "build": "tsc",
    "typecheck": "tsc --noEmit"
  }
}
```

---

## Claude Desktop / Claude Code Config (for local use)

```json
{
  "mcpServers": {
    "jaguar": {
      "command": "npx",
      "args": ["-y", "@jaguar/mcp"],
      "env": {
        "DATABASE_URL": "your_database_url"
      }
    }
  }
}
```

---

## Jaguar UI Integration

Add a dedicated **"Connect to Agent"** section in the dashboard — a simple setup panel that shows:

1. A one-line install command users can copy:
   ```
   npx -y @jaguar/mcp
   ```
2. The MCP config JSON snippet to paste into Claude Desktop or Claude Code settings
3. A list of example prompts they can ask their agent:
   - "What are the top Solana launches right now?"
   - "Should I enter $SYMBOL? What does Jaguar say?"
   - "What's the current win rate on enter calls?"
   - "Show me the analyst memo for this pair"
   - "Any critical alerts in the last hour?"

UI placement: sidebar nav item or a card inside the Dashboard page. Keep it minimal — just the install snippet and example prompts. Not a full settings page.

---

## Build Order

1. `packages/mcp` scaffold — package.json, tsconfig, MCP server boilerplate
2. Implement `get_top_launches` and `get_worker_status` first (simplest, proves the connection)
3. Implement `get_launch_detail` and `get_launch_memo`
4. Implement `get_launch_timeline`, `get_scorecard`, `get_alerts`
5. Test locally with Claude Code / Claude Desktop using stdio transport
6. Add HTTP transport
7. UI panel in `apps/web` — "Connect to Agent" section
8. Publish `@jaguar/mcp` to npm (optional, needed for `npx` install to work publicly)

---

## Story For The Submission / Twitter

GoldRush handles the raw stream.
Jaguar adds the conviction layer.
The Jaguar MCP makes that conviction available to any AI agent.

Raw data → scored intelligence → agent-accessible decisions.
That's the full stack.
