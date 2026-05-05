import React from "react";
import UnifiedCheckoutCard from "./bento/UnifiedCheckoutCard";
import UsageBillingCard from "./bento/UsageBillingCard";
import AgenticCommerceCard from "./bento/AgenticCommerceCard";
import IssuingCard from "./bento/IssuingCard";
import CryptoCard from "./bento/CryptoCard";
import EmbeddedPaymentsCard from "./bento/EmbeddedPaymentsCard";

export default function BentoGridSection() {
  return (
    <section className="font-sans bg-white pt-24 px-24 pb-24" data-aura-component-name="BentoGrid">
      <div className="max-w-[1200px] mx-auto" data-aura-component-name="BentoGrid">
        <div className="mb-12" data-aura-component-name="BentoGrid">
          <h2 className="text-[#0a2540] text-3xl font-medium tracking-tight mb-4" data-aura-component-name="BentoGrid">
            Modular solutions
          </h2>
          <p className="text-lg text-[#424770] max-w-2xl" data-aura-component-name="BentoGrid">
            Mix and match our products to create exactly the payment infrastructure you need.
          </p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" data-aura-component-name="BentoGrid">
            <UnifiedCheckoutCard />
            <UsageBillingCard />
            <AgenticCommerceCard />
            <IssuingCard />
            <CryptoCard />
            <EmbeddedPaymentsCard />
        </div>
      </div>
    </section>
  );
}
