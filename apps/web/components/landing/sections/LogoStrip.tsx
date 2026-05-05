import React from "react";

const stack = [
  { label: "GoldRush", icon: "solar:database-bold" },
  { label: "Solana", icon: "solar:sun-bold" },
  { label: "Raydium", icon: "solar:waterdrop-bold" },
  { label: "Pump.fun", icon: "solar:rocket-bold" },
  { label: "Meteora", icon: "solar:moon-stars-bold" },
  { label: "Claude", icon: "solar:cpu-bold" },
];

function StackItem({ label, icon }: { label: string; icon: string }) {
  return (
    <span
      className="flex shrink-0 items-center gap-2.5 text-2xl font-normal tracking-tight text-slate-400 transition-colors hover:text-slate-700"
      data-aura-component-name="LogoStrip"
    >
      <iconify-icon icon={icon} className="text-[#2ea86b]/80" data-aura-component-name="LogoStrip" />
      <span>{label}</span>
    </span>
  );
}

function StackTrack() {
  return (
    <div
      className="flex shrink-0 items-center gap-16 px-8"
      data-aura-component-name="LogoStrip"
    >
      {stack.map((item) => (
        <StackItem key={item.label} {...item} />
      ))}
    </div>
  );
}

export default function LogoStrip() {
  return (
    <div
      className="relative z-30 w-full overflow-hidden border-y border-slate-200/60 bg-slate-50 py-8"
      data-aura-component-name="LogoStrip"
    >
      <div
        className="absolute left-0 top-1/2 z-20 -translate-y-1/2 px-6 text-[11px] font-medium uppercase tracking-[0.2em] text-slate-400"
        data-aura-component-name="LogoStrip"
      >
        <span className="bg-slate-50 pr-4">Built with</span>
      </div>
      <div
        className="absolute bottom-0 left-0 top-0 z-10 w-40 bg-gradient-to-r from-slate-50 via-slate-50 to-transparent pointer-events-none"
        data-aura-component-name="LogoStrip"
      />
      <div
        className="absolute bottom-0 right-0 top-0 z-10 w-32 bg-gradient-to-l from-slate-50 to-transparent pointer-events-none"
        data-aura-component-name="LogoStrip"
      />
      <div className="flex w-max animate-marquee" data-aura-component-name="LogoStrip">
        <StackTrack />
        <StackTrack />
      </div>
    </div>
  );
}
