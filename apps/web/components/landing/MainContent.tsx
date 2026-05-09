import React from "react";
import HeroSection from "./sections/HeroSection";
import LogoStrip from "./sections/LogoStrip";
import HowItWorksSection from "./sections/HowItWorksSection";
import IncentiveTemplatesSection from "./sections/IncentiveTemplatesSection";

export default function MainContent() {
  return (
    <main className="flex-grow" data-aura-component-name="App">
      <HeroSection />
      <LogoStrip />
      <HowItWorksSection />
      <IncentiveTemplatesSection />
    </main>
  );
}
