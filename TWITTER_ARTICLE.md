# Twitter Thread — Building with GoldRush / Covalent

**Tone:** Builder's perspective. Personal, credible, useful to other devs. Not marketing copy.
**Format:** 10-tweet thread. Demo video drops at tweet 5.

---

**Tweet 1 — Hook**

I built a real-time Solana conviction engine that scores every new token launch and tells you whether to ignore, watch, or enter — with actual evidence.

Here's what GoldRush made possible that I couldn't have built any other way. 🧵

---

**Tweet 2 — The problem**

Solana launches move fast. A token that's worth entering at minute two is dead by minute ten.

Most traders are doing this manually — four tabs open, checking charts, looking at pair data on-chain, cross-referencing volume. By the time they've processed it, the window is gone.

I wanted to build the middle layer that doesn't exist yet.

---

**Tweet 3 — What I needed**

To score a launch in real time, I needed:

→ Instant notification when a new pair hits the chain
→ Live liquidity, volume, and swap count updates as they happen
→ OHLCV candle data to track price momentum across time windows

All of this, streaming. Not polling. Not REST calls every 30 seconds.

That's what led me to GoldRush.

---

**Tweet 4 — What GoldRush unlocked**

GoldRush's streaming API gave me three WebSocket subscriptions that became the backbone of everything:

→ newPairs — fires the moment a token launches
→ updatePairs — pushes live liquidity, volume, swap data as it updates
→ ohlcvCandles (pair + token) — real-time candle data for price action

One persistent connection. Real Solana Mainnet data. No polling lag.

---

**Tweet 5 — Show the product**

On top of that I built:

→ A multi-factor conviction scoring engine (liquidity, volume, momentum, activity, freshness)
→ Persona-specific verdicts for degen, momentum, and risk-first traders
→ An AI analyst memo powered by Claude — bull case, bear case, next move
→ Paper trade tracking with real outcome data

[DROP DEMO VIDEO HERE]

---

**Tweet 6 — The honest insight**

The thing that surprised me most: how much signal is already in the stream.

I expected to need complex on-chain lookups on top of the GoldRush data. I didn't. The combination of liquidity + volume windows + swap count + price change across 1m/5m/15m/1h was enough to build a scoring model that actually catches real setups — and real traps.

The data was richer than I expected.

---

**Tweet 7 — What Jaguar caught**

Case in point — this launch.

$444k liquidity. $712k volume in an hour. 137% price rip. Every signal pointing enter.

Jaguar flagged it. All three personas opened paper trades.

Then the conviction delta flatlined. VOLATILITY_TOO_HIGH fired. The AI memo said: "All three personas just blew up on this one — skip it."

All three calls failed -12%. The system caught it.

---

**Tweet 8 — The stack**

Full stack for anyone building something similar:

→ GoldRush WebSocket streaming API
→ Node.js worker (persistent process, Docker on VPS)
→ Prisma + Supabase Postgres
→ Next.js 15 frontend (Vercel)
→ Claude (Haiku) for structured AI memos
→ pnpm monorepo

The worker and the web app are fully decoupled — the frontend just reads what the worker persists. Clean separation.

---

**Tweet 9 — Why it matters for builders**

If you're building anything on top of DeFi data — alerts, scoring, analytics, trading tools — the biggest bottleneck is usually the data layer.

GoldRush removes that bottleneck. You get production-grade streaming infrastructure without building an indexer from scratch.

That let me focus entirely on the conviction logic and the product.

---

**Tweet 10 — Close**

Jaguar is live at jaguaralpha.xyz

Built on @CovalentHQ / GoldRush, running on Solana Mainnet.

If you're building with on-chain data and want to talk architecture, reply or DM.

@CovalentHQ @GoldRush_

---

*Note: Tag @CovalentHQ and @GoldRush_ in tweet 10. Consider quote-tweeting the demo video tweet from tweet 5 as a standalone post separately.*
