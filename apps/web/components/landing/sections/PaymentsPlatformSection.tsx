import React from "react";

const progressBars = [
  { className: "bg-indigo-600 w-[70%]" },
  { className: "bg-pink-500 w-[45%]" },
];

function BalanceCard() {
  return (
    <div
      className="flex cursor-pointer flex-col gap-4 rounded-xl border border-gray-100 bg-white p-6 shadow-[0_15px_35px_rgba(0,0,0,0.05)] transition-all duration-500 hover:border-indigo-200"
      data-aura-component-name="App"
    >
      <div className="flex items-center justify-between border-b border-gray-100 pb-4" data-aura-component-name="App">
        <span className="font-medium text-[#0a2540]" data-aura-component-name="App">
          Payment balance
        </span>
        <span className="animate-pulse font-mono text-xl text-green-600" data-aura-component-name="App">
          $142,394.20
        </span>
      </div>
      <div className="flex flex-col gap-2 pt-2" data-aura-component-name="App">
        {progressBars.map((bar) => (
          <div key={bar.className} className="h-2 w-full overflow-hidden rounded-full bg-gray-100" data-aura-component-name="App">
            <div className={`h-full transition-all duration-1000 ${bar.className}`} data-aura-component-name="App" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function PaymentsPlatformSection() {
  return (
    <section
      className="mx-auto max-w-[1200px] px-24 py-24 opacity-0 animate-fade-in-up"
      data-aura-component-name="App"
      style={{ animationDelay: "0.4s" }}
    >
      <div className="flex flex-col items-start gap-12 md:flex-row" data-aura-component-name="App">
        <div className="md:w-1/2" data-aura-component-name="App">
          <h2 className="mb-6 text-3xl font-medium tracking-tight text-[#0a2540] md:text-4xl" data-aura-component-name="App">
            A complete payments platform, engineered for growth.
          </h2>
          <p className="mb-6 text-lg leading-relaxed text-[#424770]" data-aura-component-name="App">
            Whether you&apos;re looking to bill customers on a recurring basis, set up a marketplace, or simply accept payments, do it all with a fully integrated, global platform that can support online and in-person payments.
          </p>
        </div>
        <div className="w-full md:w-1/2" data-aura-component-name="App">
          <BalanceCard />
        </div>
      </div>
    </section>
  );
}
