import React from "react";

export default function DarkMetricsSection() {
  return (
    <section className="min-h-screen flex flex-col overflow-hidden select-none font-sans bg-[#050B14] border-t border-white/5 pt-24 pb-24 relative" data-aura-component-name="DarkMetricsSection">
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none" data-aura-component-name="DarkMetricsSection" style={{backgroundImage: 'radial-gradient(rgb(255, 255, 255) 1px, transparent 1px)', backgroundSize: '32px 32px'}} />
      <div className="absolute top-[15%] right-[18%] w-[420px] h-[420px] bg-[#14593a]/20 blur-[140px] rounded-full mix-blend-screen pointer-events-none z-0" data-aura-component-name="DarkMetricsSection" />
      <div className="absolute bottom-[10%] left-[12%] w-[520px] h-[260px] bg-[#2ea86b]/10 blur-[120px] rounded-full mix-blend-screen pointer-events-none z-0" data-aura-component-name="DarkMetricsSection" />
      <div className="absolute bottom-0 right-[8%] w-[900px] h-[420px] bg-[#1e7a52]/20 blur-[150px] rounded-full mix-blend-screen pointer-events-none z-0" data-aura-component-name="DarkMetricsSection" />
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fade-in-up-stagger { 0% { opacity: 0; transform: translateY(40px); } 100% { opacity: 1; transform: translateY(0); } }
        .animate-in-1 { animation: fade-in-up-stagger 1.1s cubic-bezier(0.16, 1, 0.3, 1) 0.05s forwards; opacity: 0; }
        .animate-in-2 { animation: fade-in-up-stagger 1.1s cubic-bezier(0.16, 1, 0.3, 1) 0.18s forwards; opacity: 0; }
        .animate-in-3 { animation: fade-in-up-stagger 1.1s cubic-bezier(0.16, 1, 0.3, 1) 0.3s forwards; opacity: 0; }
        .animate-in-4 { animation: fade-in-up-stagger 1.1s cubic-bezier(0.16, 1, 0.3, 1) 0.42s forwards; opacity: 0; }
        @keyframes gradient-shift { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
        .animate-text-gradient { background-size: 200% auto; animation: gradient-shift 5s ease infinite; }
        @keyframes pulse-dash { to { stroke-dashoffset: -20; } }
        .pulse-line { animation: pulse-dash 1.4s linear infinite; }
        @keyframes wave-breathe-1 { 0%, 100% { transform: translateY(0) scaleY(1); } 50% { transform: translateY(-10px) scaleY(1.02); } }
        @keyframes wave-breathe-2 { 0%, 100% { transform: translateY(0) scaleY(1); } 50% { transform: translateY(15px) scaleY(0.98); } }
        @keyframes wave-breathe-3 { 0%, 100% { transform: translateX(0) rotate(0deg); } 50% { transform: translateX(-20px) rotate(0.5deg); } }
        .wave-group-1 { animation: wave-breathe-1 8s ease-in-out infinite; }
        .wave-group-2 { animation: wave-breathe-2 12s ease-in-out infinite; }
        .wave-group-3 { animation: wave-breathe-3 15s ease-in-out infinite; }
        .wave-line { fill: none; stroke-linecap: round; vector-effect: non-scaling-stroke; }
      `}} />
      <div className="relative z-10 mx-auto w-full max-w-[1100px] border-l border-r border-[#1e7a52]/30 bg-[#0B0F19]/50 backdrop-blur-sm" data-aura-component-name="DarkMetricsSection">
        <div className="absolute -left-[3.5px] top-0 w-[6px] h-[6px] bg-[#0B0F19] border border-[#1e7a52]/50" data-aura-component-name="DarkMetricsSection" />
        <div className="absolute -right-[3.5px] top-0 w-[6px] h-[6px] bg-[#0B0F19] border border-[#1e7a52]/50" data-aura-component-name="DarkMetricsSection" />
        <div className="absolute -left-[3.5px] bottom-0 w-[6px] h-[6px] bg-[#0B0F19] border border-[#1e7a52]/50" data-aura-component-name="DarkMetricsSection" />
        <div className="absolute -right-[3.5px] bottom-0 w-[6px] h-[6px] bg-[#0B0F19] border border-[#1e7a52]/50" data-aura-component-name="DarkMetricsSection" />
        <section className="px-6 md:px-16 relative" data-aura-component-name="DarkMetricsSection">
          <div className="absolute top-0 left-0 w-full h-px bg-[#1e7a52]/30" data-aura-component-name="DarkMetricsSection" />
          <div className="max-w-2xl mb-12 pt-12 text-lg md:text-xl font-normal leading-relaxed tracking-tight animate-in-1" data-aura-component-name="DarkMetricsSection">
            <span className="text-slate-100 font-medium" data-aura-component-name="DarkMetricsSection">
              Connect to the full Solana data stack.
            </span>
            <span className="text-slate-400" data-aura-component-name="DarkMetricsSection">
              {" "}Jaguar ingests on-chain events, DEX liquidity, and wallet signals — then routes everything through a scoring model that runs every 60 seconds.
            </span>
          </div>
          <div className="relative w-full aspect-[4/3] md:aspect-[21/9] bg-[#0A0D17] border border-[#1e7a52]/40 rounded-[20px] overflow-hidden flex items-center justify-center shadow-2xl shadow-black/50" data-aura-component-name="DarkMetricsSection">
            <div className="absolute inset-0 pointer-events-none opacity-25" data-aura-component-name="DarkMetricsSection" style={{backgroundImage: 'radial-gradient(rgb(46, 168, 107) 0.8px, transparent 0.8px)', backgroundSize: '12px 12px'}} />
            <div className="relative w-[800px] h-[400px] scale-[0.4] sm:scale-75 md:scale-100 origin-center" data-aura-component-name="DarkMetricsSection">
              <svg className="absolute inset-0 w-full h-full pointer-events-none z-0" data-aura-component-name="DarkMetricsSection">
                <g stroke="#1e7a52" strokeWidth="1.5" strokeDasharray="4 4" fill="none" data-aura-component-name="DarkMetricsSection" style={{opacity: '0.6'}}>
                  <path d="M 330,80 L 530,80" className="pulse-line" /><path d="M 400,160 L 400,80" className="pulse-line" />
                  <path d="M 330,80 L 330,100" className="pulse-line" /><path d="M 380,80 L 380,100" className="pulse-line" />
                  <path d="M 460,80 L 460,100" className="pulse-line" /><path d="M 530,80 L 530,100" className="pulse-line" />
                  <path d="M 400,200 L 400,140 L 350,140" className="pulse-line" /><path d="M 400,200 L 400,140 L 500,140" className="pulse-line" />
                  <path d="M 360,200 L 280,200" className="pulse-line" /><path d="M 440,200 L 610,200" className="pulse-line" />
                  <path d="M 400,240 L 400,280" className="pulse-line" /><path d="M 400,280 L 380,280 L 380,310" className="pulse-line" />
                  <path d="M 400,280 L 420,280 L 420,310" className="pulse-line" />
                </g>
              </svg>
              {[{l:330,t:60,label:'Birdeye'},{l:430,t:60,label:'On-chain events'},{l:500,t:60,label:'DEX liquidity'},{l:580,t:60,label:'Wallet signals'}].map(n=>(
                <div key={n.label} className="absolute -translate-x-1/2 -translate-y-1/2 z-10" style={{left:n.l,top:n.t}}>
                  <div className="bg-[#0d3d27] text-white text-[11px] px-3 py-1.5 rounded border border-[#2ea86b]/50 shadow-[0_0_10px_rgba(46,168,107,0.25)] whitespace-nowrap">{n.label}</div>
                </div>
              ))}
              {[{l:350,t:140,label:'Ingestor'},{l:500,t:140,label:'Event Router'},{l:520,t:200,label:'Signal Store'},{l:400,t:260,label:'Score Engine'}].map(n=>(
                <div key={n.label} className="absolute -translate-x-1/2 -translate-y-1/2 z-10" style={{left:n.l,top:n.t}}>
                  <div className="bg-[#1e7a52] text-white text-[11px] px-3 py-1.5 rounded border border-[#2ea86b]/60 shadow-[0_0_15px_rgba(46,168,107,0.35)]">{n.label}</div>
                </div>
              ))}
              <div className="absolute -translate-x-1/2 -translate-y-1/2 z-20" style={{left:400,top:200}}>
                <div className="bg-[#031108] text-white font-semibold text-[15px] tracking-tight w-[72px] h-[72px] rounded-xl flex items-center justify-center border border-[#2ea86b] shadow-[0_0_35px_rgba(46,168,107,0.35)] relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-[#2ea86b]/20 to-transparent" />jaguar
                </div>
              </div>
            </div>
          </div>
        </section>
        <section className="px-6 md:px-16 relative pb-12" data-aura-component-name="DarkMetricsSection">
          <div className="absolute top-0 left-0 w-full h-px bg-[#1e7a52]/30" />
          <div className="max-w-2xl mb-12 pt-12 text-lg md:text-xl font-normal leading-relaxed tracking-tight animate-in-2">
            <span className="text-slate-100 font-medium">Scale with real data.</span>
            <span className="text-slate-400">{" "}Thousands of pairs scored every minute. Conviction calculated from first block to migration — no gaps, no delays.</span>
          </div>
          <div className="relative w-full h-[450px] md:h-[400px] rounded-[20px] overflow-hidden border border-[#1e7a52]/40 bg-[#0A0D17] shadow-2xl shadow-black/50">
            <div className="absolute inset-0 bg-gradient-to-t from-[#0A0D17] via-[#0A0D17]/60 to-transparent pointer-events-none z-10" />
            <div className="absolute inset-0 w-full h-full opacity-90 mix-blend-screen scale-110">
              <svg viewBox="0 0 1440 600" className="w-full h-full object-cover min-w-[1440px]" preserveAspectRatio="xMidYMax slice">
                <defs>
                  <linearGradient id="dm-wave-g1" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#2ea86b" stopOpacity={0} />
                    <stop offset="20%" stopColor="#2ea86b" stopOpacity="0.8" />
                    <stop offset="50%" stopColor="#4ade80" stopOpacity={1} />
                    <stop offset="80%" stopColor="#1e7a52" stopOpacity="0.85" />
                    <stop offset="100%" stopColor="#14593a" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="dm-wave-g2" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#4ade80" stopOpacity={0} />
                    <stop offset="30%" stopColor="#2ea86b" stopOpacity="0.6" />
                    <stop offset="70%" stopColor="#1e7a52" stopOpacity="0.9" />
                    <stop offset="100%" stopColor="#14593a" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <g className="wave-group-1 opacity-40">
                  <path className="wave-line" stroke="url(#dm-wave-g2)" strokeWidth={2} d="M -100,500 C 300,500 500,250 900,300 C 1300,350 1500,450 1600,450" />
                  <path className="wave-line" stroke="url(#dm-wave-g2)" strokeWidth="1.5" d="M -100,520 C 320,520 520,270 920,320 C 1320,370 1520,470 1600,470" />
                </g>
                <g className="wave-group-2 opacity-60">
                  <path className="wave-line" stroke="url(#dm-wave-g1)" strokeWidth={1} d="M -100,450 C 250,450 600,350 1000,400 C 1400,450 1500,550 1600,550" />
                  <path className="wave-line" stroke="url(#dm-wave-g1)" strokeWidth="1.5" d="M -100,470 C 270,470 620,370 1020,420 C 1420,470 1520,570 1600,570" />
                </g>
                <g className="wave-group-3 opacity-90">
                  <path className="wave-line" stroke="url(#dm-wave-g1)" strokeWidth={2} d="M -100,580 C 400,580 500,200 950,250 C 1400,300 1500,500 1600,500" />
                  <path className="wave-line" stroke="url(#dm-wave-g1)" strokeWidth={3} d="M -100,600 C 420,600 520,220 970,270 C 1420,320 1520,520 1600,520" />
                </g>
              </svg>
            </div>
            <div className="absolute bottom-0 left-0 w-full p-8 md:p-12 flex flex-col md:flex-row justify-between items-start md:items-end gap-10 z-20">
              {[
                { value: "500K+", gradient: "from-[#4ade80] via-[#2ea86b] to-[#1e7a52]", label: "pairs scanned per day" },
                { value: "60s", gradient: "from-[#2ea86b] to-[#1e7a52]", label: "conviction refresh interval" },
                { value: "99.9%", gradient: "from-[#1e7a52] to-[#14593a]", label: "scoring uptime" },
              ].map((stat, i) => (
                <div key={i} className={`animate-in-${i + 2}`}>
                  <div className={`text-5xl font-medium tracking-tight bg-clip-text text-transparent bg-gradient-to-r ${stat.gradient} mb-2 drop-shadow-sm animate-text-gradient`}>{stat.value}</div>
                  <div className="text-xs md:text-sm text-slate-400 font-medium tracking-wide">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </section>
  );
}
