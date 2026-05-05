import React from "react";

export default function IssuingCard() {
  return (
    <div className="lg:col-span-1 relative bg-white rounded-3xl overflow-hidden border border-gray-200/60 shadow-sm group min-h-[500px] cursor-pointer p-8 flex flex-col" data-aura-component-name="BentoGrid">
      <div className="absolute inset-0 bg-[radial-gradient(#cfe8d9_1px,transparent_1px)] [background-size:12px_12px] opacity-30" data-aura-component-name="BentoGrid" />
      <div className="absolute inset-0 bg-gradient-to-b from-white via-white/80 to-transparent" data-aura-component-name="BentoGrid" />
      <div className="relative z-20 flex justify-between" data-aura-component-name="BentoGrid">
        <h3 className="text-2xl font-medium tracking-tight text-gray-900 max-w-[220px] leading-tight" data-aura-component-name="BentoGrid">
          Track every wallet that matters
        </h3>
        <div className="w-8 h-8 rounded-lg bg-[#e8f3ec] flex items-center justify-center text-[#14593a] opacity-0 group-hover:opacity-100 transition-opacity duration-300" data-aura-component-name="BentoGrid">
          <iconify-icon icon="lucide:expand" strokeWidth="1.5" data-aura-component-name="BentoGrid" />
        </div>
      </div>
      <div className="absolute inset-x-0 bottom-0 z-10 flex justify-center pt-32" data-aura-component-name="BentoGrid">
        <div className="w-56 h-72 rounded-t-3xl bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-[#cfe8d9] via-[#2ea86b] to-[#14593a] p-6 shadow-2xl transform translate-y-12 group-hover:translate-y-4 group-hover:rotate-2 group-hover:scale-105 transition-all duration-700 ease-out border border-white/40 flex flex-col relative overflow-hidden" data-aura-component-name="BentoGrid">
          <div className="absolute inset-0 flex items-center justify-center opacity-40 mix-blend-overlay pointer-events-none" data-aura-component-name="BentoGrid">
            <div className="w-[200%] h-32 bg-white rounded-[100%] transform -rotate-12 translate-y-12 blur-md" data-aura-component-name="BentoGrid" />
          </div>
          <div className="flex items-center gap-3 relative z-10" data-aura-component-name="BentoGrid">
            <div className="w-10 h-8 bg-white/30 backdrop-blur border border-white/40 rounded flex items-center justify-center px-1" data-aura-component-name="BentoGrid">
              <div className="w-full h-full border border-white/50 rounded-sm grid grid-cols-2 grid-rows-3 gap-[1px]" data-aura-component-name="BentoGrid">
                <div className="border-r border-b border-white/50" data-aura-component-name="BentoGrid" />
                <div className="border-b border-white/50" data-aura-component-name="BentoGrid" />
                <div className="border-r border-b border-white/50" data-aura-component-name="BentoGrid" />
                <div className="border-b border-white/50" data-aura-component-name="BentoGrid" />
                <div className="border-r border-white/50" data-aura-component-name="BentoGrid" />
                <div />
              </div>
            </div>
            <iconify-icon icon="lucide:wifi" className="text-white text-2xl rotate-90" strokeWidth={2} data-aura-component-name="BentoGrid" />
          </div>
          <div className="mt-auto flex justify-end relative z-10" data-aura-component-name="BentoGrid">
            <span className="text-white font-bold text-3xl italic tracking-tighter" data-aura-component-name="BentoGrid">
              JAG
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
