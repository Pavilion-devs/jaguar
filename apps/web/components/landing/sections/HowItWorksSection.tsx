import React from "react";

const accents = {
  pink: {
    tint: "from-white via-white to-[#e8f3ec]/60",
    blurA: "bg-[#2ea86b]/25",
    blurB: "bg-[#1e7a52]/20",
    badge: "from-[#2ea86b] to-[#1e7a52]",
    ring: "ring-[#2ea86b]/15",
    line: "rgba(46, 168, 107, 0.07)",
  },
  violet: {
    tint: "from-white via-white to-[#cfe8d9]/60",
    blurA: "bg-[#1e7a52]/25",
    blurB: "bg-[#14593a]/20",
    badge: "from-[#1e7a52] to-[#14593a]",
    ring: "ring-[#1e7a52]/15",
    line: "rgba(30, 122, 82, 0.07)",
  },
  indigo: {
    tint: "from-white via-white to-[#cfe8d9]/60",
    blurA: "bg-[#14593a]/25",
    blurB: "bg-[#2ea86b]/20",
    badge: "from-[#14593a] to-[#1e7a52]",
    ring: "ring-[#14593a]/15",
    line: "rgba(20, 89, 58, 0.07)",
  },
};

function StepCard({ step, accent, eyebrow, title, description, children }: {
  step: number;
  accent: keyof typeof accents;
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  const a = accents[accent];
  return (
    <div
      className={`group relative flex min-h-[480px] cursor-default flex-col overflow-hidden rounded-3xl border border-slate-200/70 bg-white shadow-[0_15px_45px_rgba(15,23,42,0.05)] ring-1 ${a.ring} transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_25px_60px_rgba(15,23,42,0.08)]`}
      data-aura-component-name="HowItWorks"
    >
      <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${a.tint}`} />
      <div className={`pointer-events-none absolute -right-16 -top-20 h-72 w-72 rounded-full ${a.blurA} blur-3xl`} />
      <div className={`pointer-events-none absolute -bottom-24 -left-16 h-72 w-72 rounded-full ${a.blurB} blur-3xl`} />
      <div
        className="pointer-events-none absolute inset-0 opacity-90"
        style={{
          backgroundImage: `repeating-linear-gradient(50deg, transparent 0 12px, ${a.line} 12px 13px)`,
          maskImage: "linear-gradient(180deg, transparent 0%, #000 30%, #000 70%, transparent 100%)",
          WebkitMaskImage: "linear-gradient(180deg, transparent 0%, #000 30%, #000 70%, transparent 100%)",
        }}
      />

      <div className="relative z-10 flex flex-1 flex-col p-7 md:p-8">
        <div className="flex items-center gap-3">
          <span
            className={`flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br ${a.badge} text-sm font-semibold text-white shadow-lg shadow-slate-900/10`}
          >
            {step}
          </span>
          <span className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
            {eyebrow}
          </span>
        </div>
        <h3 className="mt-5 text-[26px] font-medium leading-[1.15] tracking-tight text-slate-900">
          {title}
        </h3>
        <p className="mt-3 text-[15px] leading-relaxed text-slate-500">{description}</p>
        <div className="mt-auto pt-8">{children}</div>
      </div>
    </div>
  );
}

function ScanMockup() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-[0_18px_45px_rgba(15,23,42,0.07)] backdrop-blur-md">
      <div className="flex items-center gap-3">
        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-[#2ea86b] via-[#1e7a52] to-[#14593a]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_25%,rgba(255,255,255,0.7),transparent_55%)]" />
        </div>
        <div className="flex-1">
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-semibold text-slate-900">VERDE</span>
            <span className="text-[11px] font-mono text-slate-400">SOL/USDC</span>
          </div>
          <div className="mt-1.5 h-1.5 w-3/4 rounded-full bg-slate-100">
            <div className="h-full w-2/3 rounded-full bg-gradient-to-r from-[#2ea86b] to-[#1e7a52]" />
          </div>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 text-[11px]">
        <div className="rounded-lg border border-slate-200/80 bg-white px-2.5 py-2">
          <div className="text-slate-400">Age</div>
          <div className="mt-0.5 font-mono font-medium text-slate-700">4m 12s</div>
        </div>
        <div className="rounded-lg border border-slate-200/80 bg-white px-2.5 py-2">
          <div className="text-slate-400">Vol / min</div>
          <div className="mt-0.5 font-mono font-medium text-slate-700">$14,200</div>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between rounded-xl bg-slate-900/95 px-3 py-2.5">
        <span className="text-[11px] font-medium text-slate-300">Scanning pair</span>
        <span className="rounded-full bg-gradient-to-r from-[#2ea86b] to-[#1e7a52] px-3 py-1 text-[11px] font-semibold text-white shadow-md shadow-[#2ea86b]/30">
          Live →
        </span>
      </div>
    </div>
  );
}

function ScoreMockup() {
  const signals = [
    { label: "Vol growth", chip: "↑ 4.2×", good: true },
    { label: "Wallet spread", chip: "82 uniq", good: true },
    { label: "Dev sell", chip: "None", good: false },
  ];
  return (
    <div className="relative space-y-1.5 overflow-hidden rounded-2xl border border-slate-200/80 bg-white/90 p-3 shadow-[0_18px_45px_rgba(15,23,42,0.07)] backdrop-blur-md">
      {signals.map((s) => (
        <div
          key={s.label}
          className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-all ${
            s.good
              ? "border-[#cfe8d9] bg-gradient-to-r from-[#e8f3ec] to-[#cfe8d9]/60 shadow-sm shadow-[#2ea86b]/10"
              : "border-slate-200/70 bg-white/70"
          }`}
        >
          <span
            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
              s.good ? "border-[#14593a] bg-[#14593a]" : "border-slate-300 bg-white"
            }`}
          >
            {s.good && (
              <iconify-icon icon="lucide:check" className="text-white text-[12px]" strokewidth="3" />
            )}
          </span>
          <span className="flex-1 text-[13px] font-medium text-slate-800">{s.label}</span>
          <span
            className={`rounded-full px-2 py-0.5 font-mono text-[10px] font-medium ${
              s.good ? "bg-[#14593a] text-white" : "bg-slate-100 text-slate-500"
            }`}
          >
            {s.chip}
          </span>
        </div>
      ))}
      <div className="mt-2 flex items-center justify-between rounded-xl bg-slate-900/95 px-3 py-2.5">
        <span className="text-[11px] font-medium text-slate-300">Conviction score</span>
        <span className="font-mono text-[12px] font-semibold text-white">84 / 100</span>
      </div>
    </div>
  );
}

function AlertMockup() {
  const rows = [
    { addr: "0xab2…fe19", val: "12.4", you: false },
    { addr: "0x9c4…01a3", val: "8.7", you: true },
    { addr: "0x71f…cc02", val: "6.1", you: false },
  ];
  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-[0_18px_45px_rgba(15,23,42,0.07)] backdrop-blur-md">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="text-[11px] font-medium text-slate-400">Entry alert</div>
          <div className="text-sm font-semibold text-slate-900">VERDE · ENTER signal</div>
        </div>
        <span className="flex items-center gap-1.5 rounded-full bg-[#e8f3ec] px-2.5 py-1 text-[11px] font-medium text-[#14593a] ring-1 ring-[#cfe8d9]">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#2ea86b]" />
          Live
        </span>
      </div>
      <div className="space-y-1.5">
        {rows.map((r, i) => (
          <div
            key={r.addr}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 ${
              r.you ? "bg-gradient-to-r from-[#e8f3ec] to-[#cfe8d9]/50 ring-1 ring-[#cfe8d9]" : "bg-slate-50/70"
            }`}
          >
            <span className="w-4 font-mono text-[11px] font-medium text-slate-400">{i + 1}</span>
            <span className="flex-1 font-mono text-[12px] text-slate-700">{r.addr}</span>
            {r.you && (
              <span className="rounded-full bg-[#14593a] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">
                You
              </span>
            )}
            <span className="font-mono text-[12px] font-semibold text-slate-900">{r.val} SOL</span>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between rounded-xl bg-slate-900/95 px-3 py-2.5">
        <span className="text-[11px] font-medium text-slate-300">Recommended size</span>
        <span className="font-mono text-[12px] font-semibold text-white">0.42 SOL</span>
      </div>
    </div>
  );
}

export default function HowItWorksSection() {
  return (
    <section
      id="how-it-works"
      className="relative w-full bg-white px-6 py-24 lg:px-12 lg:py-28"
      data-aura-component-name="HowItWorks"
    >
      <div className="mx-auto max-w-[1200px]">
        <div className="mx-auto mb-16 max-w-3xl text-center">
          <span className="mb-4 inline-block text-xs font-medium uppercase tracking-[0.22em] text-[#2ea86b]">
            How it works
          </span>
          <h2 className="text-4xl font-medium leading-[1.1] tracking-tight text-slate-900 md:text-5xl">
            Three steps from launch to entry.
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-slate-500">
            Jaguar watches every new pair, scores conviction in real time, and surfaces the signal when the setup is right.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <StepCard
            step={1}
            accent="pink"
            eyebrow="Scan"
            title="Every new Solana pair, watched from block one."
            description="Jaguar ingests every new pair the moment it appears — volume, wallet spread, dev activity, and liquidity depth tracked from second zero."
          >
            <ScanMockup />
          </StepCard>

          <StepCard
            step={2}
            accent="violet"
            eyebrow="Score"
            title="Conviction scored minute by minute."
            description="A weighted signal model runs every 60 seconds. Volume growth, holder diversity, and risk flags combine into a single conviction score."
          >
            <ScoreMockup />
          </StepCard>

          <StepCard
            step={3}
            accent="indigo"
            eyebrow="Enter"
            title="Alerts tell you when — and with evidence."
            description="When a pair crosses your threshold, you get the signal with the full evidence trail: why it scored, what changed, and what the suggested size is."
          >
            <AlertMockup />
          </StepCard>
        </div>
      </div>
    </section>
  );
}
