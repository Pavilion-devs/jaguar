# Jaguar

**Real-time Solana launch conviction engine powered by GoldRush.**

Jaguar watches every new Solana pair, scores conviction minute by minute, and tells you — with evidence — whether to ignore, watch, or enter. It is not a scanner. It is a decision layer.

---

## What makes it different

Most launch tools dump raw alerts and static scores. Jaguar does three things they don't:

**Conviction delta, not a static score.** Jaguar tracks how conviction moves over 1m / 5m / 15m / 1h windows — not just what the score is right now. A launch climbing from 20 → 55 in five minutes tells a different story than one sitting at 55 all day.

**Persona-based verdicts.** The same launch may be `enter` for a degen and `watch` for a risk-first trader. Jaguar computes separate verdicts per persona using the same underlying signal.

**Accountability.** Every `enter` call Jaguar issues gets paper-tracked with entry price and outcome windows. The scorecard page shows exactly how accurate the agent has been. No hiding behind black-box scores.

---

## Core features

- Live launch feed from GoldRush (`newPairs`, `updatePairs`, pair/token OHLCV streams)
- 100-point conviction score with reason codes (`LIQUIDITY_SURGED`, `SETUP_INVALIDATED`, `BREAKOUT_CONFIRMED`, etc.)
- Conviction delta chart — visualises how belief in a setup is building or fading
- Persona-adaptive verdicts: **degen**, **momentum**, **risk-first**
- Autonomous Claude-powered analyst — fires on real signal transitions, writes decision memos tied to stored data
- Paper trade attribution — Jaguar tracks whether its own calls held up
- Alert compression — threshold-crossing alerts with 5-minute cooldown, no spam
- Personal Telegram alerts — connect a chat, tune filters, and receive real-time trade alerts
- Wallet monitor — connect Phantom to see live signals on tokens you hold
- Analyst inbox — full activity log of memos, alerts, and paper calls

---

## Tech stack

| Layer | Tech |
|---|---|
| Data streams | [GoldRush](https://goldrush.dev) WebSocket GraphQL |
| Chain | Solana mainnet |
| DEX coverage | Raydium, Pump.fun, Meteora, Orca, Moonshot |
| AI analyst | Claude (Anthropic) via structured output |
| Frontend | Next.js 15, Tailwind v4 |
| Database | Supabase Postgres via Prisma |
| Monorepo | pnpm workspaces |

---

## Project structure

```
apps/
  web/        # Next.js frontend — landing page + dashboard
  worker/     # Node.js streaming daemon — GoldRush ingestion + scoring

packages/
  agent/      # Claude-powered memo generation
  db/         # Prisma schema + all DB operations
  domain/     # Shared TypeScript types
  goldrush/   # GoldRush GraphQL client
  scoring/    # Conviction scoring algorithm
```

---

## Running locally

**1. Install dependencies**
```bash
pnpm install
```

**2. Set up environment**
```bash
cp .env.example .env
# Fill in Supabase Postgres URLs, GOLDRUSH_API_KEY, and ANTHROPIC_API_KEY
```

**3. Set up the database**
```bash
cd packages/db
pnpm db:push
```

**4. Start the worker** (streams live GoldRush data)
```bash
cd apps/worker
pnpm dev
```

**5. Start the frontend**
```bash
cd apps/web
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

The dashboard populates as the worker ingests live Solana launch data from GoldRush. The worker needs to run for a few minutes before the launches feed shows real data.

---

## Environment variables

| Variable | Description |
|---|---|
| `GOLDRUSH_API_KEY` | GoldRush API key — get one at [goldrush.dev](https://goldrush.dev) |
| `ANTHROPIC_API_KEY` | Anthropic API key for Claude analyst memos |
| `DATABASE_URL` | Supabase pooled Postgres connection string for app/runtime traffic |
| `DIRECT_URL` | Supabase direct/session Postgres connection string for Prisma schema changes |
| `JAGUAR_AGENT_PROVIDER` | `claude` or `openai` (default: `openai`) |
| `OPENAI_API_KEY` | OpenAI key — only needed if using OpenAI provider |
| `TELEGRAM_BOT_TOKEN` | Telegram bot token used by the web connect/test flow and worker alert delivery |
| `TELEGRAM_CHAT_ID` | Optional operator/global Telegram chat for platform-level enter alerts |
| `TELEGRAM_ALERT_PERSONAS` | Comma-separated personas for operator alerts, or `all` |
| `TELEGRAM_ALERT_POLL_MS` | Worker poll interval for Telegram alert delivery |
| `TELEGRAM_ALERT_LOOKBACK_MINUTES` | Worker lookback window for pending Telegram alerts |
| `TELEGRAM_PERSONAL_ALERTS_ENABLED` | Set to `false` to disable per-user Telegram fanout |
| `TELEGRAM_CONNECT_SECRET` | Secret used to sign Telegram connect tokens; falls back to `TELEGRAM_BOT_TOKEN` |

---

## Telegram personalization

Jaguar can deliver personal trade alerts directly to Telegram.

From **Settings**, a user can:

- connect the Jaguar Telegram bot to a private chat
- send a test alert to confirm delivery
- disconnect the chat without losing alert history
- enable or pause Telegram delivery
- choose personas: `momentum`, `degen`, `risk-first`
- choose alert verdicts: `watch`, `enter`
- set minimum score, liquidity floor, protocol filters, and max alerts per hour

The connect flow uses Telegram deep links:

```text
https://t.me/Jaguarxyz_bot?start=connect_<signed-token>
```

Telegram sends `/start connect_<signed-token>` to the webhook route:

```text
/api/telegram/webhook
```

The webhook verifies the signed token, links the Telegram `chat.id` to the user's alert profile, and stores the connection in Supabase. The worker then fans out matching `paper-trade-opened` alerts to connected chats and records each send in `AlertDelivery`.

The global/operator alert path still works through `TELEGRAM_CHAT_ID`; personal delivery is separate and deduped per user.

---

## GoldRush integration

Jaguar uses four GoldRush streaming endpoints concurrently:

- `newPairs` — discovers launches as they happen
- `updatePairs` — tracks live pair activity (volume, liquidity, price)
- `ohlcvCandlesForPair` — pair-level OHLCV for momentum analysis
- `ohlcvCandlesForToken` — token-level OHLCV fallback

The worker dynamically rotates subscription sets as new launches arrive, keeping the highest-signal pairs subscribed at all times.
