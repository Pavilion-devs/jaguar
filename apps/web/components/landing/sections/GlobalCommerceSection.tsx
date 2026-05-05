import React from "react";

export default function GlobalCommerceSection() {
  return (
    <section className="bg-white text-slate-900 font-sans antialiased overflow-x-hidden selection:bg-blue-100 selection:text-blue-900" data-aura-component-name="GlobalCommerceSection">
      <main className="relative max-w-6xl mx-auto border-x border-slate-200 min-h-screen flex flex-col pt-32" data-aura-component-name="GlobalCommerceSection">
        <div className="absolute top-0 -left-[3px] w-1.5 h-1.5 bg-slate-200" data-aura-component-name="GlobalCommerceSection" />
        <div className="absolute top-0 -right-[3px] w-1.5 h-1.5 bg-slate-200" data-aura-component-name="GlobalCommerceSection" />
        <div className="absolute bottom-0 -left-[3px] w-1.5 h-1.5 bg-slate-200 z-20" data-aura-component-name="GlobalCommerceSection" />
        <div className="absolute bottom-0 -right-[3px] w-1.5 h-1.5 bg-slate-200 z-20" data-aura-component-name="GlobalCommerceSection" />
        <section className="px-6 md:px-12 pb-24 text-center z-10 relative" data-aura-component-name="GlobalCommerceSection">
          <h1 className="text-4xl md:text-6xl font-medium tracking-tight text-slate-900 leading-[1.1] mx-auto max-w-3xl" data-aura-component-name="AnimatedHeading" style={{color: 'rgb(10, 37, 64)'}}>
            <span className="inline-block overflow-hidden align-top mr-[0.25em] pb-[0.1em]" data-aura-component-name="AnimatedHeading">
              <span className="inline-block transition-transform duration-[1000ms] ease-[cubic-bezier(0.16,1,0.3,1)] translate-y-[110%]" data-aura-component-name="AnimatedHeading" style={{transitionDelay: '0ms'}}>
                The
              </span>
            </span>
            <span className="inline-block overflow-hidden align-top mr-[0.25em] pb-[0.1em]" data-aura-component-name="AnimatedHeading">
              <span className="inline-block transition-transform duration-[1000ms] ease-[cubic-bezier(0.16,1,0.3,1)] translate-y-[110%]" data-aura-component-name="AnimatedHeading" style={{transitionDelay: '50ms'}}>
                backbone
              </span>
            </span>
            <br /><br />
            <span className="inline-block overflow-hidden align-top mr-[0.25em] pb-[0.1em]" data-aura-component-name="AnimatedHeading">
              <span className="inline-block transition-transform duration-[1000ms] ease-[cubic-bezier(0.16,1,0.3,1)] translate-y-[110%]" data-aura-component-name="AnimatedHeading" style={{transitionDelay: '100ms'}}>
                of
              </span>
            </span>
            <span className="inline-block overflow-hidden align-top mr-[0.25em] pb-[0.1em]" data-aura-component-name="AnimatedHeading">
              <span className="inline-block transition-transform duration-[1000ms] ease-[cubic-bezier(0.16,1,0.3,1)] translate-y-[110%]" data-aura-component-name="AnimatedHeading" style={{transitionDelay: '150ms'}}>
                global
              </span>
            </span>
            <span className="inline-block overflow-hidden align-top mr-[0.25em] pb-[0.1em]" data-aura-component-name="AnimatedHeading">
              <span className="inline-block transition-transform duration-[1000ms] ease-[cubic-bezier(0.16,1,0.3,1)] translate-y-[110%]" data-aura-component-name="AnimatedHeading" style={{transitionDelay: '200ms'}}>
                commerce
              </span>
            </span>
          </h1>
        </section>
        <section className="relative z-10 bg-white" data-aura-component-name="GlobalCommerceSection">
          <div className="absolute top-0 left-0 w-full h-[1px] bg-slate-200" data-aura-component-name="GlobalCommerceSection" />
          <div className="grid grid-cols-1 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-slate-100 text-center relative" data-aura-component-name="GlobalCommerceSection">
            {[
              { value: "0+", label: "currencies and payment methods supported" },
              { prefix: "US$", value: "0.0tn", label: "in payments volume processed in 2025" },
              { value: "0.000%", label: "historical uptime for Stripe services" },
              { value: "0M+", label: "active subscriptions managed on Stripe Billing" },
            ].map((stat, i) => (
              <div key={i} className="py-12 px-6 flex flex-col items-center justify-center cursor-default transition-colors duration-300 hover:bg-slate-50/50" data-aura-component-name="GlobalCommerceSection">
                <div className="text-4xl md:text-5xl font-medium tracking-tight mb-2 flex items-baseline justify-center transition-colors duration-300 text-[#0a2540]" data-aura-component-name="GlobalCommerceSection">
                  {stat.prefix && <span className="text-3xl md:text-4xl mr-0.5 font-normal text-slate-500">{stat.prefix}</span>}
                  <span data-aura-component-name="Counter">{stat.value}</span>
                </div>
                <p className="text-sm text-slate-500 font-normal leading-relaxed max-w-[180px]" data-aura-component-name="GlobalCommerceSection">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
          <div className="w-full h-[1px] bg-slate-200" data-aura-component-name="GlobalCommerceSection" />
        </section>
        <section className="relative flex-grow flex flex-col overflow-hidden min-h-[600px]" data-aura-component-name="GlobalCommerceSection" style={{background: 'radial-gradient(100% 100% at 50% 100%, rgba(253, 230, 138, 0.4) 0%, rgba(191, 219, 254, 0.4) 50%, rgba(255, 255, 255, 0) 100%)'}}>
          <div className="absolute inset-0 z-10 w-full h-full flex items-end justify-center pointer-events-auto cursor-crosshair" data-aura-component-name="GlobalCommerceSection">
            <canvas className="w-full h-full block" data-aura-component-name="GlobalCommerceSection" width={1150} height={600} />
          </div>
          <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-white to-transparent z-10 pointer-events-none" data-aura-component-name="GlobalCommerceSection" />
        </section>
      </main>
    </section>
  );
}
