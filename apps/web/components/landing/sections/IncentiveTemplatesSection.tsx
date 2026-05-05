import React from "react";

function CardChrome({ children, className = "", patternColor }: {
  children: React.ReactNode;
  className?: string;
  patternColor?: string;
}) {
  return (
    <div
      className={`group relative overflow-hidden rounded-3xl border border-slate-200/70 bg-white shadow-[0_15px_45px_rgba(15,23,42,0.05)] transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_25px_60px_rgba(15,23,42,0.08)] ${className}`}
      data-aura-component-name="IncentiveTemplates"
    >
      {patternColor && (
        <div
          className="pointer-events-none absolute inset-0 opacity-90"
          style={{
            backgroundImage: `repeating-linear-gradient(50deg, transparent 0 12px, ${patternColor} 12px 13px)`,
            maskImage:
              "linear-gradient(180deg, transparent 0%, #000 25%, #000 75%, transparent 100%)",
            WebkitMaskImage:
              "linear-gradient(180deg, transparent 0%, #000 25%, #000 75%, transparent 100%)",
          }}
        />
      )}
      {children}
    </div>
  );
}

function EarlyBuyerCard() {
  const rows = [
    { rank: 1, addr: "0xab2…fe19", reward: "1.2", avatar: "from-[#2ea86b] to-[#1e7a52]" },
    { rank: 2, addr: "0x9c4…01a3", reward: "0.84", avatar: "from-[#1e7a52] to-[#14593a]" },
    { rank: 3, addr: "0x71f…cc02", reward: "0.61", avatar: "from-[#14593a] to-[#0d3d27]" },
    { rank: 4, addr: "0x55a…b09e", reward: "0.42", avatar: "from-[#2ea86b] to-[#14593a]" },
    { rank: 5, addr: "0x84d…7f12", reward: "0.30", avatar: "from-[#1e7a52] to-[#2ea86b]" },
  ];
  return (
    <CardChrome
      className="lg:col-span-1 min-h-[560px] flex flex-col"
      patternColor="rgba(46, 168, 107, 0.06)"
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white via-white to-[#e8f3ec]/70" />
      <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-[#2ea86b]/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-16 -left-12 h-64 w-64 rounded-full bg-[#1e7a52]/25 blur-3xl" />

      <div className="relative z-10 flex flex-1 flex-col p-7">
        <div className="flex items-center gap-2">
          <iconify-icon icon="solar:cup-star-bold" className="text-[#2ea86b] text-lg" />
          <span className="text-xs font-medium uppercase tracking-[0.18em] text-[#2ea86b]">
            High Conviction
          </span>
        </div>
        <h3 className="mt-4 text-[26px] font-medium leading-[1.15] tracking-tight text-slate-900">
          Reward wallets that enter when conviction is highest.
        </h3>
        <p className="mt-3 text-[14px] leading-relaxed text-slate-500">
          Top N early wallets in the conviction window split the reward pool. Pure leaderboard, paid the moment the window closes.
        </p>

        <div className="mt-auto pt-6">
          <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white/92 shadow-[0_18px_45px_rgba(15,23,42,0.07)] backdrop-blur-md">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <span className="font-mono text-[11px] uppercase tracking-wider text-slate-400">
                Top 10 · VERDE
              </span>
              <span className="rounded-full bg-[#e8f3ec] px-2.5 py-0.5 text-[10px] font-semibold text-[#14593a] ring-1 ring-[#cfe8d9]">
                3.4 SOL pool
              </span>
            </div>
            <div className="divide-y divide-slate-100/80">
              {rows.map((r) => (
                <div key={r.addr} className="flex items-center gap-3 px-4 py-2.5">
                  <span className="w-3 font-mono text-[11px] font-semibold text-slate-400">
                    {r.rank}
                  </span>
                  <span className={`h-6 w-6 shrink-0 rounded-full bg-gradient-to-br ${r.avatar}`} />
                  <span className="flex-1 font-mono text-[12px] text-slate-700">{r.addr}</span>
                  <span className="font-mono text-[12px] font-semibold text-slate-900">
                    {r.reward}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </CardChrome>
  );
}

function WatchlistCard() {
  return (
    <CardChrome
      className="lg:col-span-2 min-h-[560px] flex flex-col"
      patternColor="rgba(30, 122, 82, 0.05)"
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white via-white to-[#cfe8d9]/70" />
      <div className="pointer-events-none absolute -right-24 -top-20 h-80 w-80 rounded-full bg-[#1e7a52]/25 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-[#14593a]/25 blur-3xl" />

      <div className="relative z-10 flex flex-1 flex-col p-7 lg:flex-row lg:items-stretch lg:gap-8 lg:p-8">
        <div className="lg:w-[42%] lg:pr-2">
          <div className="flex items-center gap-2">
            <iconify-icon icon="solar:eye-bold" className="text-[#1e7a52] text-lg" />
            <span className="text-xs font-medium uppercase tracking-[0.18em] text-[#1e7a52]">
              Watchlist
            </span>
          </div>
          <h3 className="mt-4 text-[26px] font-medium leading-[1.15] tracking-tight text-slate-900">
            Track pairs building conviction before they pop.
          </h3>
          <p className="mt-3 text-[14px] leading-relaxed text-slate-500">
            Add any pair to your watchlist. Jaguar scores it every minute and notifies you when conviction crosses your threshold.
          </p>
        </div>

        <div className="mt-6 flex-1 space-y-3 lg:mt-0">
          <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white/92 p-4 shadow-[0_18px_45px_rgba(15,23,42,0.07)] backdrop-blur-md">
            <div className="mb-2 flex items-center gap-2 text-[10px] font-medium uppercase tracking-wider text-slate-400">
              <iconify-icon icon="solar:bell-bold" className="text-[#1e7a52]" />
              Alert threshold
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-slate-900/95 px-3 py-2.5">
              <span className="flex-1 truncate font-mono text-[12px] text-slate-300">
                Conviction ≥ 80 · Vol growth ≥ 3×
              </span>
              <span className="rounded-md bg-white/10 px-2 py-1 text-[10px] font-medium text-white">
                Set
              </span>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg border border-slate-200/80 bg-white px-2 py-2">
                <div className="font-mono text-[16px] font-semibold text-slate-900">12</div>
                <div className="text-[10px] uppercase tracking-wider text-slate-400">Watching</div>
              </div>
              <div className="rounded-lg border border-slate-200/80 bg-white px-2 py-2">
                <div className="font-mono text-[16px] font-semibold text-slate-900">3</div>
                <div className="text-[10px] uppercase tracking-wider text-slate-400">Alerts</div>
              </div>
              <div className="rounded-lg border border-[#cfe8d9] bg-gradient-to-br from-[#e8f3ec] to-[#cfe8d9]/60 px-2 py-2 ring-1 ring-[#cfe8d9]">
                <div className="font-mono text-[16px] font-semibold text-[#14593a]">84</div>
                <div className="text-[10px] uppercase tracking-wider text-[#1e7a52]">Peak</div>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white/92 p-4 shadow-[0_18px_45px_rgba(15,23,42,0.07)] backdrop-blur-md">
            <div className="mb-3 flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase tracking-wider text-slate-400">
                Conviction trend · VERDE
              </span>
              <span className="flex items-center gap-1.5 rounded-full bg-[#e8f3ec] px-2.5 py-0.5 text-[10px] font-semibold text-[#14593a] ring-1 ring-[#cfe8d9]">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#2ea86b]" />
                Rising
              </span>
            </div>
            <div className="flex items-center gap-1.5 overflow-hidden">
              {Array.from({ length: 12 }).map((_, i) => (
                <span
                  key={i}
                  className={`h-7 flex-1 rounded-md ${
                    i < 8
                      ? "bg-gradient-to-b from-[#2ea86b] to-[#14593a]"
                      : "bg-slate-100"
                  }`}
                />
              ))}
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px]">
              <span className="text-slate-400">8 / 12 candles green</span>
              <span className="font-mono font-semibold text-slate-900">Score: 84 → 91</span>
            </div>
          </div>
        </div>
      </div>
    </CardChrome>
  );
}

function PersonaCard() {
  return (
    <CardChrome
      className="lg:col-span-3 min-h-[520px] flex flex-col md:flex-row"
      patternColor="rgba(20, 89, 58, 0.05)"
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white via-white to-[#cfe8d9]/60" />
      <div className="pointer-events-none absolute -right-16 -top-24 h-80 w-80 rounded-full bg-[#14593a]/25 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-16 h-80 w-80 rounded-full bg-[#2ea86b]/25 blur-3xl" />

      <div className="relative z-10 flex w-full flex-col p-7 md:w-[36%] md:p-8 lg:p-10">
        <div className="flex items-center gap-2">
          <iconify-icon icon="solar:users-group-rounded-bold" className="text-[#14593a] text-lg" />
          <span className="text-xs font-medium uppercase tracking-[0.18em] text-[#14593a]">
            Personas
          </span>
        </div>
        <h3 className="mt-4 max-w-[320px] text-[28px] font-medium leading-[1.1] tracking-tight text-slate-900 lg:text-[32px]">
          Different signals for different strategies.
        </h3>
        <p className="mt-4 max-w-[360px] text-[14px] leading-relaxed text-slate-500">
          Degen, Analyst, or Watcher — each persona tunes the conviction weights to match your risk tolerance and entry style. One dashboard, three lenses.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-3 text-[12px]">
          <span className="flex items-center gap-1.5 rounded-full border border-slate-200/80 bg-white/80 px-3 py-1.5 text-slate-600 backdrop-blur">
            <iconify-icon icon="solar:bolt-bold" className="text-[#14593a]" />
            Real-time scoring
          </span>
          <span className="flex items-center gap-1.5 rounded-full border border-slate-200/80 bg-white/80 px-3 py-1.5 text-slate-600 backdrop-blur">
            <iconify-icon icon="solar:bell-bold" className="text-[#14593a]" />
            Threshold alerts
          </span>
        </div>
      </div>

      <div className="relative z-10 flex-1 p-6 md:p-8">
        <div className="relative h-full min-h-[360px] w-full">
          <div className="absolute right-0 top-0 w-full max-w-[520px] rounded-2xl border border-slate-200/80 bg-white/92 shadow-[0_24px_60px_rgba(15,23,42,0.10)] backdrop-blur-md">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
              <div>
                <div className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
                  Conviction curve · VERDE
                </div>
                <div className="mt-0.5 text-sm font-semibold text-slate-900">
                  84 / 100 — rising
                </div>
              </div>
              <span className="flex items-center gap-1.5 rounded-full bg-[#e8f3ec] px-2.5 py-1 text-[11px] font-semibold text-[#14593a] ring-1 ring-[#cfe8d9]">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#2ea86b]" />
                ENTER signal
              </span>
            </div>
            <div className="px-5 py-5">
              <svg viewBox="0 0 480 130" className="w-full" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="conv-area" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#2ea86b" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#2ea86b" stopOpacity="0" />
                  </linearGradient>
                  <linearGradient id="conv-line" x1="0" x2="1" y1="0" y2="0">
                    <stop offset="0%" stopColor="#1e7a52" />
                    <stop offset="100%" stopColor="#2ea86b" />
                  </linearGradient>
                </defs>
                <path
                  d="M0,120 C80,115 140,108 180,95 C220,82 260,70 300,55 C340,42 380,30 420,20 L480,15 L480,130 L0,130 Z"
                  fill="url(#conv-area)"
                />
                <path
                  d="M0,120 C80,115 140,108 180,95 C220,82 260,70 300,55 C340,42 380,30 420,20 L480,15"
                  fill="none"
                  stroke="url(#conv-line)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
                <line x1="375" x2="375" y1="0" y2="130" stroke="#cbd5e1" strokeDasharray="3 4" strokeWidth="1" />
                <circle cx="420" cy="20" r="5" fill="#2ea86b" />
                <circle cx="420" cy="20" r="9" fill="#2ea86b" fillOpacity="0.25" />
              </svg>
              <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500">
                <span className="font-mono">T+4m 12s</span>
                <span className="flex items-center gap-2">
                  <span className="inline-block h-1.5 w-3 rounded-full bg-[#2ea86b]" />
                  Threshold 80
                </span>
                <span className="font-mono">Crossed ✓</span>
              </div>
            </div>
          </div>

          <div className="absolute -bottom-2 left-2 w-[280px] rounded-2xl border border-slate-200/80 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.10)] md:left-4">
            <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
              <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-[#2ea86b] to-[#14593a] text-white">
                <iconify-icon icon="solar:bolt-bold" className="absolute inset-0 m-auto text-base" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-semibold text-slate-900">
                  ENTER · VERDE
                </div>
                <div className="text-[11px] text-slate-500">Degen persona · score 84</div>
              </div>
            </div>
            <div className="px-4 py-3">
              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <span>Suggested size</span>
                <span className="font-mono font-semibold text-[#14593a]">0.42 SOL</span>
              </div>
            </div>
          </div>

          <div className="absolute right-0 -bottom-2 flex items-center gap-2 rounded-full border border-slate-200/80 bg-white px-3 py-2 shadow-[0_14px_40px_rgba(15,23,42,0.08)]">
            <div className="flex -space-x-1.5">
              <span className="h-6 w-6 rounded-full bg-gradient-to-br from-[#2ea86b] to-[#1e7a52] ring-2 ring-white" />
              <span className="h-6 w-6 rounded-full bg-gradient-to-br from-[#1e7a52] to-[#14593a] ring-2 ring-white" />
              <span className="h-6 w-6 rounded-full bg-gradient-to-br from-[#14593a] to-[#0d3d27] ring-2 ring-white" />
              <span className="h-6 w-6 rounded-full bg-gradient-to-br from-[#2ea86b] to-[#14593a] ring-2 ring-white" />
            </div>
            <span className="text-[11px] font-semibold text-slate-700">+38 watching</span>
          </div>
        </div>
      </div>
    </CardChrome>
  );
}

export default function IncentiveTemplatesSection() {
  return (
    <section
      id="templates"
      className="relative w-full bg-slate-50 px-6 py-24 lg:px-12 lg:py-28"
      data-aura-component-name="IncentiveTemplates"
    >
      <div className="mx-auto max-w-[1200px]">
        <div className="mx-auto mb-16 max-w-3xl text-center">
          <span className="mb-4 inline-block text-xs font-medium uppercase tracking-[0.22em] text-[#14593a]">
            Features
          </span>
          <h2 className="text-4xl font-medium leading-[1.1] tracking-tight text-slate-900 md:text-5xl">
            Every edge, built into the dashboard.
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-slate-500">
            From scanning to scoring to sizing — Jaguar gives you the signal infrastructure to trade Solana launches with confidence.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <EarlyBuyerCard />
          <WatchlistCard />
          <PersonaCard />
        </div>
      </div>
    </section>
  );
}
