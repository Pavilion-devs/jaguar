import React from "react";

export default function UnifiedCheckoutCard() {
  return (
    <div className="lg:col-span-2 relative bg-gray-50 rounded-3xl overflow-hidden border border-gray-200/60 shadow-sm group min-h-[500px] cursor-pointer" data-aura-component-name="BentoGrid">
      <div className="absolute inset-0 bg-gradient-to-br from-[#e8f3ec] to-[#cfe8d9]/60" data-aura-component-name="BentoGrid" />
      <div className="absolute top-[-20%] right-[-10%] w-[80%] h-[120%] bg-gradient-to-br from-[#2ea86b]/20 via-[#1e7a52]/20 to-[#14593a]/20 blur-[80px] rounded-full mix-blend-multiply group-hover:scale-110 transition-transform duration-1000 ease-out" data-aura-component-name="BentoGrid" />
      <div className="absolute inset-0 flex flex-col md:flex-row items-end justify-center gap-8 pt-12 px-8 overflow-hidden" data-aura-component-name="BentoGrid">
        <div className="w-[260px] h-[480px] bg-white rounded-[2.5rem] border-[8px] border-gray-900 shadow-2xl relative z-10 translate-y-12 group-hover:translate-y-6 transition-transform duration-700 ease-out flex-shrink-0 flex flex-col" data-aura-component-name="BentoGrid">
          <div className="flex-1 px-5 py-6 flex flex-col items-center" data-aura-component-name="BentoGrid">
            <div className="w-12 h-1.5 rounded-full bg-gray-900 mb-5" data-aura-component-name="BentoGrid" />
            <iconify-icon icon="lucide:activity" className="text-gray-800 text-2xl mb-6" strokeWidth="1.5" data-aura-component-name="BentoGrid" />
            <p className="text-base font-medium text-gray-500 mb-1" data-aura-component-name="BentoGrid">
              Jaguar · VERDE
            </p>
            <h3 className="text-3xl font-medium tracking-tight text-gray-900 mb-2" data-aura-component-name="BentoGrid">
              Score: 84
            </h3>
            <p className="text-xs text-gray-400 text-center mb-8" data-aura-component-name="BentoGrid">
              Conviction rising · ENTER signal
            </p>
            <div className="w-full space-y-3 mb-6" data-aura-component-name="BentoGrid">
              <div className="flex justify-between text-sm" data-aura-component-name="BentoGrid">
                <span className="text-gray-500 text-base" data-aura-component-name="BentoGrid">
                  Vol growth
                </span>
                <span className="font-medium text-gray-900 text-base" data-aura-component-name="BentoGrid">
                  4.2×
                </span>
              </div>
              <div className="flex justify-between text-sm border-t border-gray-100 pt-3" data-aura-component-name="BentoGrid">
                <span className="text-gray-500 text-base" data-aura-component-name="BentoGrid">
                  Wallets
                </span>
                <span className="font-medium text-gray-900 text-base" data-aura-component-name="BentoGrid">
                  82 unique
                </span>
              </div>
            </div>
            <button className="w-full py-3 bg-[#14593a] text-white rounded-xl font-medium text-base mt-auto hover:bg-[#1e7a52] transition-colors" data-aura-component-name="BentoGrid">
              Enter position
            </button>
          </div>
        </div>
        <div className="w-[420px] h-[400px] bg-white/95 backdrop-blur-xl rounded-t-xl shadow-2xl relative z-10 translate-y-8 group-hover:translate-y-2 transition-transform duration-700 delay-75 ease-out flex-shrink-0 border border-white/40 hidden md:flex flex-col" data-aura-component-name="BentoGrid">
          <div className="flex items-center px-4 py-2 border-b border-gray-100 bg-gray-50/50 rounded-t-xl" data-aura-component-name="BentoGrid">
            <div className="flex gap-1.5 mr-4" data-aura-component-name="BentoGrid">
              <div className="w-2.5 h-2.5 rounded-full bg-gray-300" data-aura-component-name="BentoGrid" />
              <div className="w-2.5 h-2.5 rounded-full bg-gray-300" data-aura-component-name="BentoGrid" />
              <div className="w-2.5 h-2.5 rounded-full bg-gray-300" data-aura-component-name="BentoGrid" />
            </div>
            <div className="flex-1 bg-white border border-gray-100 rounded flex items-center justify-center gap-1.5 py-1 text-xs text-gray-500" data-aura-component-name="BentoGrid">
              <iconify-icon icon="lucide:lock" className="text-xs" strokeWidth="1.5" data-aura-component-name="BentoGrid" />
              app.jaguar.xyz/scorecard/verde
            </div>
          </div>
          <div className="flex p-6 gap-6 flex-1" data-aura-component-name="BentoGrid">
            <div className="flex-1 flex flex-col" data-aura-component-name="BentoGrid">
              <h3 className="text-base font-medium tracking-tight text-gray-900 mb-4" data-aura-component-name="BentoGrid">
                VERDE · Scorecard
              </h3>
              <label className="block text-sm font-medium text-gray-700 mb-1" data-aura-component-name="BentoGrid">
                Conviction score
              </label>
              <div className="w-full border border-gray-200 rounded-md py-2 px-3 text-sm text-gray-400 mb-3" data-aura-component-name="BentoGrid">
                84 / 100 — rising
              </div>
              <div className="flex gap-2 mb-3" data-aura-component-name="BentoGrid">
                <button className="flex-1 bg-[#14593a] text-white py-2 rounded-md flex items-center justify-center gap-1 font-medium text-base hover:bg-[#1e7a52] transition-colors" data-aura-component-name="BentoGrid">
                  <iconify-icon icon="lucide:bell" strokeWidth="1.5" data-aura-component-name="BentoGrid" />
                  Alert
                </button>
                <button className="flex-1 bg-black text-white py-2 rounded-md flex items-center justify-center gap-1 font-medium text-base" data-aura-component-name="BentoGrid">
                  <iconify-icon icon="lucide:eye" strokeWidth="1.5" data-aura-component-name="BentoGrid" />
                  Watch
                </button>
              </div>
              <div className="flex items-center gap-2 mb-3" data-aura-component-name="BentoGrid">
                <div className="flex-1 border-t border-gray-200" data-aura-component-name="BentoGrid" />
                <span className="text-xs text-gray-400" data-aura-component-name="BentoGrid">
                  signals
                </span>
                <div className="flex-1 border-t border-gray-200" data-aura-component-name="BentoGrid" />
              </div>
              <label className="block text-sm font-medium text-gray-700 mb-1" data-aura-component-name="BentoGrid">
                Key signals
              </label>
              <div className="border border-[#cfe8d9] rounded-md overflow-hidden bg-white mb-2" data-aura-component-name="BentoGrid">
                <div className="p-2 border-b border-gray-200 flex items-center gap-2 bg-[#e8f3ec]/30" data-aura-component-name="BentoGrid">
                  <div className="w-3 h-3 rounded-full border-[3px] border-[#2ea86b] bg-white" data-aura-component-name="BentoGrid" />
                  <iconify-icon icon="lucide:trending-up" className="text-gray-400" strokeWidth="1.5" data-aura-component-name="BentoGrid" />
                  <span className="text-base font-medium" data-aura-component-name="BentoGrid">
                    Volume growth
                  </span>
                </div>
                <div className="p-2 border-b border-gray-200 text-gray-400 text-sm bg-gray-50/50" data-aura-component-name="BentoGrid">
                  4.2× in last 5 min
                </div>
                <div className="flex divide-x divide-gray-200 bg-gray-50/50" data-aura-component-name="BentoGrid">
                  <div className="p-2 flex-1 text-gray-400 text-sm" data-aura-component-name="BentoGrid">
                    Wallets: 82
                  </div>
                  <div className="p-2 flex-1 text-gray-400 text-sm flex items-center justify-between" data-aura-component-name="BentoGrid">
                    Dev sell: None
                    <iconify-icon icon="lucide:shield" strokeWidth="1.5" data-aura-component-name="BentoGrid" />
                  </div>
                </div>
              </div>
              <button className="w-full py-2.5 bg-[#14593a] text-white rounded-md font-medium text-base mt-auto hover:bg-[#1e7a52] transition-colors" data-aura-component-name="BentoGrid">
                Enter position
              </button>
            </div>
            <div className="w-[120px] pt-8" data-aura-component-name="BentoGrid">
              <h4 className="text-sm font-medium text-gray-500 mb-3" data-aura-component-name="BentoGrid">
                Summary
              </h4>
              <div className="flex gap-2 mb-4" data-aura-component-name="BentoGrid">
                <div className="w-8 h-8 rounded bg-[#e8f3ec] flex items-center justify-center text-[#14593a] font-medium text-lg flex-shrink-0" data-aura-component-name="BentoGrid">
                  V
                </div>
                <div>
                  <div className="text-xs text-gray-500 leading-tight mb-1" data-aura-component-name="BentoGrid">
                    VERDE · SOL/USDC
                  </div>
                  <div className="text-sm font-medium text-gray-900" data-aura-component-name="BentoGrid">
                    Score: 84
                  </div>
                </div>
              </div>
              <div className="space-y-1.5 border-t border-gray-100 pt-3 text-sm" data-aura-component-name="BentoGrid">
                <div className="flex justify-between text-gray-500" data-aura-component-name="BentoGrid">
                  <span>Vol/min</span>
                  <span>$14k</span>
                </div>
                <div className="flex justify-between text-gray-500" data-aura-component-name="BentoGrid">
                  <span>Age</span>
                  <span>4m 12s</span>
                </div>
                <div className="flex justify-between font-medium text-gray-900 pt-1.5 border-t border-gray-100" data-aura-component-name="BentoGrid">
                  <span>Signal</span>
                  <span className="text-[#14593a]">ENTER</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
