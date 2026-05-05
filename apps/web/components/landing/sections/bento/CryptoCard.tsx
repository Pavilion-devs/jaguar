import React from "react";

export default function CryptoCard() {
  return (
    <div className="lg:col-span-1 relative bg-white rounded-3xl overflow-hidden border border-gray-200/60 shadow-sm group min-h-[500px] cursor-pointer p-8 flex flex-col" data-aura-component-name="BentoGrid">
      <div className="absolute inset-0 bg-[radial-gradient(#cfe8d9_1px,transparent_1px)] [background-size:12px_12px] opacity-60" data-aura-component-name="BentoGrid" />
      <div className="absolute inset-0 bg-gradient-to-b from-white via-white/90 to-[#f0f8f3]" data-aura-component-name="BentoGrid" />
      <div className="absolute inset-0 bg-gradient-to-tr from-[#e8f3ec]/40 via-transparent to-[#cfe8d9]/40 pointer-events-none" data-aura-component-name="BentoGrid" />
      <div className="relative z-20 flex justify-between" data-aura-component-name="BentoGrid">
        <h3 className="text-2xl font-medium tracking-tight text-gray-900 max-w-[260px] leading-tight" data-aura-component-name="BentoGrid">
          Real-time Solana pair analytics and scoring
        </h3>
        <div className="w-8 h-8 rounded-lg bg-[#e8f3ec] flex items-center justify-center text-[#14593a] opacity-0 group-hover:opacity-100 transition-opacity duration-300" data-aura-component-name="BentoGrid">
          <iconify-icon icon="lucide:expand" strokeWidth="1.5" data-aura-component-name="BentoGrid" />
        </div>
      </div>
      <div className="absolute top-0 right-0 bottom-0 left-0 z-10 flex items-center justify-center overflow-hidden" data-aura-component-name="BentoGrid">
        <svg className="absolute w-[140%] h-[140%] top-1/4 left-[-20%] group-hover:scale-105 transition-transform duration-1000 ease-out" viewBox="0 0 400 400" fill="none" data-aura-component-name="BentoGrid">
          <path d="M0,350 C150,150 250,50 400,200" stroke="#e5e7eb" strokeWidth="1.5" strokeDasharray="4 4" data-aura-component-name="BentoGrid" />
          <path d="M0,350 C150,150 250,50 400,200" stroke="url(#line-grad-g)" strokeWidth="1.5" strokeDasharray="4 4" data-aura-component-name="BentoGrid" />
          <defs>
            <linearGradient id="line-grad-g" x1={0} y1={0} x2={1} y2={0} data-aura-component-name="BentoGrid">
              <stop offset="0%" stopColor="#cfe8d9" stopOpacity={0} data-aura-component-name="BentoGrid" />
              <stop offset="50%" stopColor="#2ea86b" data-aura-component-name="BentoGrid" />
              <stop offset="100%" stopColor="#1e7a52" stopOpacity={0} data-aura-component-name="BentoGrid" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute bottom-[-88px] right-[-44px] w-[280px] h-[280px] rounded-full bg-[radial-gradient(circle_at_30%_30%,#ffffff_0%,#e8f3ec_28%,#cfe8d9_58%,#a8d4bc_78%,#2ea86b_100%)] shadow-[0_20px_60px_rgba(46,168,107,0.18)] border border-white/60 group-hover:scale-105 transition-transform duration-700 ease-out overflow-hidden" data-aura-component-name="BentoGrid">
          <div className="absolute inset-[10%] rounded-full border border-white/50" data-aura-component-name="BentoGrid" />
          <div className="absolute inset-[22%] rounded-full border border-white/40" data-aura-component-name="BentoGrid" />
          <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-px bg-white/50" data-aura-component-name="BentoGrid" />
          <div className="absolute inset-x-[18%] top-1/2 -translate-y-1/2 h-px bg-white/50" data-aura-component-name="BentoGrid" />
          <div className="absolute inset-x-[10%] top-[34%] h-px bg-white/35 rounded-full" data-aura-component-name="BentoGrid" />
          <div className="absolute inset-x-[10%] bottom-[34%] h-px bg-white/35 rounded-full" data-aura-component-name="BentoGrid" />
          <div className="absolute top-[16%] left-[28%] w-[44%] h-[68%] rounded-full border border-white/40 rotate-[18deg]" data-aura-component-name="BentoGrid" />
          <div className="absolute top-[16%] left-[28%] w-[44%] h-[68%] rounded-full border border-white/30 -rotate-[18deg]" data-aura-component-name="BentoGrid" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_35%_30%,rgba(255,255,255,0.65),transparent_30%)]" data-aura-component-name="BentoGrid" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_70%,rgba(255,255,255,0.12),transparent_35%)]" data-aura-component-name="BentoGrid" />
        </div>
        <div className="absolute top-[45%] left-[20%] bg-white border border-gray-100 shadow-sm rounded-full py-1.5 px-3 flex items-center gap-2 text-base font-medium text-gray-900 transform translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-700 ease-out" data-aura-component-name="BentoGrid">
          <iconify-icon icon="lucide:trending-up" className="text-[#2ea86b]" strokeWidth="1.5" data-aura-component-name="BentoGrid" />
          84
          <span className="text-gray-400 text-sm" data-aura-component-name="BentoGrid">
            score
          </span>
        </div>
        <div className="absolute top-[30%] right-[15%] bg-white border border-gray-100 shadow-sm rounded-full py-1.5 px-3 flex items-center gap-2 text-base font-medium text-gray-900 transform translate-y-8 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-700 delay-150 ease-out" data-aura-component-name="BentoGrid">
          <iconify-icon icon="lucide:activity" className="text-[#1e7a52]" strokeWidth="1.5" data-aura-component-name="BentoGrid" />
          $14k
          <span className="text-gray-400 text-sm" data-aura-component-name="BentoGrid">
            /min
          </span>
        </div>
        <div className="absolute bottom-[22%] left-[16%] bg-white/90 backdrop-blur border border-gray-100 shadow-sm rounded-full py-1.5 px-3 flex items-center gap-2 text-sm font-medium text-gray-900 transform translate-y-6 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-700 delay-300 ease-out" data-aura-component-name="BentoGrid">
          <div className="w-2 h-2 rounded-full bg-[#2ea86b]" data-aura-component-name="BentoGrid" />
          ENTER signal
        </div>
      </div>
    </div>
  );
}
