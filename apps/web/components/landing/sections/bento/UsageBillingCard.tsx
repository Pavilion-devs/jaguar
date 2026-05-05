import React from "react";

export default function UsageBillingCard() {
  return (
    <div className="lg:col-span-1 relative rounded-3xl overflow-hidden border border-gray-200/60 shadow-sm group min-h-[500px] cursor-pointer" data-aura-component-name="BentoGrid">
      <div className="absolute inset-0 bg-gradient-to-br from-[#e8f3ec] to-[#cfe8d9] opacity-60" data-aura-component-name="BentoGrid" />
      <div className="absolute inset-0 p-8 flex flex-col gap-4 items-center justify-center" data-aura-component-name="BentoGrid">
        <div className="w-full bg-white rounded-2xl shadow-sm border border-white/50 p-6 relative z-10 transform -translate-y-2 group-hover:-translate-y-4 transition-transform duration-500 ease-out" data-aura-component-name="BentoGrid">
          <div className="flex items-start gap-4 mb-6" data-aura-component-name="BentoGrid">
            <div className="w-10 h-10 rounded-full bg-[#e8f3ec] flex items-center justify-center text-[#14593a]" data-aura-component-name="BentoGrid">
              <iconify-icon icon="lucide:hexagon" className="text-xl" strokeWidth="1.5" data-aura-component-name="BentoGrid" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900 text-base" data-aura-component-name="BentoGrid">
                Pro Plan
              </h3>
              <p className="text-base text-gray-500" data-aura-component-name="BentoGrid">
                Billed monthly
              </p>
            </div>
          </div>
          <div className="mb-4" data-aura-component-name="BentoGrid">
            <h4 className="text-base font-medium text-gray-900 mb-0.5" data-aura-component-name="BentoGrid">
              Pairs scanned
            </h4>
            <p className="text-base text-gray-500" data-aura-component-name="BentoGrid">
              Unlimited · scored every 60s
            </p>
          </div>
          <div>
            <div className="flex items-center gap-1.5 text-sm font-medium text-gray-900 mb-2" data-aura-component-name="BentoGrid">
              <iconify-icon icon="lucide:gauge" strokeWidth="1.5" data-aura-component-name="BentoGrid" />
              Conviction meter
            </div>
            <div className="h-2.5 w-full bg-gray-100 rounded-full overflow-hidden" data-aura-component-name="BentoGrid">
              <div className="h-full w-[80%] bg-gradient-to-r from-[#2ea86b] via-[#1e7a52] to-[#14593a]" data-aura-component-name="BentoGrid" />
            </div>
          </div>
        </div>
        <div className="w-full bg-white rounded-2xl shadow-sm border border-white/50 p-6 relative z-10 transform translate-y-2 group-hover:translate-y-0 transition-transform duration-500 ease-out" data-aura-component-name="BentoGrid">
          <h4 className="text-sm font-medium text-gray-500 mb-1" data-aura-component-name="BentoGrid">
            Pairs scanned in the last 30 days
          </h4>
          <p className="text-2xl font-medium text-gray-900 tracking-tight mb-6" data-aura-component-name="BentoGrid">
            2,010,569
          </p>
          <div className="flex items-end gap-1 h-24 mt-auto" data-aura-component-name="BentoGrid">
            <div className="flex-1 rounded-t-[2px] bg-[#cfe8d9]" data-aura-component-name="BentoGrid" style={{height: '30%'}} />
            <div className="flex-1 rounded-t-[2px] bg-[#cfe8d9]" data-aura-component-name="BentoGrid" style={{height: '45%'}} />
            <div className="flex-1 rounded-t-[2px] bg-[#cfe8d9]" data-aura-component-name="BentoGrid" style={{height: '20%'}} />
            <div className="flex-1 rounded-t-[2px] bg-[#cfe8d9]" data-aura-component-name="BentoGrid" style={{height: '60%'}} />
            <div className="flex-1 rounded-t-[2px] bg-[#cfe8d9]" data-aura-component-name="BentoGrid" style={{height: '35%'}} />
            <div className="flex-1 rounded-t-[2px] bg-[#2ea86b]" data-aura-component-name="BentoGrid" style={{height: '80%'}} />
            <div className="flex-1 rounded-t-[2px] bg-[#cfe8d9]" data-aura-component-name="BentoGrid" style={{height: '40%'}} />
            <div className="flex-1 rounded-t-[2px] bg-[#cfe8d9]" data-aura-component-name="BentoGrid" style={{height: '55%'}} />
            <div className="flex-1 rounded-t-[2px] bg-[#cfe8d9]" data-aura-component-name="BentoGrid" style={{height: '90%'}} />
            <div className="flex-1 rounded-t-[2px] bg-[#cfe8d9]" data-aura-component-name="BentoGrid" style={{height: '100%'}} />
            <div className="flex-1 rounded-t-[2px] bg-[#cfe8d9]" data-aura-component-name="BentoGrid" style={{height: '65%'}} />
            <div className="flex-1 rounded-t-[2px] bg-[#cfe8d9]" data-aura-component-name="BentoGrid" style={{height: '85%'}} />
            <div className="flex-1 rounded-t-[2px] bg-[#cfe8d9]" data-aura-component-name="BentoGrid" style={{height: '45%'}} />
          </div>
        </div>
      </div>
    </div>
  );
}
