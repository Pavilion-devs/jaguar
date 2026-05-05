import React from "react";

export default function EmbeddedPaymentsCard() {
  return (
    <div className="lg:col-span-3 overflow-hidden group min-h-[500px] md:min-h-[550px] cursor-pointer flex flex-col md:flex-row bg-white border border-gray-200/60 rounded-3xl relative shadow-sm" data-aura-component-name="BentoGrid">
      <div className="absolute inset-0 bg-gradient-to-br from-white via-white to-[#e8f3ec]/50 z-0 pointer-events-none" data-aura-component-name="BentoGrid" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[300px] bg-[#2ea86b]/20 blur-[80px] rounded-full z-0 pointer-events-none" data-aura-component-name="BentoGrid" />
      <div className="absolute top-[-10%] right-[-10%] w-[400px] h-[500px] bg-[#14593a]/20 blur-[80px] rounded-full z-0 pointer-events-none" data-aura-component-name="BentoGrid" />
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden rounded-3xl" data-aura-component-name="BentoGrid">
        <svg className="absolute inset-0 w-full h-full opacity-[0.18]" viewBox="0 0 1200 600" fill="none" preserveAspectRatio="none" data-aura-component-name="BentoGrid">
          <defs>
            <pattern id="embed-lines-green1" x={0} y={0} width={14} height={14} patternUnits="userSpaceOnUse" patternTransform="rotate(50)" data-aura-component-name="BentoGrid">
              <line x1={0} y1={0} x2={0} y2={14} stroke="#cfe8d9" strokeWidth={2} data-aura-component-name="BentoGrid" />
            </pattern>
            <pattern id="embed-lines-green2" x={0} y={0} width={14} height={14} patternUnits="userSpaceOnUse" patternTransform="rotate(50)" data-aura-component-name="BentoGrid">
              <line x1={0} y1={0} x2={0} y2={14} stroke="#1e7a52" strokeWidth={2} data-aura-component-name="BentoGrid" />
            </pattern>
            <linearGradient id="embed-fade-left-g" x1={0} y1={0} x2={1} y2={0} data-aura-component-name="BentoGrid">
              <stop offset="0%" stopColor="white" stopOpacity={0} data-aura-component-name="BentoGrid" />
              <stop offset="45%" stopColor="white" stopOpacity={1} data-aura-component-name="BentoGrid" />
              <stop offset="100%" stopColor="white" stopOpacity={1} data-aura-component-name="BentoGrid" />
            </linearGradient>
            <linearGradient id="embed-fade-right-g" x1={0} y1={0} x2={1} y2={0} data-aura-component-name="BentoGrid">
              <stop offset="0%" stopColor="white" stopOpacity={1} data-aura-component-name="BentoGrid" />
              <stop offset="55%" stopColor="white" stopOpacity={1} data-aura-component-name="BentoGrid" />
              <stop offset="100%" stopColor="white" stopOpacity={0} data-aura-component-name="BentoGrid" />
            </linearGradient>
          </defs>
          <rect x={0} y={0} width={420} height={600} fill="url(#embed-lines-green1)" data-aura-component-name="BentoGrid" />
          <rect x={780} y={0} width={420} height={600} fill="url(#embed-lines-green2)" data-aura-component-name="BentoGrid" />
          <rect x={0} y={0} width={420} height={600} fill="url(#embed-fade-left-g)" data-aura-component-name="BentoGrid" />
          <rect x={780} y={0} width={420} height={600} fill="url(#embed-fade-right-g)" data-aura-component-name="BentoGrid" />
        </svg>
      </div>
      <div className="relative z-10 w-full md:w-[28%] p-6 md:p-8 flex items-start" data-aura-component-name="BentoGrid">
        <div>
          <h3 className="text-[22px] md:text-[28px] font-medium tracking-tight text-gray-900 leading-[1.05] max-w-[240px]" data-aura-component-name="BentoGrid">
            Embed Jaguar
            <br /><br />
            in your workflow
          </h3>
        </div>
      </div>
      <div className="relative z-10 flex-1 min-h-[420px] md:min-h-[550px] p-4 md:p-5" data-aura-component-name="BentoGrid">
        <div className="absolute right-4 md:right-6 top-4 md:top-5 w-[78%] h-[78%] bg-white/90 backdrop-blur-xl rounded-2xl border border-gray-200 shadow-[0_20px_60px_rgba(0,0,0,0.08)] overflow-hidden" data-aura-component-name="BentoGrid">
          <div className="h-10 border-b border-gray-100 flex items-center px-4 bg-gray-50/70" data-aura-component-name="BentoGrid">
            <div className="flex gap-2 mr-4" data-aura-component-name="BentoGrid">
              <div className="w-2.5 h-2.5 rounded-full bg-gray-300" data-aura-component-name="BentoGrid" />
              <div className="w-2.5 h-2.5 rounded-full bg-gray-300" data-aura-component-name="BentoGrid" />
              <div className="w-2.5 h-2.5 rounded-full bg-gray-300" data-aura-component-name="BentoGrid" />
            </div>
            <div className="mx-auto text-xs text-gray-500 font-medium bg-white border border-gray-100 rounded-full px-4 py-1 min-w-[220px] text-center" data-aura-component-name="BentoGrid">
              <span className="inline-flex items-center gap-1.5" data-aura-component-name="BentoGrid">
                <iconify-icon icon="lucide:lock" width={12} data-aura-component-name="BentoGrid" />
                app.jaguar.xyz/dashboard
              </span>
            </div>
            <div className="w-10" data-aura-component-name="BentoGrid" />
          </div>
          <div className="grid grid-cols-[180px_1fr] h-[calc(100%-40px)]" data-aura-component-name="BentoGrid">
            <div className="border-r border-gray-100 bg-white/80 p-4" data-aura-component-name="BentoGrid">
              <div className="flex items-center gap-2 mb-6" data-aura-component-name="BentoGrid">
                <div className="w-8 h-8 rounded-full bg-[#e8f3ec] flex items-center justify-center text-[#14593a]" data-aura-component-name="BentoGrid">
                  <iconify-icon icon="solar:rocket-2-bold" width={16} data-aura-component-name="BentoGrid" />
                </div>
                <span className="font-medium text-gray-900" data-aura-component-name="BentoGrid">
                  Jaguar
                </span>
              </div>
              <div className="space-y-3 text-sm text-gray-500" data-aura-component-name="BentoGrid">
                <div className="h-3 w-24 bg-gray-100 rounded-full" data-aura-component-name="BentoGrid" />
                <div className="h-3 w-20 bg-gray-100 rounded-full" data-aura-component-name="BentoGrid" />
                <div className="h-3 w-16 bg-gray-100 rounded-full" data-aura-component-name="BentoGrid" />
              </div>
            </div>
            <div className="p-5" data-aura-component-name="BentoGrid">
              <h4 className="text-[16px] md:text-[18px] font-medium text-gray-900 mb-5" data-aura-component-name="BentoGrid">
                Live Pairs
              </h4>
              <div className="grid grid-cols-4 text-[11px] md:text-xs text-gray-500 font-medium border-b border-gray-100 pb-3 mb-2" data-aura-component-name="BentoGrid">
                <div>Pair</div>
                <div>Age</div>
                <div>Conviction</div>
                <div>Signal</div>
              </div>
              <div className="space-y-1.5 text-[11px] md:text-sm" data-aura-component-name="BentoGrid">
                {[
                  { name: "VERDE", age: "4m", score: "84", signal: "ENTER", dot: "bg-[#2ea86b]" },
                  { name: "OKRA", age: "12m", score: "71", signal: "WATCH", dot: "bg-[#1e7a52]" },
                  { name: "FLUX", age: "2m", score: "58", signal: "WATCH", dot: "bg-[#cfe8d9]" },
                  { name: "NOVA", age: "28m", score: "42", signal: "IGNORE", dot: "bg-gray-300" },
                  { name: "TIDE", age: "7m", score: "89", signal: "ENTER", dot: "bg-[#2ea86b]" },
                  { name: "MOSS", age: "15m", score: "33", signal: "IGNORE", dot: "bg-gray-300" },
                  { name: "PEAK", age: "3m", score: "77", signal: "WATCH", dot: "bg-[#1e7a52]" },
                  { name: "DUSK", age: "19m", score: "61", signal: "WATCH", dot: "bg-[#cfe8d9]" },
                ].map((row) => (
                  <div key={row.name} className="grid grid-cols-4 items-center py-2.5 border-b border-gray-100/80 text-gray-700" data-aura-component-name="BentoGrid">
                    <div className="flex items-center gap-2 font-medium text-gray-800 min-w-0" data-aura-component-name="BentoGrid">
                      <div className={`w-4 h-4 rounded-full shrink-0 ${row.dot}`} data-aura-component-name="BentoGrid" />
                      <span className="truncate" data-aura-component-name="BentoGrid">{row.name}</span>
                    </div>
                    <div className="text-gray-500" data-aura-component-name="BentoGrid">{row.age}</div>
                    <div className="text-gray-500 font-mono" data-aura-component-name="BentoGrid">{row.score}</div>
                    <div className="text-gray-500" data-aura-component-name="BentoGrid">{row.signal}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="absolute left-[6%] top-[18%] w-[290px] md:w-[320px] bg-white rounded-2xl border border-gray-200 shadow-[0_18px_50px_rgba(0,0,0,0.08)] overflow-hidden" data-aura-component-name="BentoGrid">
          <div className="p-5 border-b border-gray-100" data-aura-component-name="BentoGrid">
            <div className="flex items-center gap-3 mb-6" data-aura-component-name="BentoGrid">
              <div className="w-8 h-8 rounded-full bg-[#e8f3ec] flex items-center justify-center text-[#14593a]" data-aura-component-name="BentoGrid">
                <iconify-icon icon="lucide:bell" width={16} data-aura-component-name="BentoGrid" />
              </div>
              <div className="font-medium text-gray-900" data-aura-component-name="BentoGrid">
                ENTER · VERDE
              </div>
            </div>
            <p className="text-sm text-gray-700 leading-relaxed" data-aura-component-name="BentoGrid">
              Conviction crossed 80.<br /><br />Suggested size: 0.42 SOL
            </p>
          </div>
          <div className="p-5 space-y-4 text-sm" data-aura-component-name="BentoGrid">
            {[
              { label: "Score", value: "84 / 100" },
              { label: "Vol growth", value: "4.2×" },
              { label: "Age", value: "4m 12s" },
              { label: "Wallets", value: "82 unique" },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between border-b border-gray-100 pb-3 last:border-b-0 last:pb-0" data-aura-component-name="BentoGrid">
                <span className="text-gray-500" data-aura-component-name="BentoGrid">{item.label}</span>
                <span className="font-medium text-gray-800" data-aura-component-name="BentoGrid">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
